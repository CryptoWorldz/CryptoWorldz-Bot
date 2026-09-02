#!/usr/bin/env python3
"""Minimal lftp-compatible explicit-FTPS transport for OneWorldz deployment scripts.

Supports the exact command subset emitted by the canonical deployment rail:
source, set cmd:fail-exit, set net:max-retries, set net:timeout, cd, lcd,
pwd, cls -la, mkdir -p, get -o, put -o, rm -f and bye.

TLS policy intentionally matches the prior lftp rail: verify the certificate
chain, protect the data channel, and do not enforce hostname matching because
the Hostinger FTP endpoint certificate name is not the deployment hostname.
"""

from __future__ import annotations

import ftplib
import shlex
import socket
import ssl
import sys
import time
from pathlib import Path
from typing import Callable, TypeVar

VERSION = "oneworldz-lftp-compat/1.1"
T = TypeVar("T")


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


def connect(
    host: str,
    port: int,
    user: str,
    password: str,
    timeout: int = 30,
) -> ftplib.FTP_TLS:
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_REQUIRED

    ftp = ftplib.FTP_TLS(context=context, timeout=timeout)
    ftp.connect(host, port)
    ftp.login(user, password)
    ftp.prot_p()
    ftp.set_pasv(True)
    return ftp


def is_transient(exc: BaseException) -> bool:
    # An expired or otherwise invalid certificate cannot recover through retry.
    # Fail immediately with the original error so the workflow points to the
    # Hostinger TLS fault instead of wasting time on upload retries.
    if isinstance(exc, ssl.SSLCertVerificationError):
        return False
    if isinstance(
        exc,
        (
            TimeoutError,
            socket.timeout,
            ConnectionError,
            EOFError,
            ssl.SSLError,
            ftplib.error_temp,
        ),
    ):
        return True
    if isinstance(exc, OSError):
        return True
    return False


class Session:
    def __init__(self, host: str, port: int, user: str, password: str):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.timeout = 30
        self.max_retries = 0
        self.remote_cwd = "/"
        self.ftp: ftplib.FTP_TLS | None = None
        self.reconnect()

    def close(self) -> None:
        if self.ftp is None:
            return
        try:
            self.ftp.close()
        except Exception:
            pass
        self.ftp = None

    def reconnect(self) -> None:
        self.close()
        self.ftp = connect(
            self.host,
            self.port,
            self.user,
            self.password,
            timeout=self.timeout,
        )
        if self.remote_cwd not in ("", "/"):
            self.ftp.cwd(self.remote_cwd)

    def current(self) -> ftplib.FTP_TLS:
        if self.ftp is None:
            self.reconnect()
        assert self.ftp is not None
        return self.ftp

    def set_timeout(self, seconds: int) -> None:
        if seconds <= 0:
            raise TransportError("net:timeout must be positive")
        self.timeout = seconds
        ftp = self.ftp
        if ftp is not None:
            ftp.timeout = seconds
            if ftp.sock is not None:
                ftp.sock.settimeout(seconds)

    def set_max_retries(self, retries: int) -> None:
        if retries < 0:
            raise TransportError("net:max-retries must be non-negative")
        self.max_retries = retries

    def retry(self, label: str, operation: Callable[[ftplib.FTP_TLS], T]) -> T:
        attempts = self.max_retries + 1
        last_exc: BaseException | None = None
        for attempt in range(1, attempts + 1):
            if attempt > 1:
                delay = min(2 ** (attempt - 2), 5)
                print(
                    f"FTPS_RETRY operation={label} attempt={attempt}/{attempts} "
                    f"delay={delay}s",
                    file=sys.stderr,
                )
                time.sleep(delay)
                try:
                    self.reconnect()
                except Exception as reconnect_exc:
                    last_exc = reconnect_exc
                    if attempt >= attempts or not is_transient(reconnect_exc):
                        raise
                    continue
            try:
                return operation(self.current())
            except Exception as exc:
                last_exc = exc
                if attempt >= attempts or not is_transient(exc):
                    raise
                self.close()
        assert last_exc is not None
        raise last_exc

    def cwd(self, path: str) -> None:
        def operation(ftp: ftplib.FTP_TLS) -> str:
            ftp.cwd(path)
            return ftp.pwd()

        self.remote_cwd = self.retry(f"cd:{path}", operation)


