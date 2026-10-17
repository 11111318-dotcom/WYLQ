#!/usr/bin/env python3
"""Negative tests: stale CSP hashes must fail; UTF-8 updates must repair them."""
from __future__ import annotations
import subprocess, sys, tempfile
from pathlib import Path
source=Path(sys.argv[1] if len(sys.argv)>1 else "index.html").resolve()
root=Path(__file__).resolve().parent
checker=root/"security_check.py"; updater=root/"update_csp_hashes.py"
if not source.is_file(): raise SystemExit(f"HTML file not found: {source}")
html=source.read_text(encoding="utf-8")
def run(path): return subprocess.run([sys.executable,str(checker),str(path)],capture_output=True,text=True,timeout=60)
def scenario(label, changed, phrase):
    with tempfile.TemporaryDirectory() as td:
        p=Path(td)/"fixture.html"; p.write_text(changed,encoding="utf-8")
        r=run(p); out=r.stdout+r.stderr
        if r.returncode==0 or phrase not in out: raise SystemExit(f"FAIL {label}: stale hash not rejected\n{out}")
        print(f"PASS {label}: stale hash rejected")
        u=subprocess.run([sys.executable,str(updater),str(p)],capture_output=True,text=True,timeout=60)
        if u.returncode: raise SystemExit(f"FAIL {label}: updater failed\n{u.stdout}{u.stderr}")
        r=run(p)
        if r.returncode: raise SystemExit(f"FAIL {label}: updated fixture still fails\n{r.stdout}{r.stderr}")
        print(f"PASS {label}: UTF-8 hash update restores a clean result")
scenario("script SHA-256",html.replace("</script>","\n// UTF-8 regression 測試 Δ\n</script>",1),"CSP script SHA-256")
scenario("style SHA-256",html.replace("</style>","\n/* UTF-8 regression 測試 樣式 */\n</style>",1),"CSP style SHA-256")
result=run(source)
if result.returncode: raise SystemExit("FAIL final artifact validation\n"+result.stdout+result.stderr)
print("PASS production HTML hashes and hardening markers verified")
print("Result: all CSP hash regression tests passed")
