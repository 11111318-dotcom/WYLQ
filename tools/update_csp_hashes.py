#!/usr/bin/env python3
"""Safely update the inline script/style SHA-256 sources in a CSP meta policy.

The updater is deliberately fail-closed: it refuses ambiguous HTML, multiple CSP
meta tags, duplicate CSP directives, or target directives that contain anything
other than exactly one SHA-256 source. It writes only after all validation passes.
"""
from __future__ import annotations

import base64
import hashlib
import html as html_module
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

HASH_SOURCE_RE = re.compile(r"^'sha256-[A-Za-z0-9+/]{43}='$")
TARGET_DIRECTIVES = ("script-src", "style-src-elem")


class SourceInspector(HTMLParser):
    """Locate actual HTML tags and retain exact source offsets/content."""

    def __init__(self, source: str) -> None:
        super().__init__(convert_charrefs=False)
        self.source = source
        self.line_starts = [0]
        self.line_starts.extend(i + 1 for i, ch in enumerate(source) if ch == "\n")
        self.blocks: dict[str, list[dict[str, object]]] = {"script": [], "style": []}
        self.active: dict[str, dict[str, object] | None] = {"script": None, "style": None}
        self.csp_meta: list[dict[str, object]] = []
        self.errors: list[str] = []

    def source_offset(self) -> int:
        line, column = self.getpos()
        return self.line_starts[line - 1] + column

    @staticmethod
    def normalized_attrs(attrs: list[tuple[str, str | None]]) -> dict[str, str | None]:
        result: dict[str, str | None] = {}
        for key, value in attrs:
            result[key.lower()] = value
        return result

    @staticmethod
    def duplicate_attr_names(attrs: list[tuple[str, str | None]]) -> list[str]:
        names = [key.lower() for key, _ in attrs]
        return sorted({name for name in names if names.count(name) > 1})

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        start = self.source_offset()
        raw_tag = self.get_starttag_text() or ""
        attr_map = self.normalized_attrs(attrs)

        if tag == "meta" and (attr_map.get("http-equiv") or "").strip().lower() == "content-security-policy":
            self.csp_meta.append({
                "start": start,
                "raw_tag": raw_tag,
                "attrs": attrs,
                "attr_map": attr_map,
                "duplicate_attrs": self.duplicate_attr_names(attrs),
            })

        if tag in self.blocks:
            if self.active[tag] is not None:
                self.errors.append(f"nested/unclosed <{tag}> element")
            self.active[tag] = {
                "start": start,
                "content_start": start + len(raw_tag),
                "raw_tag": raw_tag,
                "attrs": attrs,
                "attr_map": attr_map,
            }

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag not in self.blocks:
            return
        active = self.active[tag]
        if active is None:
            self.errors.append(f"unmatched </{tag}> element")
            return
        end = self.source_offset()
        content_start = int(active["content_start"])
        active["body"] = self.source[content_start:end]
        active["end"] = end
        self.blocks[tag].append(active)
        self.active[tag] = None

    def finish(self) -> None:
        self.feed(self.source)
        self.close()
        for tag, active in self.active.items():
            if active is not None:
                self.errors.append(f"unclosed <{tag}> element")


def sha256_source(content: str) -> str:
    digest = hashlib.sha256(content.encode("utf-8")).digest()
    return "'sha256-" + base64.b64encode(digest).decode("ascii") + "'"


def parse_policy(policy: str) -> list[str]:
    """Validate uniqueness of all directives and return semicolon-delimited parts."""
    parts = policy.split(";")
    seen: set[str] = set()
    for part in parts:
        tokens = re.findall(r"\S+", part)
        if not tokens:
            continue
        name = tokens[0].lower()
        if name in seen:
            raise ValueError(f"duplicate CSP directive: {name}")
        seen.add(name)
    for target in TARGET_DIRECTIVES:
        count = sum(1 for part in parts if (re.findall(r"\S+", part) or [""])[0].lower() == target)
        if count != 1:
            raise ValueError(f"expected exactly one {target} directive; found {count}")
    return parts


