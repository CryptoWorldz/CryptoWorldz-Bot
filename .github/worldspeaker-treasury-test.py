import base64
import io
import json
import os
import re
import ssl
import sys
import urllib.parse
import urllib.request
import urllib.error
import uuid
from ftplib import FTP_TLS

ROOT = "https://cryptobotz.cryptoworldz.xyz"
TARGETS = [
    (-1003732353996, "CryptoWorldz HQ"),
    (-1004404927235, "CryptoWorldz Command Centre"),
]

MESSAGE = """TEAM — WORLDZ TREASURY UPDATE 🔐🌍

We’ve now locked in the new WorldzLaunchPad™ Treasury structure.

Operations Treasury
• 10 authorised signers
• 5-of-10 approvals required

Reserve Treasury
• 9 authorised signers
• 6-of-9 approvals required
• We will never require more than 6 signatures

This structure will be used across:
• Solana — Squads
• Ethereum / Base / BNB / HyperEVM — Safe
• XRP Ledger — native XRPL multisig
• Sui — native Sui multisig

The Operations Treasury will receive the WorldzLaunchPad™ 10% share of collected supported trading-fee revenue.

IMPORTANT:

I now need each Treasury team member to send me their PUBLIC wallet addresses only.

Please send:

SOL:
"Your Solana public address"

EVM:
"Your Ethereum / Base / BNB public address"

XRPL:
"Your XRP Ledger public address"

SUI:
"Your Sui public address"

🚨 NEVER send your seed phrase, recovery phrase, private key or password.

Public wallet addresses ONLY.

Our current Solana Team Zed Treasury is already verified as a 2-of-3 Squads multisig.

The next step is upgrading it toward the new 5-of-10 Worldz Treasury standard through proper on-chain approvals.

Once the signer addresses are registered, we can build and verify the Treasury wallets chain by chain.

WorldzLaunchPad™
5-of-10 Operations
6-of-9 Reserve

One World • One Mission 💜🌍"""


def recover_token():
    host = os.environ["FTP_HOST"].replace("ftps://", "").replace("ftp://", "").split("/")[0]
    if host.count(":") == 1:
        host = host.split(":", 1)[0]
    ftp = FTP_TLS(context=ssl._create_unverified_context())
    ftp.connect(host, int(os.environ.get("FTP_PORT", "21")), timeout=45)
    ftp.login(os.environ["FTP_USERNAME"], os.environ["FTP_PASSWORD"])
    ftp.prot_p()
    buf = io.BytesIO()
    ftp.retrbinary("RETR /domains/cryptobotz.cryptoworldz.xyz/nodejs/.env", buf.write)
    ftp.quit()

    env = {}
    for raw in buf.getvalue().decode("utf-8", "ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = re.sub(r"^export\s+", "", k).strip()
        v = v.strip().strip('"').strip("'")
        if v:
            env[k] = v

    for key in ("BOT_TOKEN", "TELEGRAM_BOT_TOKEN", "TELEGRAM_TOKEN", "ZED_BOT_TOKEN", "CRYPTOWORLDZ_BOT_TOKEN"):
        token = str(env.get(key, "")).strip()
        if not token:
            continue
        try:
            data = get_json("https://api.telegram.org/bot" + token + "/getMe")
            if data.get("ok") is True:
                return token, data.get("result", {}).get("username", "")
        except Exception:
            pass
    raise RuntimeError("No valid active ZED Telegram token found in protected runtime")


def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "WorldSpeaker-Proof/2.0", "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def post_urlencoded(url, fields):
    body = urllib.parse.urlencode(fields).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "WorldSpeaker-Proof/2.0"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode("utf-8"))


