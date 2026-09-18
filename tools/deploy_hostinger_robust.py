#!/usr/bin/env python3
"""Robust Hostinger FTP deployment for the OneWorldz ecosystem.

Deploys each site with a fresh FTPS connection and retries the whole site
independently, preventing one dropped long-lived connection from leaving a
partial ecosystem deployment.
"""
from __future__ import annotations

import os
import ssl
import time
from ftplib import FTP_TLS, error_perm
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
FTP_HOST = os.environ["FTP_HOST"]
FTP_USERNAME = os.environ["FTP_USERNAME"]
FTP_PASSWORD = os.environ["FTP_PASSWORD"]
FTP_PORT = int(os.environ.get("FTP_PORT", "21"))

TARGETS = {
    "oneworldz.com": "domains/oneworldz.com/public_html",
    "cryptoworldz.xyz": "domains/cryptoworldz.xyz/public_html",
    "solworldz.xyz": "domains/solworldz.xyz/public_html",
    "ethworldz.xyz": "domains/ethworldz.xyz/public_html",
    "baseworldz.xyz": "domains/baseworldz.xyz/public_html",
    "bnbworldz.xyz": "domains/bnbworldz.xyz/public_html",
    "xrpworldz.xyz": "domains/xrpworldz.xyz/public_html",
    "suiworldz.xyz": "domains/suiworldz.xyz/public_html",
    "hyperworldz.xyz": "domains/hyperworldz.xyz/public_html",
    "robinworldz.xyz": "domains/robinworldz.xyz/public_html",
    "hodlerworldz.xyz": "domains/hodlerworldz.xyz/public_html",
    "purplediamondcrew.com": "domains/purplediamondcrew.com/public_html",
    "impactbased.oneworldz.com": "domains/oneworldz.com/public_html/impactbased",
    "law.oneworldz.com": "domains/oneworldz.com/public_html/law",
    "learn.oneworldz.com": "domains/oneworldz.com/public_html/learn",
    "hodlergalaxy.xyz": "domains/hodlergalaxy.xyz/public_html",
    "foodworldz.com": "domains/foodworldz.com/public_html",
    "donateworldz.com": "domains/donateworldz.com/public_html",
}

RETIRED_EXPLICIT = {
    "oneworldz.com": [
        "heroes/reagan-kauja",
        "reagan.png",
    ],
    "donateworldz.com": [
        "reagan-children",
        "reagan.png",
    ],
    "foodworldz.com": [
        "reagan.png",
    ],
}


def connect() -> FTP_TLS:
    ftp = FTP_TLS(context=ssl._create_unverified_context())
    ftp.connect(FTP_HOST, FTP_PORT, timeout=45)
    ftp.login(FTP_USERNAME, FTP_PASSWORD)
    ftp.prot_p()
    ftp.set_pasv(True)
    return ftp


def ensure_dir(ftp: FTP_TLS, directory: str) -> None:
    ftp.cwd("/")
    for part in PurePosixPath(directory).parts:
        if part in ("", "/"):
            continue
        try:
            ftp.cwd(part)
        except error_perm:
            ftp.mkd(part)
            ftp.cwd(part)


def remove_tree(ftp: FTP_TLS, path: str) -> None:
    try:
        names = ftp.nlst(path)
    except Exception:
        try:
            ftp.delete(path)
        except Exception:
            pass
        return

    for name in names:
        leaf = name.rstrip("/").split("/")[-1]
        if leaf in (".", ".."):
            continue
        try:
            ftp.delete(name)
        except Exception:
            remove_tree(ftp, name)
    try:
        ftp.rmd(path)
    except Exception:
        pass


def retired_routes() -> dict[str, list[str]]:
    out = {site: [] for site in TARGETS}
    manifest = ROOT / ".retired-generated-routes.txt"
    if not manifest.is_file():
        return out
    for line in manifest.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        host, route = line.split("|", 1)
        if host in out and route:
            out[host].append(route)
    return out


def deploy_site(site: str, remote_root: str, retired: dict[str, list[str]]) -> int:
    files = sorted(p for p in (ROOT / site).rglob("*") if p.is_file())
    last_error = None

    for attempt in range(1, 4):
        ftp = None
        try:
            ftp = connect()

            # Remove generated routes intentionally retired from this site.
            for route in retired.get(site, []):
                remove_tree(ftp, str(PurePosixPath(remote_root) / route))

            # Remove explicit retired files/routes.
            for rel in RETIRED_EXPLICIT.get(site, []):
                remote = str(PurePosixPath(remote_root) / rel)
                remove_tree(ftp, remote)

            uploaded = 0
            for f in files:
                rel = f.relative_to(ROOT / site).as_posix()
                remote = PurePosixPath(remote_root) / rel
                ensure_dir(ftp, str(remote.parent))
                # cwd now points at parent.
                with f.open("rb") as handle:
                    ftp.storbinary(f"STOR {remote.name}", handle, blocksize=262144)
                uploaded += 1

            try:
                ftp.quit()
            except Exception:
                try:
                    ftp.close()
                except Exception:
                    pass

            print(f"DEPLOYED {site} files={uploaded} attempt={attempt}")
            return uploaded

        except Exception as exc:
            last_error = exc
            print(f"DEPLOY_RETRY {site} attempt={attempt} error={type(exc).__name__}: {exc}")
            if ftp is not None:
                try:
                    ftp.close()
                except Exception:
                    pass
            if attempt < 3:
                time.sleep(2 * attempt)

    raise SystemExit(f"HOSTINGER_SITE_DEPLOY_FAILED site={site} error={last_error!r}")


def main() -> None:
    domains = [x.strip() for x in (ROOT / "DOMAINS.txt").read_text(encoding="utf-8").splitlines() if x.strip()]
    assert set(domains) == set(TARGETS), (len(domains), len(TARGETS), sorted(set(domains) ^ set(TARGETS)))

    retired = retired_routes()
    total = 0
    completed = []

    for site, remote_root in TARGETS.items():
        total += deploy_site(site, remote_root, retired)
        completed.append(site)

    assert len(completed) == 18 and len(set(completed)) == 18, completed
    print(f"HOSTINGER_DEPLOY=PASS sites={len(completed)} files={total} fresh_connections=18 site_retries=3")


if __name__ == "__main__":
    main()
