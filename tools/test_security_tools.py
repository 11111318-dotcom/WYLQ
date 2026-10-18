#!/usr/bin/env python3
"""Regression tests for stale CSP hashes and selected security guardrails."""
from __future__ import annotations

import re
import shutil
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

def checker_rejects_after_hash_repair(label: str, changed: str, expected_phrase: str) -> None:
    with tempfile.TemporaryDirectory() as td:
        fixture = write_fixture(td, changed)
        updated = run_updater(fixture)
        if updated.returncode != 0:
            raise SystemExit(f"FAIL {label}: updater could not prepare mutated fixture\n{updated.stdout}{updated.stderr}")
        result = run_checker(fixture)
        output = result.stdout + result.stderr
        if result.returncode == 0 or expected_phrase not in output:
            raise SystemExit(f"FAIL {label}: output guard did not reject mutation\n{output}")
        print(f"PASS {label}: output guard rejected mutation")


# Verify the CI checker detects regressions in the app's actual input/output guards.
validation_gate = "const securityInputError=validateSecurityInputs();if(securityInputError){setFormError(securityInputError);return false;}"
if validation_gate not in original_html:
    raise SystemExit("FAIL test setup: calculation validation gate not found")
rejected_mutation(
    "missing calculation validation gate",
    original_html.replace(validation_gate, "", 1),
    "calculation core validates inputs before rendering",
)

text_sink = "el.textContent=message||'';"
if text_sink not in original_html:
    raise SystemExit("FAIL test setup: safe form-error text sink not found")
rejected_mutation(
    "form error changed from textContent to innerHTML",
    original_html.replace(text_sink, "el.innerHTML=message||'';", 1),
    "form errors use textContent rather than HTML parsing",
)

summary_sink = "document.getElementById('summary').innerHTML=" + chr(96)
if summary_sink not in original_html:
    raise SystemExit("FAIL test setup: summary HTML sink not found")
unsafe_renderer = original_html.replace(summary_sink, summary_sink + "$" + "{targetRaw}", 1)
checker_rejects_after_hash_repair(
    "raw form value interpolated into HTML renderer",
    unsafe_renderer,
    "HTML renderers do not directly reference raw form input values",
)

# Execute the production validator functions themselves with a mocked DOM in Node.
start_marker = "const INPUT_ENUMS=Object.freeze({"
end_marker = "function pad(n){"
start = original_html.find(start_marker)
end = original_html.find(end_marker, start)
if start < 0 or end <= start:
    raise SystemExit("FAIL test setup: unable to isolate production input validators")
validator_source = original_html[start:end]
if not shutil.which("node"):
    print("NOTE Node.js unavailable; runtime input-validation cases skipped")
else:
    harness = r"""
const defaults = {
  birth: "2004-06-15",
  time: "12:00",
  target: "2026",
  timeMode: "traditional-precision",
  pulseObserved: "none",
  depressionEvidence: "none",
  southNorthMode: "wangbing"
};
const values = { ...defaults };
const document = {
  getElementById(id) {
    return Object.prototype.hasOwnProperty.call(values, id) ? { value: values[id] } : null;
  }
};
function safeVal(id, fallback) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const value = el.value;
  return value === undefined || value === null || value === "" ? fallback : value;
}
"""
    harness += validator_source
    harness += r"""
function check(label, overrides, expectedValid, removeControl) {
  for (const key of Object.keys(values)) delete values[key];
  Object.assign(values, defaults, overrides || {});
  if (removeControl) delete values[removeControl];
  const message = validateSecurityInputs();
  const actualValid = message === "";
  if (actualValid !== expectedValid) {
    console.error("FAIL " + label + ": " + (message || "unexpected validation success"));
    process.exitCode = 1;
    return;
  }
  console.log("PASS " + label);
}
check("valid baseline accepted", {}, true);
check("valid lower target boundary accepted", { target: "1" }, true);
check("valid upper target boundary accepted", { target: "3000" }, true);
check("impossible calendar date rejected", { birth: "2024-02-30" }, false);
check("malformed birth date rejected", { birth: "2004-6-15" }, false);
check("HTML payload in birth date rejected", { birth: "2004-06-15<img src=x onerror=alert(1)>" }, false);
check("hour 24 rejected", { time: "24:00" }, false);
check("minute 60 rejected", { time: "12:60" }, false);
check("malformed time rejected", { time: "1:00" }, false);
check("HTML payload in target year rejected", { target: "<img src=x onerror=alert(1)>" }, false);
check("zero target year rejected", { target: "0" }, false);
check("target year above upper bound rejected", { target: "3001" }, false);
check("fractional target year rejected", { target: "2026.5" }, false);
check("invalid time mode rejected", { timeMode: "<script>" }, false);
check("invalid observed pulse enum rejected", { pulseObserved: "<script>" }, false);
check("invalid depression evidence enum rejected", { depressionEvidence: "<script>" }, false);
check("invalid south/north mode enum rejected", { southNorthMode: "<script>" }, false);
check("missing allowlisted control rejected", {}, false, "pulseObserved");
"""
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".js", delete=False) as js_file:
        js_file.write(harness)
        js_path = Path(js_file.name)
    try:
        node_result = subprocess.run(["node", str(js_path)], capture_output=True, text=True, timeout=30)
        if node_result.returncode != 0:
            raise SystemExit("FAIL runtime input-validation tests\n" + node_result.stdout + node_result.stderr)
        print(node_result.stdout.rstrip())
        print("PASS production input validators rejected malformed and HTML-like form inputs")
    finally:
        js_path.unlink(missing_ok=True)



with tempfile.TemporaryDirectory() as td:
    production_fixture = write_fixture(td, original_html)
    result = run_checker(production_fixture)
    if result.returncode != 0:
        raise SystemExit("FAIL final artifact validation\n" + result.stdout + result.stderr)
print("PASS production HTML checks and hash invariants verified")
print("Result: all security tool regression tests passed")