def post_photo(url, chat_id, image_bytes, caption):
    boundary = "----WorldSpeaker" + uuid.uuid4().hex
    crlf = b"\r\n"
    chunks = []

    def field(name, value):
        chunks.extend([
            ("--" + boundary).encode(), crlf,
            f'Content-Disposition: form-data; name="{name}"'.encode(), crlf, crlf,
            str(value).encode("utf-8"), crlf
        ])

    field("chat_id", chat_id)
    field("caption", caption)
    chunks.extend([
        ("--" + boundary).encode(), crlf,
        b'Content-Disposition: form-data; name="photo"; filename="worldz-treasury.jpg"', crlf,
        b"Content-Type: image/jpeg", crlf, crlf,
        image_bytes, crlf,
        ("--" + boundary + "--").encode(), crlf
    ])
    body = b"".join(chunks)
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "multipart/form-data; boundary=" + boundary,
            "Content-Length": str(len(body)),
            "User-Agent": "WorldSpeaker-Proof/2.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "ignore")
        raise RuntimeError(f"Telegram sendPhoto HTTP {e.code}: {detail}") from e


def probe_text(path):
    try:
        req = urllib.request.Request(ROOT + path, headers={"User-Agent": "WorldSpeaker-Proof/2.0", "Cache-Control": "no-cache"})
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, r.read().decode("utf-8", "ignore")
    except Exception as e:
        return 0, repr(e)


def main():
    token, username = recover_token()
    print("::add-mask::" + token)
    print("WORLD_SPEAKER_BOT_TOKEN=PASS")
    print("WORLD_SPEAKER_BOT_USERNAME=" + username)

    with open(".github/worldspeaker-treasury-image.b64", "rt", encoding="ascii") as f:
        image_bytes = base64.b64decode(f.read())
    if not image_bytes.startswith(b"\xff\xd8\xff"):
        raise RuntimeError("Treasury image did not decode as JPEG")
    print("WORLD_SPEAKER_IMAGE=PASS bytes=" + str(len(image_bytes)))

    api = "https://api.telegram.org/bot" + token + "/"
    deliveries = []
    for chat_id, label in TARGETS:
        photo = post_photo(api + "sendPhoto", chat_id, image_bytes, "WorldzLaunchPad™ Treasury — WorldSpeaker 📡")
        if photo.get("ok") is not True:
            raise RuntimeError("Photo send failed for " + label + ": " + str(photo)[:300])
        photo_id = photo["result"]["message_id"]

        msg = post_urlencoded(api + "sendMessage", {
            "chat_id": str(chat_id),
            "text": MESSAGE,
            "disable_web_page_preview": "true",
        })
        if msg.get("ok") is not True:
            raise RuntimeError("Message send failed for " + label + ": " + str(msg)[:300])
        msg_id = msg["result"]["message_id"]
        deliveries.append((label, photo_id, msg_id))
        print(f"WORLD_SPEAKER_DELIVERY=PASS target={label} photo_message_id={photo_id} text_message_id={msg_id}")

    hook = get_json(api + "getWebhookInfo")
    info = hook.get("result", {}) if hook.get("ok") else {}
    print("ZED_TELEGRAM_WEBHOOK_URL=" + str(info.get("url", "")))
    print("ZED_TELEGRAM_WEBHOOK_PENDING=" + str(info.get("pending_update_count", 0)))
    print("ZED_TELEGRAM_WEBHOOK_LAST_ERROR=" + ("YES" if info.get("last_error_message") else "NO"))

    root_code, root = probe_text("/")
    health_code, health = probe_text("/health")
    mini_code, mini = probe_text("/miniapp/")
    service_identity = '"service":"CryptoWorldz Zed Bot"' in root
    health_ok = '"ok":true' in health.replace(" ", "")
    max_ui = 'Command Centre <span>MAX™</span>' in mini
    print(
        "ZED_RUNTIME_PROBE "
        f"root_http={root_code} health_http={health_code} mini_http={mini_code} "
        f"service_identity={int(service_identity)} health_ok={int(health_ok)} max_ui={int(max_ui)}"
    )

    if health_code != 200 or not health_ok:
        raise RuntimeError("ZED health proof failed")
    if mini_code != 200 or not max_ui:
        raise RuntimeError("Command Centre MAX static proof failed")

    print("WORLD_SPEAKER_TEAM_SEND=PASS targets=2")
    print("ZED_COMMAND_CENTRE_MAX_RUNTIME=" + ("PASS" if service_identity else "PARTIAL_SERVICE_IDENTITY_MISMATCH"))


if __name__ == "__main__":
    main()