def ensure_remote_dir(session: Session, remote: str) -> None:
    if not remote or remote == ".":
        return

    def operation(ftp: ftplib.FTP_TLS) -> None:
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
                except ftplib.error_perm as exc:
                    if not str(exc).startswith("550"):
                        raise
                    ftp.mkd(part)
                    ftp.cwd(part)
        finally:
            ftp.cwd(original)

    session.retry(f"mkdir:{remote}", operation)


def local_path(local_cwd: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else local_cwd / path


def run_script(session: Session, script: Path) -> None:
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
                elif len(tokens) >= 3 and tokens[1] == "net:max-retries":
                    session.set_max_retries(int(tokens[2]))
                elif len(tokens) >= 3 and tokens[1] == "net:timeout":
                    session.set_timeout(int(tokens[2]))
                # Other TLS directives are represented directly by connect().
                continue

            if command == "cd":
                session.cwd(tokens[1])
                continue

            if command == "lcd":
                local_cwd = Path(tokens[1])
                continue

            if command == "pwd":
                print(session.retry("pwd", lambda ftp: ftp.pwd()))
                continue

            if command == "cls":
                session.retry("list", lambda ftp: ftp.retrlines("LIST", print))
                continue

            if command == "mkdir" and len(tokens) >= 3 and tokens[1] == "-p":
                ensure_remote_dir(session, tokens[2])
                continue

            if command == "get":
                remote = tokens[1]
                try:
                    out_index = tokens.index("-o")
                    target = local_path(local_cwd, tokens[out_index + 1])
                except (ValueError, IndexError) as exc:
                    raise TransportError(f"get missing -o target: {line}") from exc
                target.parent.mkdir(parents=True, exist_ok=True)

                def download(ftp: ftplib.FTP_TLS) -> None:
                    try:
                        with target.open("wb") as handle:
                            ftp.retrbinary(
                                f"RETR {remote}", handle.write, blocksize=1024 * 256
                            )
                    except Exception:
                        try:
                            target.unlink()
                        except FileNotFoundError:
                            pass
                        raise

                session.retry(f"get:{remote}", download)
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
                    ensure_remote_dir(session, parent)

                def upload(ftp: ftplib.FTP_TLS) -> None:
                    with source.open("rb") as handle:
                        ftp.storbinary(
                            f"STOR {remote}", handle, blocksize=1024 * 256
                        )

                session.retry(f"put:{remote}", upload)
                continue

            if command == "rm" and len(tokens) >= 3 and tokens[1] == "-f":
                remote = tokens[2]
                try:
                    session.retry(f"rm:{remote}", lambda ftp: ftp.delete(remote))
                except ftplib.error_perm as exc:
                    if fail_exit or not str(exc).startswith("550"):
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
    session: Session | None = None
    try:
        user, password, port, expression, host = parse_cli(argv)
        expression_tokens = shlex.split(expression)
        if len(expression_tokens) != 2 or expression_tokens[0] != "source":
            raise TransportError("only -e 'source FILE' is supported")
        script = Path(expression_tokens[1])
        if not script.is_file():
            raise TransportError(f"source script not found: {script}")

        session = Session(host, port, user, password)
        run_script(session, script)
        ftp = session.current()
        try:
            ftp.quit()
        except ftplib.all_errors:
            ftp.close()
        return 0
    except SystemExit:
        raise
    except Exception as exc:
        print(f"FTPS_TRANSPORT_ERROR: {exc}", file=sys.stderr)
        return 1
    finally:
        if session is not None:
            session.close()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
