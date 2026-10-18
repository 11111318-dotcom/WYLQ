#!/usr/bin/env python3
"""Static pre-deployment guardrails for the WYLQ single-file HTML app."""
from __future__ import annotations
import base64, hashlib, re, shutil, subprocess, sys, tempfile
from html.parser import HTMLParser
from pathlib import Path

REQUIRED = {
    "default-src": {"'none'"}, "connect-src": {"'none'"},
    "img-src": {"'none'"}, "font-src": {"'none'"},
    "object-src": {"'none'"}, "media-src": {"'none'"},
    "worker-src": {"'none'"}, "manifest-src": {"'none'"},
    "base-uri": {"'none'"}, "form-action": {"'none'"},
    "script-src-attr": {"'none'"}, "style-src-attr": {"'unsafe-inline'"},
}
MARKERS = ("INPUT_ENUMS", "strictDateValue", "strictTimeValue",
           "validateSecurityInputs", "validateBirthInputs", "scriptStartupWarning",
           "function deepFreeze", "CONFIRM_COOLDOWN_MS=500", "SUBMIT_COOLDOWN_MS=500")
failures = []
def check(ok, msg):
    print(("PASS  " if ok else "FAIL  ") + msg)
    if not ok: failures.append(msg)
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.csp=[]; self.handlers=[]; self.resources=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs); tag=tag.lower()
        if tag=="meta" and (a.get("http-equiv") or "").lower()=="content-security-policy": self.csp.append(a.get("content", ""))
        for k,v in attrs:
            if k and k.lower().startswith("on"): self.handlers.append((tag,k))
        if tag in {"script","img","iframe","link","audio","video","source","track","object","embed"}:
            for k in ("src","href","data"):
                if a.get(k): self.resources.append((tag,k,a[k]))
path=Path(sys.argv[1] if len(sys.argv)>1 else "index.html")
if not path.is_file(): raise SystemExit(f"FAIL  HTML file not found: {path}")
raw=path.read_bytes()
try: html=raw.decode("utf-8")
except UnicodeDecodeError: raise SystemExit("FAIL  HTML must be valid UTF-8")
p=Parser(); p.feed(html); p.close()
scripts=re.findall(r"<script\b([^>]*)>([\s\S]*?)</script\s*>",html,re.I)
styles=re.findall(r"<style\b([^>]*)>([\s\S]*?)</style\s*>",html,re.I)
check(len(scripts)==1 and not re.search(r"\bsrc\s*=",scripts[0][0],re.I), "exactly one inline script; no external script src")
check(len(styles)==1, "exactly one inline style block")
check(len(p.csp)==1, "exactly one parseable CSP meta")
d={}
if len(p.csp)==1:
    for part in p.csp[0].split(";"):
        f=part.strip().split()
        if f:
            key=f[0].lower(); check(key not in d, f"CSP directive {key} is unique")
            d[key]=set(f[1:])
    for key, want in REQUIRED.items(): check(d.get(key)==want, f"CSP {key} is {sorted(want)}")
    check("upgrade-insecure-requests" in d, "CSP upgrade-insecure-requests present")
    check("'unsafe-inline'" not in d.get("script-src",set()) and "'unsafe-eval'" not in d.get("script-src",set()), "script-src does not allow unsafe-inline/unsafe-eval")
    if len(scripts)==1:
        h=base64.b64encode(hashlib.sha256(scripts[0][1].encode("utf-8")).digest()).decode()
        check(d.get("script-src")=={"'sha256-"+h+"'"}, "CSP script SHA-256 matches exact UTF-8 content")
    if len(styles)==1:
        h=base64.b64encode(hashlib.sha256(styles[0][1].encode("utf-8")).digest()).decode()
        check(d.get("style-src-elem")=={"'sha256-"+h+"'"}, "CSP style SHA-256 matches exact UTF-8 content")