def replace_target_hash(parts: list[str], directive: str, new_hash: str) -> list[str]:
    """Replace the sole existing SHA-256 source in one already-validated directive."""
    out: list[str] = []
    found = 0
    for part in parts:
        matches = list(re.finditer(r"\S+", part))
        if not matches or matches[0].group(0).lower() != directive:
            out.append(part)
            continue
        found += 1
        if len(matches) != 2 or not HASH_SOURCE_RE.fullmatch(matches[1].group(0)):
            raise ValueError(
                f"{directive} must contain exactly one SHA-256 source and no other sources"
            )
        source_match = matches[1]
        out.append(part[:source_match.start()] + new_hash + part[source_match.end():])
    if found != 1:
        raise ValueError(f"expected exactly one {directive} directive; found {found}")
    return out


def find_raw_content_value(raw_tag: str) -> tuple[int, int, str]:
    """Return raw value boundaries for one double-quoted content attribute."""
    matches = list(re.finditer(r"(?is)(?<![\w:-])content\s*=\s*([""'])(.*?)\1", raw_tag))
    if len(matches) != 1:
        raise ValueError("CSP meta tag must have exactly one quoted content attribute")
    match = matches[0]
    if match.group(1) != '"':
        raise ValueError("CSP content attribute must use double quotes")
    return match.start(2), match.end(2), match.group(2)


def main() -> int:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "index.html")
    if not path.is_file():
        print(f"FAIL  HTML file not found: {path}", file=sys.stderr)
        return 1

    # newline="" preserves original CRLF/LF line endings and exact script/style bytes.
    with path.open("r", encoding="utf-8", newline="") as handle:
        source = handle.read()

    inspector = SourceInspector(source)
    try:
        inspector.finish()
    except Exception as exc:  # HTMLParser failures must never produce a partial write.
        print(f"FAIL  unable to parse HTML: {exc}", file=sys.stderr)
        return 1

    if inspector.errors:
        print("FAIL  ambiguous HTML structure: " + "; ".join(inspector.errors), file=sys.stderr)
        return 1
    if len(inspector.blocks["script"]) != 1:
        print("FAIL  expected exactly one complete script block", file=sys.stderr)
        return 1
    if len(inspector.blocks["style"]) != 1:
        print("FAIL  expected exactly one complete style block", file=sys.stderr)
        return 1
    script = inspector.blocks["script"][0]
    style = inspector.blocks["style"][0]
    if re.search(r"\bsrc\s*=", str(script["raw_tag"]), re.I):
        print("FAIL  expected one inline script block; external src is not allowed", file=sys.stderr)
        return 1

    if len(inspector.csp_meta) != 1:
        print(f"FAIL  expected exactly one CSP meta tag; found {len(inspector.csp_meta)}", file=sys.stderr)
        return 1
    meta = inspector.csp_meta[0]
    if meta["duplicate_attrs"]:
        print("FAIL  duplicate attribute(s) on CSP meta tag: " + ", ".join(meta["duplicate_attrs"]), file=sys.stderr)
        return 1
    policy_from_parser = meta["attr_map"].get("content")
    if not isinstance(policy_from_parser, str):
        print("FAIL  CSP meta tag has no content attribute", file=sys.stderr)
        return 1

    try:
        value_start, value_end, raw_policy = find_raw_content_value(str(meta["raw_tag"]))
        if html_module.unescape(raw_policy) != policy_from_parser:
            raise ValueError("raw CSP content differs from parsed attribute; refusing to rewrite")
        parts = parse_policy(raw_policy)
        new_script_hash = sha256_source(str(script["body"]))
        new_style_hash = sha256_source(str(style["body"]))
        parts = replace_target_hash(parts, "script-src", new_script_hash)
        parts = replace_target_hash(parts, "style-src-elem", new_style_hash)
        updated_policy = ";".join(parts)
    except ValueError as exc:
        print(f"FAIL  CSP update refused: {exc}", file=sys.stderr)
        return 1

    tag_start = int(meta["start"])
    raw_tag = str(meta["raw_tag"])
    updated_tag = raw_tag[:value_start] + updated_policy + raw_tag[value_end:]
    updated_source = source[:tag_start] + updated_tag + source[tag_start + len(raw_tag):]

    # Write only after every check passed. Keep original line endings unchanged.
    with path.open("w", encoding="utf-8", newline="") as handle:
        handle.write(updated_source)
    print(f"Updated {path}")
    print(f"script-src {new_script_hash}")
    print(f"style-src-elem {new_style_hash}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
