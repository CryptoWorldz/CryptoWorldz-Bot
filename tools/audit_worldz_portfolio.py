#!/usr/bin/env python3
"""Read-only DNS/TLS/HTTPS report for the canonical Worldz domain registry.

Domain registration alone is never treated as proof of website deployment.
No Hostinger credential, remote filesystem path, database or wallet is touched.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import socket
import ssl
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = ROOT / "ops/worldz-domain-registry.json"


def load_targets(registry_path: Path = DEFAULT_REGISTRY) -> list[dict]:
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    if registry.get("schema_version") != 1:
        raise ValueError("Unsupported domain registry schema")
    result = []
    seen = set()
    for item in registry["domains"]:
        domain = item["domain"].strip().lower()
        if not domain or domain in seen:
            raise ValueError("Empty or duplicate domain: " + domain)
        seen.add(domain)
        if item.get("ownership") == "retired_brand" or item.get("purpose") == "do_not_publish":
            continue
        result.append(item)
    return result


def probe(item: dict) -> dict:
    domain = item["domain"]
    report = {
        "domain": domain,
        "registry_ownership": item.get("ownership", "unknown"),
        "registry_hosting_verified": bool(item.get("hosting_verified")),
        "registry_live_verified": bool(item.get("live_verified")),
        "registry_deploy_enabled": bool(item.get("deploy_enabled")),
        "observed_status": "UNVERIFIED",
    }
    try:
        results = socket.getaddrinfo(domain, 443, type=socket.SOCK_STREAM)
        report["dns_addresses"] = sorted({str(result[4][0]) for result in results})
        if not report["dns_addresses"]:
            raise OSError("DNS_EMPTY_RESPONSE")
    except (socket.gaierror, OSError) as exc:
        report["error_stage"] = "DNS"
        report["reason"] = str(exc)[:180]
        return report

    url = "https://" + domain + "/"
    try:
        request = urllib.request.Request(
            url, headers={"User-Agent": "WorldzPortfolioAudit/1.0", "Cache-Control": "no-cache"}
        )
        with urllib.request.urlopen(request, timeout=12, context=ssl.create_default_context()) as response:
            report["http_status"] = response.status
            report["final_url"] = response.geturl()
            body = response.read(250000).decode("utf-8", errors="replace").lower()
            final_host = (urlparse(response.geturl()).hostname or "").lower()
            report["redirected_to_other_domain"] = final_host not in (domain, "www." + domain)
            report["worldz_brand_marker_present"] = "worldz" in body or "purple diamond" in body
            if response.status == 200 and report["worldz_brand_marker_present"] and not report["redirected_to_other_domain"]:
                report["observed_status"] = "HTTPS_BRANDED_CONTENT"
            elif response.status == 200:
                report["observed_status"] = "HTTP_200_REVIEW_CONTENT"
            else:
                report["observed_status"] = "HTTP_REVIEW"
    except urllib.error.HTTPError as exc:
        report["http_status"] = exc.code
        report["error_stage"] = "HTTP"
        report["reason"] = str(exc)[:180]
    except (urllib.error.URLError, TimeoutError, ssl.SSLError, OSError) as exc:
        report["error_stage"] = "TLS_OR_HTTPS"
        report["reason"] = str(exc)[:180]
    return report


def audit(targets: list[dict]) -> list[dict]:
    with concurrent.futures.ThreadPoolExecutor(max_workers=7) as executor:
        return list(executor.map(probe, targets))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
    parser.add_argument("--output", type=Path, default=Path("worldz-portfolio-health.json"))
    args = parser.parse_args()
    targets = load_targets(args.registry)
    findings = audit(targets)
    counts = {}
    for result in findings:
        status = result["observed_status"]
        counts[status] = counts.get(status, 0) + 1
        print("WORLDZ_SITE_CHECK " + json.dumps(result, sort_keys=True), flush=True)
        if status != "HTTPS_BRANDED_CONTENT":
            print("::warning::Domain requires independent review: " + result["domain"], flush=True)
    report = {
        "schema_version": 1,
        "source": "ops/worldz-domain-registry.json",
        "scope": "public read-only DNS and HTTPS observation; not an infrastructure authorization",
        "total_checked": len(findings),
        "status_counts": counts,
        "results": findings,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("WORLDZ_PORTFOLIO_AUDIT_COMPLETE checked=" + str(len(findings)), flush=True)


if __name__ == "__main__":
    main()
