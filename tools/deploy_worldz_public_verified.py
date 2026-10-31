#!/usr/bin/env python3
"""Deploy two Worldz public sites with explicit Hostinger mapping and post-deploy proof."""
import os,ssl,time,hashlib,urllib.request
from ftplib import FTP_TLS,error_perm
from pathlib import Path,PurePosixPath

ROOT=Path(__file__).resolve().parents[1]
SITES={
 "worldzhq.com":{"remote":"domains/worldzhq.com/public_html","url":"https://worldzhq.com/treasury/","local":"treasury/index.html","marker":"What @JayJayTeamDev is building"},
 "purplediamondcrew.com":{"remote":"domains/purplediamondcrew.com/public_html","url":"https://purplediamondcrew.com/","local":"index.html","marker":"What Purple Diamond Crew does"},
}
def ftp_connect():
 host=os.environ["FTP_HOST"]
 context=ssl.create_default_context()
 f=FTP_TLS(context=context);f.connect(host,int(os.environ.get("FTP_PORT","21")),timeout=45)
 f.login(os.environ["FTP_USERNAME"],os.environ["FTP_PASSWORD"]);f.prot_p();f.set_pasv(True)
 return f
def mkdirs(f,path):
 f.cwd("/")
 for part in PurePosixPath(path).parts:
  if part in ("","/"):continue
  try:f.cwd(part)
  except error_perm:f.mkd(part);f.cwd(part)
def upload(site,config):
 localroot=ROOT/site
 if not localroot.is_dir():raise RuntimeError("Missing local site "+site)
 files=[p for p in localroot.rglob("*") if p.is_file()]
 if not files:raise RuntimeError("Empty site "+site)
 f=ftp_connect()
 try:
  for i,p in enumerate(files):
   relative=p.relative_to(localroot).as_posix()
   remote=PurePosixPath(config["remote"])/relative
   mkdirs(f,str(remote.parent))
   data=p.read_bytes()
   staging=".worldz-stage-"+str(os.getpid())+"-"+str(i)
   from io import BytesIO
   f.storbinary("STOR "+staging,BytesIO(data))
   try:f.rename(staging,remote.name)
   except error_perm:
    f.delete(remote.name);f.rename(staging,remote.name)
   chunks=[]
   f.retrbinary("RETR "+remote.name,chunks.append)
   if hashlib.sha256(b"".join(chunks)).digest()!=hashlib.sha256(data).digest():
    raise RuntimeError("REMOTE_BYTES_MISMATCH "+site+"/"+relative)
  print("UPLOAD_AND_REMOTE_READBACK_PASS",site,len(files),flush=True)
 finally:
  try:f.quit()
  except Exception:f.close()
def public_check(site,config):
 url=config["url"]
 marker=config["marker"]
 for attempt in range(1,5):
  try:
   req=urllib.request.Request(url+"?worldz_deploy_proof="+os.environ.get("GITHUB_SHA","manual"),headers={"Cache-Control":"no-cache","User-Agent":"WorldzDeployProof/1"})
   with urllib.request.urlopen(req,timeout=25) as resp:
    body=resp.read(1500000).decode("utf-8","replace")
    if resp.status!=200 or marker not in body:raise RuntimeError("PUBLIC_MARKER_MISSING status="+str(resp.status))
   print("PUBLIC_CONTENT_PASS",site,url,flush=True)
   return
  except Exception as e:
   print("PUBLIC_CHECK_RETRY",site,attempt,type(e).__name__,str(e)[:180],flush=True)
   if attempt<4:time.sleep(15*attempt)
 raise RuntimeError("PUBLIC_CONTENT_FAILED "+site+" "+url)
def main():
 for site,cfg in SITES.items():
  upload(site,cfg)
  public_check(site,cfg)
 print("WORLDZ_PUBLIC_DEPLOY_VERIFIED=PASS",flush=True)
if __name__=="__main__":main()
