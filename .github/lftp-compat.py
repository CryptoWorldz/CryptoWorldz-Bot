#!/usr/bin/env python3
"""Minimal lftp-compatible explicit-FTPS transport for OneWorldz deployment scripts.

Supports the exact command subset emitted by the canonical deployment rail:
source, set cmd:fail-exit, cd, lcd, pwd, cls -la, mkdir -p, get -o,
put -o, rm -f and bye.

TLS policy intentionally matches the prior lftp rail: verify the certificate
chain, protect the data channel, and do not enforce hostname matching because
the Hostinger FTP endpoint certificate name is not the deployment hostname.
"""

from __future__ import annotations

import argparse
import ftplib
import os
import shlex
import ssl
import sys
from pathlib import Path

VERSION = "oneworldz-lftp-compat/1.0"


class TransportError(RuntimeError):
    pass


def parse_cli(argv: list[str]):
    if "--version" in argv or "-V" in argv:
        print(VERSION)
        raise SystemExit(0)

    userpass = None
    port = 21
    expression = None
    host = None
    i = 0
    while i < len(argv):
        arg = argv[i]
        if arg == "-u":
            i += 1
            userpass = argv[i]
        elif arg.startswith("-u") and len(arg) > 2:
            userpass = arg[2:]
        elif arg == "-p":
            i += 1
            port = int(argv[i])
        elif arg.startswith("-p") and len(arg) > 2:
            port = int(arg[2:])
        elif arg == "-e":
            i += 1
            expression = argv[i]
        elif arg.startswith("-"):
            # The canonical rail does not use other lftp CLI flags.
            raise TransportError(f"unsupported lftp option: {arg}")
        else:
            host = arg
        i += 1

    if not userpass or host is None or expression is None:
        raise TransportError("expected: lftp -u USER,PASS -p PORT -e 'source FILE' HOST")
    user, sep, password = userpass.partition(",")
    if not sep:
        password = ""
    return user, password, port, expression, host


def connect(host: str, port: int, user: str, password: str) -> ftplib.FTP_TLS:
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_REQUIRED

    ftp = ftplib.FTP_TLS(context=context, timeout=30)
    ftp.connect(host, port)
    ftp.login(user, password)
    ftp.prot_p()
    ftp.set_pasv(True)
    return ftp


def ensure_remote_dir(ftp: ftplib.FTP_TLS, remote: str) -> None:
    if not remote or remote == ".":
        return
    original = ftp.pwd()
    try:
        if remote.startswith("/"):
            ftp.cwd("/")
        parts = [part for part in remote.split("/") if part and part != "."]
        for part in parts:
            if part == "..":
                ftp.cwd("..")
                continue
            try:
                ftp.cwd(part)
            except ftplib.all_errors:
                ftp.mkd(part)
                ftp.cwd(part)
    finally:
        ftp.cwd(original)


def local_path(local_cwd: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else local_cwd / path


def run_script(ftp: ftplib.FTP_TLS, script: Path) -> None:
    fail_exit = True
    local_cwd = Path.cwd()

    for lineno, raw in enumerate(script.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue

        try:
            tokens = shlex.split(line)
            if not tokens:
                continue
            command = tokens[0]

            if command == "set":
                if len(tokens) >= 3 and tokens[1] == "cmd:fail-exit":
                    fail_exit = tokens[2].lower() == "true"
                # All other lftp tuning directives are represented directly by
                # the connection policy/timeouts in this transport.
                continue

            if command == "cd":
                ftp.cwd(tokens[1])
                continue

            if command == "lcd":
                local_cwd = Path(tokens[1])
                continue

            if command == "pwd":
                print(ftp.pwd())
                continue

            if command == "cls":
                ftp.retrlines("LIST", print)
                continue

            if command == "mkdir" and len(tokens) >= 3 and tokens[1] == "-p":
                ensure_remote_dir(ftp, tokens[2])
                continue

            if command == "get":
                remote = tokens[1]
                try:
                    out_index = tokens.index("-o")
                    target = local_path(local_cwd, tokens[out_index + 1])
                except (ValueError, IndexError) as exc:
                    raise TransportError(f"get missing -o target: {line}") from exc
                target.parent.mkdir(parents=True, exist_ok=True)
                try:
                    with target.open("wb") as handle:
                        ftp.retrbinary(f"RETR {remote}", handle.write, blocksize=1024 * 256)
                except Exception:
                    try:
                        target.unlink()
                    except FileNotFoundError:
                        pass
                    raise
                continue

            if command == "put":
                source = local_path(local_cwd, tokens[1])
                try:
                    out_index = tokens.index("-o")
                    remote = tokens[out_index + 1]
                except (ValueError, IndexError) as exc:
                    raise TransportError(f"put missing -o target: {line}") from exc
                parent = str(Path(remote).parent).replace("\\", "/")
                if parent not in ("", "."):
                    ensure_remote_dir(ftp, parent)
                with source.open("rb") as handle:
                    ftp.storbinary(f"STOR {remote}", handle, blocksize=1024 * 256)
                continue

            if command == "rm" and len(tokens) >= 3 and tokens[1] == "-f":
                try:
                    ftp.delete(tokens[2])
                except ftplib.all_errors:
                    if fail_exit:
                        raise
                continue

            if command == "bye":
                return

            raise TransportError(f"unsupported lftp script command: {line}")
        except Exception as exc:
            if fail_exit:
                raise TransportError(f"{script}:{lineno}: {line}: {exc}") from exc
            print(f"FTPS_NONFATAL {script}:{lineno}: {line}: {exc}", file=sys.stderr)


def main(argv: list[str]) -> int:
    try:
        user, password, port, expression, host = parse_cli(argv)
        expression_tokens = shlex.split(expression)
        if len(expression_tokens) != 2 or expression_tokens[0] != "source":
            raise TransportError("only -e 'source FILE' is supported")
        script = Path(expression_tokens[1])
        if not script.is_file():
            raise TransportError(f"source script not found: {script}")

        ftp = connect(host, port, user, password)
        try:
            run_script(ftp, script)
            try:
                ftp.quit()
            except ftplib.all_errors:
                ftp.close()
        finally:
            try:
                ftp.close()
            except Exception:
                pass
        return 0
    except SystemExit:
        raise
    except Exception as exc:
        print(f"FTPS_TRANSPORT_ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
