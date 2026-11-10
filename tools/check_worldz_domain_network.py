#!/usr/bin/env python3
"""Read-only DNS, TLS and HTTPS diagnostics for Worldz hosting; no credentials required."""
import json
import socket
import ssl
import urllib.request
from datetime import datetime, timezone

SITES = {
    "worldzhq.com": "worldz",
    "worldz.live": "woodstock revival",
    "worldz.online": "worldz community",
    "worldz.site": "worldz business builder",
    "worldz.store": "worldz marketplace",
    "worldz.space": "worldz innovation lab",
    "worldz.website": "worldz website network",
}
results = {}
for host, marker in SITES.items():
    row = {"dns": "UNVERIFIED", "tls": "UNVERIFIED", "https": "UNVERIFIED", "content": "UNVERIFIED"}
    try:
        addresses = sorted({info[4][0] for info in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)})
        row["dns"] = {"status": "PASS", "addresses": addresses}
    except Exception as exc:
        row["dns"] = {"status": "FAIL", "error": type(exc).__name__ + ": " + str(exc)}
        results[host] = row
        continue
    try:
        with socket.create_connection((host, 443), timeout=8) as sock:
            with ssl.create_default_context().wrap_socket(sock, server_hostname=host) as secured:
                cert = secured.getpeercert()
                row["tls"] = {"status": "PASS", "issuer": str(cert.get("issuer")), "expires": cert.get("notAfter")}
    except Exception as exc:
        row["tls"] = {"status": "FAIL", "error": type(exc).__name__ + ": " + str(exc)}
        results[host] = row
        continue
    try:
        request = urllib.request.Request("https://" + host + "/", headers={"User-Agent": "Worldz-ReadOnly-Deployment-Diagnostic/1.0"})
        with urllib.request.urlopen(request, timeout=12) as response:
            body = response.read(200000).decode("utf-8", "replace").lower()
            row["https"] = {"status": "PASS" if response.status == 200 else "FAIL", "http_status": response.status}
            row["content"] = {"status": "PASS" if marker in body and "<html" in body else "FAIL", "required_marker": marker}
    except Exception as exc:
        row["https"] = {"status": "FAIL", "error": type(exc).__name__ + ": " + str(exc)}
    results[host] = row
print(json.dumps({"checked_at": datetime.now(timezone.utc).isoformat(), "sites": results}, indent=2))