check(not p.handlers, "no inline HTML event-handler attributes")
check(not p.resources, "no external/media resource URL attributes")
check('name="referrer"' in html and 'content="no-referrer"' in html, "Referrer-Policy meta is no-referrer")
for marker in MARKERS: check(marker in html, f"required protection present: {marker}")
script=scripts[0][1] if len(scripts)==1 else ""
INPUT_GUARDRAILS = (
    ("strict YYYY-MM-DD input pattern", r"!/^\d{4}-\d{2}-\d{2}$/.test(v)"),
    ("real calendar date round-trip validation", "probe.getUTCFullYear()===y&&probe.getUTCMonth()+1===m&&probe.getUTCDate()===d"),
    ("strict HH:MM input pattern", r"!/^\d{2}:\d{2}$/.test(v)"),
    ("24-hour time range validation", "h>=0&&h<=23&&m>=0&&m<=59"),
    ("target year integer range validation", r"!/^\d{1,4}$/.test(String(target).trim())||Number(target)<1||Number(target)>3000"),
    ("advanced options restricted to allowlisted values", "!INPUT_ENUMS[id].includes(String(el.value))"),
    ("calculation core validates inputs before rendering", "const securityInputError=validateSecurityInputs();if(securityInputError){setFormError(securityInputError);return false;}"),
    ("form errors use textContent rather than HTML parsing", "el.textContent=message||'';"),
)
for label, invariant in INPUT_GUARDRAILS:
    check(invariant in script, label)

render_start = script.find("function renderSummary(")
render_end = script.find("function currentBirthKey(", render_start)
check(render_start >= 0 and render_end > render_start, "HTML renderer audit boundaries are present")
if render_start >= 0 and render_end > render_start:
    renderers = script[render_start:render_end]
    raw_input_reference = re.search(
        r"\b(?:birthDateInput|timeInput|targetRaw)\b|\bsafeVal\s*\(|"
        r"document\.getElementById\(\s*['\"](?:birth|time|target|timeMode|pulseObserved|depressionEvidence|southNorthMode)['\"]\s*\)\s*\.value",
        renderers,
    )
    check(not raw_input_reference, "HTML renderers do not directly reference raw form input values")
check(not re.search(r"window\.handle(?:Submit|Back)\s*=",script), "submit/back handlers are not writable window globals")
check(not re.search(r"\btypeof\s+table\s*!==\s*['\"]undefined['\"]",script), "no ineffective typeof table guard")
check("SAFETY: txt is generated only by precisionNoticeText()" in script, "precisionNotice HTML sink has safety annotation")
for pat,label in [(r"\beval\s*\(","eval()"),(r"\bnew\s+Function\b","new Function"),(r"\bXMLHttpRequest\b","XMLHttpRequest"),(r"\bWebSocket\s*\(","WebSocket"),(r"\bEventSource\s*\(","EventSource"),(r"\bsendBeacon\s*\(","sendBeacon"),(r"\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|document\.cookie","persistence API")]:
    check(not re.search(pat,script), f"no {label} in main script")
count=len(re.findall(r"\.innerHTML\s*=",script))
check(count<=34, f"innerHTML sink count remains within reviewed baseline (34; current {count})")
if len(scripts)==1 and shutil.which("node"):
    with tempfile.NamedTemporaryFile("w",encoding="utf-8",suffix=".js",delete=False) as f: f.write(script); js=Path(f.name)
    try:
        r=subprocess.run(["node","--check",str(js)],capture_output=True,text=True,timeout=20)
        check(r.returncode==0,"Node.js syntax check passed")
        if r.returncode: print(r.stderr or r.stdout)
    finally: js.unlink(missing_ok=True)
else: print("NOTE  Node.js unavailable; syntax check skipped")
print("File SHA-256: "+hashlib.sha256(raw).hexdigest())
print(f"Result: {len(failures)} failure(s)")
sys.exit(1 if failures else 0)
