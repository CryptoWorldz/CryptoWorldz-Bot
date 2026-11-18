#!/usr/bin/env python3
"""Worldz public health: exact-source checks for HQ and NextGen content proof for PDC.

PDC is built and published by nextgen-worldzecosystem.yml, not by the
HQ static uploader. Comparing its dynamic output to the stale, checked-in
purplediamondcrew.com/index.html gives a false deploy-failure diagnosis.
Keep strict HTML source equality for the HQ static pages.
"""
import hashlib
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC_SITES = {
    "https://worldzhq.com/": ("worldzhq.com/index.html", ["/treasury/"]),
    "https://worldzhq.com/treasury/": (
        "worldzhq.com/treasury/index.html", ["What @JayJayTeamDev is building"]
    ),
}
PDC_URL = "https://purplediamondcrew.com/"
PDC_MARKERS = (
    "Purple Diamond Crew",
    "Five-part Purple Diamond Crew experience.",
    "Open Hope Chest",
    "/chest/",
    "/make-a-difference/",
    "/hodlerz-special/",
    "/acknowledgements/",
    "worldz-nextgen.css",
    "data-worldz-nextgen=",
)


def get_live_html(url: str) -> str:
    separator = "&" if "?" in url else "?"
    req = urllib.request.Request(
        url + separator + "worldz_health=" + str(int(time.time())),
        headers={"Cache-Control": "no-cache", "User-Agent": "WorldzPublicHealth/2"},
    )
    with urllib.request.urlopen(req, timeout=18) as resp:
        if resp.status != 200:
            raise RuntimeError("HTTP_" + str(resp.status))
        return resp.read(3000000).decode("utf-8", "replace")


def retry(url: str, validate, label: str) -> None:
    last = None
    for attempt in range(3):
        try:
            validate(get_live_html(url))
            print(label, url, flush=True)
            return
        except Exception as exc:
            last = exc
            print("HEALTH_RETRY", url, attempt + 1, str(exc)[:250], flush=True)
            if attempt < 2:
                time.sleep(10)
    raise RuntimeError("PUBLIC_HEALTH_FAILED " + url + ": " + str(last))


def check_static(url: str, path: str, markers: list[str]) -> None:
    expected = (ROOT / path).read_text(encoding="utf-8")
    for marker in markers:
        if marker not in expected:
            raise RuntimeError("SOURCE_MARKER_MISSING " + path + " " + marker)

    def validate(body: str) -> None:
        for marker in markers:
            if marker not in body:
                raise RuntimeError("LIVE_MARKER_MISSING " + marker)
        if hashlib.sha256(body.encode()).digest() != hashlib.sha256(expected.encode()).digest():
            raise RuntimeError("LIVE_SOURCE_MISMATCH (stale or transformed HTML)")

    retry(url, validate, "PUBLIC_SOURCE_MATCH_PASS")


def validate_nextgen_html(body: str) -> None:
    """A runtime proof, not an assertion that stale checked-in PDC HTML is deployed."""
    for marker in PDC_MARKERS:
        if marker not in body:
            raise RuntimeError("LIVE_NEXTGEN_MARKER_MISSING " + marker)


def main() -> None:
    failures = 0
    for url, (path, markers) in STATIC_SITES.items():
        try:
            check_static(url, path, markers)
        except Exception as exc:
            print("::error::" + str(exc), flush=True)
            failures += 1
    try:
        retry(PDC_URL, validate_nextgen_html, "PUBLIC_NEXTGEN_RUNTIME_PASS")
    except Exception as exc:
        print("::error::" + str(exc), flush=True)
        failures += 1
    print("WORLDZ_PUBLIC_HEALTH=" + ("PASS" if failures == 0 else "FAIL"), flush=True)
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
