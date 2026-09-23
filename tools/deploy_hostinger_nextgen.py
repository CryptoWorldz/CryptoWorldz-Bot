#!/usr/bin/env python3
from __future__ import annotations
import os, ssl, time
from ftplib import FTP_TLS, error_perm
from pathlib import Path, PurePosixPath

ROOT=Path(__file__).resolve().parents[1]
FTP_HOST=os.environ["FTP_HOST"]; FTP_USERNAME=os.environ["FTP_USERNAME"]; FTP_PASSWORD=os.environ["FTP_PASSWORD"]
FTP_PORT=int(os.environ.get("FTP_PORT","21"))
TARGETS={
"oneworldz.com":"domains/oneworldz.com/public_html",
"cryptoworldz.xyz":"domains/cryptoworldz.xyz/public_html",
"solworldz.xyz":"domains/solworldz.xyz/public_html",
"ethworldz.xyz":"domains/ethworldz.xyz/public_html",
"baseworldz.xyz":"domains/baseworldz.xyz/public_html",
"bnbworldz.xyz":"domains/bnbworldz.xyz/public_html",
"xrpworldz.xyz":"domains/xrpworldz.xyz/public_html",
"suiworldz.xyz":"domains/suiworldz.xyz/public_html",
"hyperworldz.xyz":"domains/hyperworldz.xyz/public_html",
"robinworldz.xyz":"domains/robinworldz.xyz/public_html",
"hodlerworldz.xyz":"domains/hodlerworldz.xyz/public_html",
"purplediamondcrew.com":"domains/purplediamondcrew.com/public_html",
"impactbased.oneworldz.com":"domains/oneworldz.com/public_html/impactbased",
"law.oneworldz.com":"domains/oneworldz.com/public_html/law",
"learn.oneworldz.com":"domains/oneworldz.com/public_html/learn",
"hodlergalaxy.xyz":"domains/hodlergalaxy.xyz/public_html",
"foodworldz.com":"domains/foodworldz.com/public_html",
"donateworldz.com":"domains/donateworldz.com/public_html",
}
def connect():
    ftp=FTP_TLS(context=ssl._create_unverified_context()); ftp.connect(FTP_HOST,FTP_PORT,timeout=45)
    ftp.login(FTP_USERNAME,FTP_PASSWORD); ftp.prot_p(); ftp.set_pasv(True); return ftp
def ensure_dir(ftp,directory):
    ftp.cwd("/")
    for part in PurePosixPath(directory).parts:
        if part in ("","/"): continue
        try: ftp.cwd(part)
        except error_perm: ftp.mkd(part); ftp.cwd(part)
def deploy_site(site,remote_root):
    files=sorted(p for p in (ROOT/site).rglob("*") if p.is_file())
    last=None
    for attempt in range(1,4):
        ftp=None
        try:
            ftp=connect(); uploaded=0
            for f in files:
                rel=f.relative_to(ROOT/site).as_posix(); remote=PurePosixPath(remote_root)/rel
                ensure_dir(ftp,str(remote.parent))
                with f.open("rb") as h: ftp.storbinary(f"STOR {remote.name}",h,blocksize=262144)
                uploaded+=1
            try: ftp.quit()
            except Exception: ftp.close()
            print(f"NEXTGEN_DEPLOYED {site} files={uploaded} attempt={attempt}")
            return uploaded
        except Exception as e:
            last=e
            print(f"NEXTGEN_DEPLOY_RETRY {site} attempt={attempt} error={type(e).__name__}: {e}")
            if ftp:
                try: ftp.close()
                except Exception: pass
            if attempt<3: time.sleep(attempt*2)
    raise SystemExit(f"NEXTGEN_DEPLOY_FAILED site={site} error={last!r}")
def main():
    domains=[x.strip() for x in (ROOT/"DOMAINS.txt").read_text().splitlines() if x.strip()]
    assert set(domains)==set(TARGETS), sorted(set(domains)^set(TARGETS))
    total=0
    for site,remote in TARGETS.items(): total+=deploy_site(site,remote)
    print(f"WORLDZ_NEXTGEN_HOSTINGER_DEPLOY=PASS sites={len(TARGETS)} files={total}")
if __name__=="__main__": main()
