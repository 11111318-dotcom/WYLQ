#!/usr/bin/env python3
"""Regression tests for stale CSP hashes and selected security guardrails."""
from __future__ import annotations

import re
import subprocess
import sys
import tempfile
from pathlib import Path

source = Path(sys.argv[1] if len(sys.argv) > 1 else "index.html").resolve()
root = Path(__file__).resolve().parent
checker = root / "security_check.py"
updater = root / "update_csp_hashes.py"

if not source.is_file():
    raise SystemExit(f"FAIL HTML file not found: {source}")
if not checker.is_file() or not updater.is_file():
    raise SystemExit("FAIL security_check.py and update_csp_hashes.py must exist beside this test")

with source.open("r", encoding="utf-8", newline="") as handle:
    original_html = handle.read()


def run_checker(path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(checker), str(path)],
        capture_output=True, text=True, timeout=60,
    )


def run_updater(path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(updater), str(path)],
        capture_output=True, text=True, timeout=60,
    )


def write_fixture(directory: str, contents: str) -> Path:
    path = Path(directory) / "fixture.html"
    with path.open("w", encoding="utf-8", newline="") as handle:
        handle.write(contents)
    return path


def scenario(label: str, changed: str, expected_failure_phrase: str) -> None:
    with tempfile.TemporaryDirectory() as td:
        fixture = write_fixture(td, changed)
        result = run_checker(fixture)
        output = result.stdout + result.stderr
        if result.returncode == 0 or expected_failure_phrase not in output:
            raise SystemExit(f"FAIL {label}: invalid hash was not rejected as expected\n{output}")
        print(f"PASS {label}: stale hash rejected")

        updated = run_updater(fixture)
        if updated.returncode != 0:
            raise SystemExit(f"FAIL {label}: updater failed\n{updated.stdout}{updated.stderr}")
        result = run_checker(fixture)
        if result.returncode != 0:
            raise SystemExit(f"FAIL {label}: updated fixture did not pass\n{result.stdout}{result.stderr}")
        print(f"PASS {label}: updater repaired hashes and checker passed")


def rejected_mutation(label: str, changed: str, expected_phrase: str) -> None:
    with tempfile.TemporaryDirectory() as td:
        fixture = write_fixture(td, changed)
        result = run_checker(fixture)
        output = result.stdout + result.stderr
        if result.returncode == 0 or expected_phrase not in output:
            raise SystemExit(f"FAIL {label}: unsafe mutation was not rejected as expected\n{output}")
        print(f"PASS {label}: checker rejected mutation")


def updater_refuses(label: str, changed: str, expected_phrase: str) -> None:
    with tempfile.TemporaryDirectory() as td:
        fixture = write_fixture(td, changed)
        before = fixture.read_bytes()
        result = run_updater(fixture)
        if result.returncode == 0 or expected_phrase not in (result.stdout + result.stderr):
            raise SystemExit(
                f"FAIL {label}: updater did not refuse ambiguous policy\n{result.stdout}{result.stderr}"
            )
        if fixture.read_bytes() != before:
            raise SystemExit(f"FAIL {label}: updater modified the file despite refusing it")
        print(f"PASS {label}: updater refused and left file unchanged")


script_changed, count = re.subn(
    r"</script\s*>", "\n// UTF-8 regression test: 測試 Δ\n</script>", original_html,
    count=1, flags=re.I,
)
if count != 1:
    raise SystemExit("FAIL test setup: could not locate closing script tag")
style_changed, count = re.subn(
    r"</style\s*>", "\n/* UTF-8 regression test: 樣式 Δ */\n</style>", original_html,
    count=1, flags=re.I,
)
if count != 1:
    raise SystemExit("FAIL test setup: could not locate closing style tag")

scenario("script SHA-256", script_changed, "CSP script SHA-256")
scenario("style SHA-256", style_changed, "CSP style SHA-256")

duplicate_directive, count = re.subn(
    r"(default-src\s+'none'\s*;)", r"\1 script-src 'unsafe-inline';", original_html,
    count=1, flags=re.I,
)
if count != 1:
    raise SystemExit("FAIL test setup: could not locate default-src directive")
rejected_mutation("duplicate CSP directive", duplicate_directive, "CSP directive script-src is unique")

unsafe_script, count = re.subn(
    r"(script-src\s+'sha256-[^']+')",
    r"\1 'unsafe-inline'", original_html, count=1, flags=re.I,
)
if count != 1:
    raise SystemExit("FAIL test setup: could not locate script-src hash")
rejected_mutation("unsafe script-src source", unsafe_script, "script-src does not allow unsafe-inline/unsafe-eval")

if "INPUT_ENUMS" not in original_html:
    raise SystemExit("FAIL test setup: INPUT_ENUMS marker is missing from source HTML")
missing_marker = original_html.replace("INPUT_ENUMS", "INPUT_ENUM")
rejected_mutation("missing required marker", missing_marker, "required protection present: INPUT_ENUMS")

updater_refuses("duplicate target directive", duplicate_directive, "duplicate CSP directive: script-src")

extra_hash_source, count = re.subn(
    r"(script-src\s+'sha256-[^']+')",
    r"\1 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='", original_html,
    count=1, flags=re.I,
)
if count != 1:
    raise SystemExit("FAIL test setup: could not locate script-src hash")
updater_refuses("multiple script-src sources", extra_hash_source, "script-src must contain exactly one SHA-256 source")

with tempfile.TemporaryDirectory() as td:
    production_fixture = write_fixture(td, original_html)
    result = run_checker(production_fixture)
    if result.returncode != 0:
        raise SystemExit("FAIL final artifact validation\n" + result.stdout + result.stderr)
print("PASS production HTML checks and hash invariants verified")
print("Result: all security tool regression tests passed")
