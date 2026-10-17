#!/usr/bin/env python3
"""Update CSP SHA-256 hashes after intentional HTML/JS/CSS edits."""
from __future__ import annotations
import base64, hashlib, re, sys
from pathlib import Path
path=Path(sys.argv[1] if len(sys.argv)>1 else "index.html")
if not path.is_file(): raise SystemExit(f"HTML file not found: {path}")
html=path.read_text(encoding="utf-8")
def blocks(tag): return re.findall(rf"<{tag}\b([^>]*)>([\s\S]*?)</{tag}\s*>",html,re.I)
scripts=blocks("script"); styles=blocks("style")
if len(scripts)!=1 or re.search(r"\bsrc\s*=",scripts[0][0],re.I): raise SystemExit("Expected exactly one inline script block")
if len(styles)!=1: raise SystemExit("Expected exactly one inline style block")
def digest(s): return "'sha256-"+base64.b64encode(hashlib.sha256(s.encode("utf-8")).digest()).decode("ascii")+"'"
sh=digest(scripts[0][1]); st=digest(styles[0][1])
for directive,value in (("script-src",sh),("style-src-elem",st)):
    pattern=rf"(\b{directive}\s+)'sha256-[^']+'"
    html,n=re.subn(pattern,lambda m:m.group(1)+value,html,count=1,flags=re.I)
    if n!=1: raise SystemExit(f"Expected exactly one hash source for {directive}; no policy written")
path.write_text(html,encoding="utf-8",newline="")
print(f"Updated {path}\nscript-src {sh}\nstyle-src-elem {st}")
