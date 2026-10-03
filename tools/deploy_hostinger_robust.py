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
import secrets
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
    ftp.connect(FTP_HOST, FTP_PORT, timeout=90)
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


def _safe_close(ftp: FTP_TLS | None) -> None:
    if ftp is None:
        return
    try:
        ftp.quit()
    except Exception:
        try:
            ftp.close()
        except Exception:
            pass


def upload_file(site: str, local_root: Path, remote_root: str, local: Path, index: int) -> None:
    rel = local.relative_to(local_root).as_posix()
    remote = PurePosixPath(remote_root) / rel
    last_error = None

    for attempt in range(1, 6):
        ftp = None
        upload_name = None
        try:
            ftp = connect()
            ensure_dir(ftp, str(remote.parent))

            # Use a unique remote staging name so a stale Hostinger
            # .in.<final-name> file cannot block this deployment.
            upload_name = f".worldz-upload-{index}-{attempt}-{secrets.token_hex(4)}-{remote.name}"
            with local.open("rb") as handle:
                ftp.storbinary(f"STOR {upload_name}", handle, blocksize=131072)

            try:
                ftp.rename(upload_name, remote.name)
            except error_perm:
                try:
                    ftp.delete(remote.name)
                except error_perm:
                    pass
                ftp.rename(upload_name, remote.name)

            _safe_close(ftp)
            return
        except Exception as exc:
            last_error = exc
            print(
                f"FILE_RETRY site={site} file={rel} attempt={attempt}/5 "
                f"error={type(exc).__name__}: {exc}"
            )
            _safe_close(ftp)
            if attempt < 5:
                time.sleep(min(20, 3 * attempt))

    raise RuntimeError(
        f"HOSTINGER_FILE_DEPLOY_FAILED site={site} file={rel} error={last_error!r}"
    )


def deploy_site(site: str, remote_root: str, retired: dict[str, list[str]]) -> int:
    local_root = ROOT / site
    files = sorted(p for p in local_root.rglob("*") if p.is_file())

    # Cleanup is isolated from file transfers. A cleanup connection failure
    # retries without forcing already-uploaded files to start again.
    cleanup_error = None
    for attempt in range(1, 4):
        ftp = None
        try:
            ftp = connect()
            for route in retired.get(site, []):
                remove_tree(ftp, str(PurePosixPath(remote_root) / route))
            for rel in RETIRED_EXPLICIT.get(site, []):
                remove_tree(ftp, str(PurePosixPath(remote_root) / rel))
            _safe_close(ftp)
            cleanup_error = None
            break
        except Exception as exc:
            cleanup_error = exc
            print(f"CLEANUP_RETRY {site} attempt={attempt}/3 error={type(exc).__name__}: {exc}")
            _safe_close(ftp)
            if attempt < 3:
                time.sleep(2 * attempt)

    if cleanup_error is not None:
        raise RuntimeError(f"HOSTINGER_CLEANUP_FAILED site={site} error={cleanup_error!r}")

    uploaded = 0
    for index, local in enumerate(files, start=1):
        upload_file(site, local_root, remote_root, local, index)
        uploaded += 1
        if uploaded % 25 == 0:
            print(f"DEPLOY_PROGRESS site={site} uploaded={uploaded}/{len(files)}")

    print(f"DEPLOYED {site} files={uploaded} file_retries=5 atomic_rename=1")
    return uploaded


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
    print(f"HOSTINGER_DEPLOY=PASS sites={len(completed)} files={total} per_file_connections=1 file_retries=5 atomic_rename=1")


if __name__ == "__main__":
    main()
