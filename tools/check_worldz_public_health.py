#!/usr/bin/env python3
"""Public website health: verify actual content against checked-in HTML, not HTTP 200."""
import hashlib,sys,time,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SITES={
 "https://worldzhq.com/":("worldzhq.com/index.html",["/treasury/"]),
 "https://worldzhq.com/treasury/":("worldzhq.com/treasury/index.html",["What @JayJayTeamDev is building","Dennis, the other Dennis"]),
 "https://purplediamondcrew.com/":("purplediamondcrew.com/index.html",["What Purple Diamond Crew does"]),
}
def check(url,path,markers):
 expected=(ROOT/path).read_text(encoding="utf-8")
 for marker in markers:
  if marker not in expected:raise RuntimeError("SOURCE_MARKER_MISSING "+path+" "+marker)
 last=None
 for i in range(3):
  try:
   req=urllib.request.Request(url+"?worldz_health="+str(int(time.time())),headers={"Cache-Control":"no-cache","User-Agent":"WorldzPublicHealth/1"})
   with urllib.request.urlopen(req,timeout=18) as resp:
    body=resp.read(3000000).decode("utf-8","replace")
    if resp.status!=200:raise RuntimeError("HTTP_"+str(resp.status))
    for marker in markers:
     if marker not in body:raise RuntimeError("LIVE_MARKER_MISSING "+marker)
    if hashlib.sha256(body.encode()).digest()!=hashlib.sha256(expected.encode()).digest():
     raise RuntimeError("LIVE_SOURCE_MISMATCH (stale or transformed HTML)")
   print("PUBLIC_SOURCE_MATCH_PASS",url,flush=True);return
  except Exception as e:
   last=e
   print("HEALTH_RETRY",url,i+1,str(e)[:250],flush=True)
   if i<2:time.sleep(10)
 raise RuntimeError("PUBLIC_HEALTH_FAILED "+url+": "+str(last))
def main():
 failures=0
 for url,(path,markers) in SITES.items():
  try:check(url,path,markers)
  except Exception as e:
   print("::error::"+str(e),flush=True);failures+=1
 print("WORLDZ_PUBLIC_HEALTH="+("PASS" if failures==0 else "FAIL"),flush=True)
 sys.exit(1 if failures else 0)
if __name__=="__main__":main()
