#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""WYLQ-Audit static CSP verifier and heuristic DOM XSS sink inventory.

Usage:
  python3 wylq_csp_audit.py yq13.html
  python3 wylq_csp_audit.py yq13.html --fix

--fix updates only the three hash-bearing directives in a single CSP meta tag.
It creates <file>.bak first and preserves the source file's line endings.
This is a static checker, not a complete HTML/JavaScript security proof.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import os
import re
import shutil
import sys
import tempfile
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

HASH_SOURCE_RE = re.compile(r"^'(?:sha256|sha384|sha512)-[A-Za-z0-9+/=_-]+'$", re.I)
HASH_TOKEN_RE = re.compile(r"^'(?:sha256|sha384|sha512)-[A-Za-z0-9+/=_-]+'$", re.I)

REQUIRED_NONE_DIRECTIVES = (
    "default-src",
    "script-src-attr",
    "style-src-attr",
    "connect-src",
    "img-src",
    "font-src",
    "object-src",
    "media-src",
    "worker-src",
    "manifest-src",
    "base-uri",
    "form-action",
)
HASH_DIRECTIVES = ("script-src", "style-src", "style-src-elem")

@dataclass
class TagRecord:
    tag: str
    attrs: dict[str, str | None]
    raw: str
    start: int

@dataclass
class HtmlScan:
    scripts: list[str] = field(default_factory=list)
    styles: list[str] = field(default_factory=list)
    script_tags: list[TagRecord] = field(default_factory=list)
    style_tags: list[TagRecord] = field(default_factory=list)
    csp_metas: list[TagRecord] = field(default_factory=list)
    inline_style_attrs: list[tuple[int, str]] = field(default_factory=list)
    inline_handlers: list[tuple[int, str]] = field(default_factory=list)
    external_refs: list[tuple[int, str]] = field(default_factory=list)
    duplicate_ids: list[tuple[int, str]] = field(default_factory=list)

class WylqHTMLParser(HTMLParser):
    def __init__(self, source: str):
        super().__init__(convert_charrefs=False)
        self.source = source
        self.line_offsets = [0]
        for match in re.finditer("\n", source):
            self.line_offsets.append(match.end())
        self.scan = HtmlScan()
        self._raw_kind: str | None = None
        self._raw_parts: list[str] = []
        self._raw_index: int | None = None
        self._seen_ids: set[str] = set()

    def _absolute_pos(self) -> int:
        line, col = self.getpos()
        return self.line_offsets[line - 1] + col

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {name.lower(): value for name, value in attrs}
        raw = self.get_starttag_text() or ""
        start = self._absolute_pos()
        record = TagRecord(tag.lower(), attr_map, raw, start)

        if tag.lower() == "script":
            self.scan.script_tags.append(record)
            self._raw_kind = "script"
            self._raw_parts = []
            self._raw_index = len(self.scan.scripts)
        elif tag.lower() == "style":
            self.scan.style_tags.append(record)
            self._raw_kind = "style"
            self._raw_parts = []
            self._raw_index = len(self.scan.styles)

        if tag.lower() == "meta" and (attr_map.get("http-equiv") or "").lower() == "content-security-policy":
            self.scan.csp_metas.append(record)

        line = self.getpos()[0]
        for name in attr_map:
            if name == "style":
                self.scan.inline_style_attrs.append((line, raw[:180]))
            if name.startswith("on") and len(name) > 2:
                self.scan.inline_handlers.append((line, f"{name} on <{tag}>"))

        element_id = attr_map.get("id")
        if element_id:
            if element_id in self._seen_ids:
                self.scan.duplicate_ids.append((line, str(element_id)))
            self._seen_ids.add(str(element_id))

        # The current WYLQ single-file profile permits no external subresources.
        resource_attrs: list[str] = []
        t = tag.lower()
        if t == "script": resource_attrs = ["src"]
        elif t == "link": resource_attrs = ["href"]
        elif t in {"img", "iframe", "audio", "video", "source", "track", "embed"}: resource_attrs = ["src"]
        elif t == "object": resource_attrs = ["data"]
        for attr in resource_attrs:
            value = attr_map.get(attr)
            if value:
                self.scan.external_refs.append((line, f"<{t} {attr}=\"{value}\">"))
        if t == "iframe" and attr_map.get("srcdoc") is not None:
            self.scan.external_refs.append((line, "<iframe srcdoc=...>"))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        # HTMLParser dispatches void elements such as <meta ... /> here.
        # Process the same security-relevant attributes as handle_starttag.
        attr_map = {name.lower(): value for name, value in attrs}
        raw = self.get_starttag_text() or ""
        line = self.getpos()[0]
        if tag.lower() == "meta" and (attr_map.get("http-equiv") or "").lower() == "content-security-policy":
            self.scan.csp_metas.append(TagRecord(tag.lower(), attr_map, raw, self._absolute_pos()))
        for name in attr_map:
            if name == "style": self.scan.inline_style_attrs.append((line, raw[:180]))
            if name.startswith("on") and len(name) > 2: self.scan.inline_handlers.append((line, f"{name} on <{tag}>"))
        element_id = attr_map.get("id")
        if element_id:
            if element_id in self._seen_ids:
                self.scan.duplicate_ids.append((line, str(element_id)))
            self._seen_ids.add(str(element_id))
        t = tag.lower()
        resource_attrs: list[str] = []
        if t == "script": resource_attrs = ["src"]
        elif t == "link": resource_attrs = ["href"]
        elif t in {"img", "iframe", "audio", "video", "source", "track", "embed"}: resource_attrs = ["src"]
        elif t == "object": resource_attrs = ["data"]
        for attr in resource_attrs:
            value = attr_map.get(attr)
            if value:
                self.scan.external_refs.append((line, f"<{t} {attr}=\"{value}\">"))
        if t == "iframe" and attr_map.get("srcdoc") is not None:
            self.scan.external_refs.append((line, "<iframe srcdoc=...>"))

    def handle_data(self, data: str) -> None:
        if self._raw_kind:
            self._raw_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        t = tag.lower()
        if self._raw_kind == t:
            value = "".join(self._raw_parts)
            if t == "script": self.scan.scripts.append(value)
            elif t == "style": self.scan.styles.append(value)
            self._raw_kind = None
            self._raw_parts = []
            self._raw_index = None


