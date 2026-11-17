#!/usr/bin/env python3
"""Regression guard: GitHub Pages production jobs must run only from main."""
from __future__ import annotations

import re
import sys
from pathlib import Path

path = Path(sys.argv[1] if len(sys.argv) > 1 else ".github/workflows/jekyll-gh-pages.yml")
if not path.is_file():
    raise SystemExit(f"FAIL workflow file not found: {path}")

source = path.read_text(encoding="utf-8")

def job_block(name: str) -> str:
    pattern = rf"(?ms)^  {re.escape(name)}:\s*\n(.*?)(?=^  [A-Za-z0-9_-]+:\s*$|\Z)"
    match = re.search(pattern, source)
    if not match:
        raise SystemExit(f"FAIL required job not found: {name}")
    return match.group(1)

expected = "github.ref == 'refs/heads/main'"
for name in ("build", "deploy"):
    block = job_block(name)
    match = re.search(r"(?m)^    if:\s*(.*?)\s*$", block)
    if not match or match.group(1).strip() != expected:
        actual = match.group(1).strip() if match else "<missing>"
        raise SystemExit(f"FAIL {name} must be restricted to {expected}; found {actual}")
    print(f"PASS {name} is restricted to refs/heads/main")

if "environment:\n      name: github-pages" not in job_block("deploy"):
    raise SystemExit("FAIL deploy must continue to use the github-pages environment")
if "needs: security" not in job_block("build"):
    raise SystemExit("FAIL build must continue to depend on the security job")
if "needs: build" not in job_block("deploy"):
    raise SystemExit("FAIL deploy must continue to depend on the build job")

print("PASS production deployment remains behind security -> build -> deploy")
