#!/usr/bin/env python3
"""Fail fast on the FTPS certificate before any production release work."""

from __future__ import annotations

import ftplib
import os
import socket
import ssl
import sys


def main() -> int:
    host = os.environ.get("FTP_HOST", "").replace("ftps://", "").replace("ftp://", "").split("/", 1)[0].split(":", 1)[0]
    port = int(os.environ.get("FTP_PORT", "21"))
    if not host:
        raise SystemExit("FTPS_PREFLIGHT=FAIL reason=FTP_HOST_MISSING")

    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_REQUIRED
    ftp = ftplib.FTP_TLS(context=context, timeout=20)
    try:
        ftp.connect(host, port)
        ftp.auth()
        certificate = ftp.sock.getpeercert() if ftp.sock else {}
        expiry = certificate.get("notAfter", "unknown")
        print(f"FTPS_PREFLIGHT=PASS host={host} port={port} certificate_not_after={expiry}")
        return 0
    except ssl.SSLCertVerificationError as error:
        print("FTPS_PREFLIGHT=FAIL reason=CERTIFICATE_VALIDATION", file=sys.stderr)
        print(f"FTPS_PREFLIGHT_DETAIL={error}", file=sys.stderr)
        print("ACTION_REQUIRED=Renew or repair the Hostinger FTPS certificate; TLS verification remains enabled.", file=sys.stderr)
        return 2
    except (OSError, socket.timeout, ftplib.Error, ssl.SSLError) as error:
        print(f"FTPS_PREFLIGHT=FAIL reason=CONNECTION detail={error}", file=sys.stderr)
        return 3
    finally:
        try:
            ftp.close()
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