def normalize_html_newlines(text: str) -> str:
    """Match HTML input-stream preprocessing: CRLF and lone CR become LF."""
    return text.replace("\r\n", "\n").replace("\r", "\n")


def csp_sha256(text: str) -> str:
    normalized = normalize_html_newlines(text)
    digest = hashlib.sha256(normalized.encode("utf-8")).digest()
    return "'sha256-" + base64.b64encode(digest).decode("ascii") + "'"


def parse_csp(content: str) -> list[tuple[str, list[str]]]:
    directives: list[tuple[str, list[str]]] = []
    for segment in content.split(";"):
        tokens = segment.strip().split()
        if tokens:
            directives.append((tokens[0].lower(), tokens[1:]))
    return directives


def directive_map(directives: list[tuple[str, list[str]]]) -> dict[str, list[list[str]]]:
    result: dict[str, list[list[str]]] = {}
    for name, values in directives:
        result.setdefault(name, []).append(values)
    return result


def get_raw_attribute_span(tag_text: str, attribute: str) -> re.Match[str] | None:
    # The back-reference is essential: a double-quoted value may contain CSP single quotes.
    pattern = re.compile(
        rf"(?P<prefix>\b{re.escape(attribute)}\s*=\s*)(?P<quote>[\"'])(?P<value>.*?)(?P=quote)",
        re.I | re.S,
    )
    return pattern.search(tag_text)


def replace_meta_content(html: str, meta: TagRecord, new_content: str) -> str:
    attr_match = get_raw_attribute_span(meta.raw, "content")
    if not attr_match:
        raise ValueError("CSP meta 標籤缺少可辨識的 content 屬性")
    quote = attr_match.group("quote")
    escaped = new_content.replace("&", "&amp;")
    if quote == '"':
        escaped = escaped.replace('"', "&quot;")
    else:
        escaped = escaped.replace("'", "&#39;")
    replacement = attr_match.group("prefix") + quote + escaped + quote
    new_tag = meta.raw[:attr_match.start()] + replacement + meta.raw[attr_match.end():]
    return html[:meta.start] + new_tag + html[meta.start + len(meta.raw):]


def update_hash_directive(directives: list[tuple[str, list[str]]], name: str, new_hash: str) -> list[tuple[str, list[str]]]:
    matches = [i for i, (directive_name, _) in enumerate(directives) if directive_name == name]
    if len(matches) > 1:
        raise ValueError(f"CSP 含有重複的 {name} 指令，拒絕自動修改")
    if not matches:
        # Only style-src-elem may be safely added: it is being aligned with style-src.
        if name == "style-src-elem":
            directives.append((name, [new_hash]))
            return directives
        raise ValueError(f"CSP 缺少必要的 {name} 指令，拒絕自動修改")
    i = matches[0]
    old_values = directives[i][1]
    other_values = [v for v in old_values if not HASH_TOKEN_RE.match(v)]
    directives[i] = (name, other_values + [new_hash])
    return directives


def serialize_csp(directives: list[tuple[str, list[str]]]) -> str:
    return "; ".join(name + (" " + " ".join(values) if values else "") for name, values in directives)


def sink_inventory(script_text: str) -> list[tuple[int, str, str]]:
    """Heuristic only: strings/comments can produce false positives; AST review is still required."""
    patterns = [
        ("HTML_SINK", re.compile(r"\.\s*(?:innerHTML|outerHTML)\s*(?:\+?=)|\[\s*['\"](?:innerHTML|outerHTML)['\"]\s*\]\s*(?:\+?=)")),
        ("HTML_SINK", re.compile(r"\.\s*insertAdjacentHTML\s*\(")),
        ("HTML_SINK", re.compile(r"\bdocument\s*\.\s*write(?:ln)?\s*\(")),
        ("HTML_SINK", re.compile(r"\.\s*createContextualFragment\s*\(")),
        ("HTML_SINK", re.compile(r"\bDOMParser\b[^\n]*\.\s*parseFromString\s*\(")),
        ("TRUSTED_URL_OR_HTML_SINK", re.compile(r"\.\s*srcdoc\s*=")),
    ]
    out: list[tuple[int, str, str]] = []
    for line_no, line in enumerate(script_text.splitlines(), 1):
        for category, pattern in patterns:
            for _ in pattern.finditer(line):
                out.append((line_no, category, line.strip()[:150]))
    return out


def audit(path: Path, html: str) -> tuple[dict[str, Any], list[str]]:
    parser = WylqHTMLParser(html)
    parser.feed(html)
    parser.close()
    scan = parser.scan
    errors: list[str] = []
    warnings: list[str] = []

    if len(scan.scripts) != 1:
        errors.append(f"預期恰好 1 個內嵌 <script>，實際找到 {len(scan.scripts)} 個")
    if len(scan.styles) != 1:
        errors.append(f"預期恰好 1 個內嵌 <style>，實際找到 {len(scan.styles)} 個")
    if any("src" in item.attrs for item in scan.script_tags):
        errors.append("發現外部 <script src=...>；本專案設定為零外部依賴")
    if scan.inline_style_attrs:
        errors.append(f"發現 {len(scan.inline_style_attrs)} 個 inline style 屬性")
    if scan.inline_handlers:
        errors.append(f"發現 {len(scan.inline_handlers)} 個 inline event handler 屬性")
    if scan.external_refs:
        errors.append(f"發現 {len(scan.external_refs)} 個外部資源引用")
    if scan.duplicate_ids:
        errors.append(f"發現 {len(scan.duplicate_ids)} 個重複 id")
    if len(scan.csp_metas) != 1:
        errors.append(f"預期恰好 1 個 CSP meta，實際找到 {len(scan.csp_metas)} 個")

    script_hash = csp_sha256(scan.scripts[0]) if len(scan.scripts) == 1 else ""
    style_hash = csp_sha256(scan.styles[0]) if len(scan.styles) == 1 else ""

    csp_content = str(scan.csp_metas[0].attrs.get("content") or "") if len(scan.csp_metas) == 1 else ""
    directives = parse_csp(csp_content)
    dmap = directive_map(directives)

    for name in HASH_DIRECTIVES:
        if len(dmap.get(name, [])) != 1:
            errors.append(f"CSP 必須恰好包含一個 {name} 指令")

    expected = {
        "script-src": [script_hash] if script_hash else [],
        "style-src": [style_hash] if style_hash else [],
        "style-src-elem": [style_hash] if style_hash else [],
    }
    for name, hashes in expected.items():
        values = dmap.get(name, [])
        if len(values) == 1 and hashes and hashes[0] not in values[0]:
            errors.append(f"{name} 未包含實際內容雜湊 {hashes[0]}")
        if len(values) == 1 and hashes:
            # WYLQ profile intentionally allows only the matching inline hash here.
            extras = [v for v in values[0] if v != hashes[0]]
            if extras:
                errors.append(f"{name} 含有非預期額外來源：{' '.join(extras)}")

    for name in REQUIRED_NONE_DIRECTIVES:
        values = dmap.get(name, [])
        if len(values) != 1 or values[0] != ["'none'"]:
            errors.append(f"CSP {name} 必須恰好為 'none'")
    if len(dmap.get("upgrade-insecure-requests", [])) != 1 or dmap.get("upgrade-insecure-requests", [[]])[0] != []:
        errors.append("CSP 必須包含無參數的 upgrade-insecure-requests")

    if scan.csp_metas and csp_content and "report-only" in csp_content.lower():
        warnings.append("請確認 CSP 沒有誤把 Report-Only 當成 meta 政策；meta 不支援 Report-Only")

    script_text = scan.scripts[0] if len(scan.scripts) == 1 else ""
    sinks = sink_inventory(script_text)
    report = {
        "script_hash": script_hash,
        "style_hash": style_hash,
        "csp": csp_content,
        "sink_count": len(sinks),
        "sinks": sinks,
        "scan": scan,
    }
    return report, errors + ["警告：" + x for x in warnings]


def fix_hashes(html: str, scan: HtmlScan, script_hash: str, style_hash: str) -> str:
    if len(scan.csp_metas) != 1:
        raise ValueError("CSP meta 數量不是 1，拒絕自動修改")
    meta = scan.csp_metas[0]
    csp_content = str(meta.attrs.get("content") or "")
    directives = parse_csp(csp_content)
    for name in ("script-src", "style-src", "style-src-elem"):
        new_hash = script_hash if name == "script-src" else style_hash
        directives = update_hash_directive(directives, name, new_hash)
    return replace_meta_content(html, meta, serialize_csp(directives))


def atomic_write(path: Path, data: bytes, backup: bool) -> None:
    backup_path = path.with_suffix(path.suffix + ".bak")
    if backup and backup_path.exists():
        raise FileExistsError(f"備份檔已存在：{backup_path}；請先移走或改名，避免覆蓋舊備份")
    if backup:
        shutil.copy2(path, backup_path)
    fd, temp_name = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
    except Exception:
        try: os.unlink(temp_name)
        except OSError: pass
        raise


def main() -> int:
    ap = argparse.ArgumentParser(description="WYLQ-Audit CSP 驗證與 Trusted Types DOM sink 候選盤點")
    ap.add_argument("file", type=Path, help="要檢查的 HTML 檔案")
    ap.add_argument("--fix", action="store_true", help="只更新 script-src/style-src/style-src-elem SHA-256")
    ap.add_argument("--no-backup", action="store_true", help="搭配 --fix 時不建立 .bak（不建議）")
    args = ap.parse_args()

    if not args.file.is_file():
        print(f"[FAIL] 找不到檔案：{args.file}", file=sys.stderr)
        return 2
    try:
        original_bytes = args.file.read_bytes()
        html = original_bytes.decode("utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        print(f"[FAIL] 無法讀取 UTF-8 HTML：{exc}", file=sys.stderr)
        return 2

    report, issues = audit(args.file, html)
    scan: HtmlScan = report["scan"]
    print(f"=== WYLQ-Audit CSP／DOM Sink 審計：{args.file.name} ===")
    print(f"Script SHA-256 : {report['script_hash'] or '(無法計算)'}")
    print(f"Style  SHA-256 : {report['style_hash'] or '(無法計算)'}")
    print(f"Script / Style : {len(scan.scripts)} / {len(scan.styles)}")
    print(f"CSP meta       : {len(scan.csp_metas)}")
    print(f"DOM sink 候選  : {report['sink_count']}（啟發式掃描，須人工複核）")
    print(f"Inline style   : {len(scan.inline_style_attrs)}")
    print(f"Inline handler : {len(scan.inline_handlers)}")
    print(f"External refs  : {len(scan.external_refs)}")

    if args.fix:
        if len(scan.scripts) != 1 or len(scan.styles) != 1 or len(scan.csp_metas) != 1:
            print("[FAIL] Script／Style／CSP 結構不唯一，拒絕自動寫回。", file=sys.stderr)
            return 2
        try:
            updated = fix_hashes(html, scan, report["script_hash"], report["style_hash"])
            if updated == html:
                print("[INFO] CSP 雜湊已一致，未修改檔案。")
            else:
                atomic_write(args.file, updated.encode("utf-8"), backup=not args.no_backup)
                print("[FIXED] 已更新三個 CSP hash 指令。")
            html = updated
            report, issues = audit(args.file, html)
        except Exception as exc:
            print(f"[FAIL] 自動修復中止：{exc}", file=sys.stderr)
            return 2

    for line_no, category, snippet in report["sinks"]:
        print(f"  JS L{line_no:04d} [{category}] {snippet}")

    if issues:
        print("\n[FAIL / REVIEW]")
        for item in issues:
            print(" - " + item)
        # Static checks are intentionally conservative; issues must be reviewed.
        return 1

    print("\n[PASS] CSP hash 與本工具涵蓋的靜態政策檢查通過。")
    print("[NOTE] 這不等同完整安全審計；JavaScript 資料流、模板安全及執行期 DOM 行為仍須另行測試。")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())