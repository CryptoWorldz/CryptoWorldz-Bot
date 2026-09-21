import base64
import io
import json
import os
import re
import ssl
import sys
import math
import random
import struct
import zlib
import binascii
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


def make_treasury_png():
    w, h = 600, 750
    px = bytearray(w * h * 3)

    def put(x, y, color):
        if 0 <= x < w and 0 <= y < h:
            i = (y * w + x) * 3
            px[i:i+3] = bytes(color)

    # Deep purple/blue space gradient.
    for y in range(h):
        t = y / (h - 1)
        for x in range(w):
            edge = abs(x - w/2) / (w/2)
            r = int(10 + 20*(1-t) + 12*(1-edge))
            g = int(8 + 14*(1-t))
            b = int(35 + 45*(1-t) + 20*(1-edge))
            put(x, y, (min(r,255), min(g,255), min(b,255)))

    rng = random.Random(5801)
    for _ in range(500):
        x, y = rng.randrange(w), rng.randrange(h)
        v = rng.randrange(130, 256)
        put(x, y, (v, v, min(255, v+20)))
        if rng.random() < 0.12:
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                put(x+dx,y+dy,(90,110,200))

    def line(x0,y0,x1,y1,color,width=1):
        dx=abs(x1-x0); sx=1 if x0<x1 else -1
        dy=-abs(y1-y0); sy=1 if y0<y1 else -1
        err=dx+dy
        while True:
            for ox in range(-(width//2), width//2+1):
                for oy in range(-(width//2), width//2+1):
                    put(x0+ox,y0+oy,color)
            if x0==x1 and y0==y1: break
            e2=2*err
            if e2>=dy: err+=dy; x0+=sx
            if e2<=dx: err+=dx; y0+=sy

    def circle(cx,cy,r,color,fill=False,width=2):
        if fill:
            for yy in range(cy-r,cy+r+1):
                yy2=(yy-cy)*(yy-cy)
                span=int(math.sqrt(max(0,r*r-yy2)))
                for xx in range(cx-span,cx+span+1):
                    put(xx,yy,color)
        else:
            steps=max(80,int(2*math.pi*r))
            for k in range(steps):
                a=2*math.pi*k/steps
                x=int(cx+r*math.cos(a)); y=int(cy+r*math.sin(a))
                for ox in range(-width,width+1):
                    put(x+ox,y,color); put(x,y+ox,color)

    # Global network globe.
    cx,cy,gr=300,205,155
    for y in range(cy-gr,cy+gr+1):
        for x in range(cx-gr,cx+gr+1):
            d=math.hypot(x-cx,y-cy)
            if d<=gr:
                glow=max(0.0,1-d/gr)
                put(x,y,(int(20+35*glow),int(45+85*glow),int(105+140*glow)))
    circle(cx,cy,gr,(110,180,255),False,3)
    circle(cx,cy,gr-6,(120,70,255),False,1)
    nodes=[]
    for _ in range(25):
        a=rng.random()*2*math.pi
        rr=gr*math.sqrt(rng.random())*.88
        x=int(cx+math.cos(a)*rr); y=int(cy+math.sin(a)*rr)
        nodes.append((x,y))
    for i,(x,y) in enumerate(nodes):
        x2,y2=nodes[(i*7+5)%len(nodes)]
        line(x,y,x2,y2,(90,110,220),1)
    for x,y in nodes:
        circle(x,y,3,(220,220,255),True)

    # Four chain-energy nodes.
    chain_nodes=[(110,360,(65,245,230)),(490,360,(125,110,255)),(105,565,(100,175,255)),(495,565,(75,210,255))]
    for x,y,col in chain_nodes:
        circle(x,y,43,(25,30,80),True)
        circle(x,y,43,col,False,3)
        circle(x,y,7,col,True)
        line(x-20,y,x+20,y,col,3)
        line(x,y-20,x,y+20,col,3)

    # Operations vault.
    for y in range(350,610):
        for x in range(180,421):
            edge=min(x-180,420-x,y-350,609-y)
            shine=max(0,min(1,edge/28))
            put(x,y,(int(45+45*shine),int(38+35*shine),int(75+65*shine)))
    for x0,y0,x1,y1 in ((180,350,420,350),(420,350,420,610),(420,610,180,610),(180,610,180,350)):
        line(x0,y0,x1,y1,(205,170,255),4)
    circle(300,480,103,(18,18,48),True)
    circle(300,480,103,(220,180,255),False,5)
    circle(300,480,82,(80,70,140),False,3)
    circle(300,480,20,(130,90,255),True)
    line(300,390,300,570,(150,110,255),3)
    line(210,480,390,480,(150,110,255),3)
    for a in range(0,360,45):
        x=int(300+92*math.cos(math.radians(a)))
        y=int(480+92*math.sin(math.radians(a)))
        circle(x,y,5,(235,210,255),True)

    # Energy routes from chains to vault.
    for x,y,_ in chain_nodes:
        line(x,y,300,480,(85,80,220),2)

    # Reserve vault below.
    for y in range(625,720):
        for x in range(225,376):
            put(x,y,(55,45,80))
    circle(300,672,55,(18,18,40),True)
    circle(300,672,55,(240,190,105),False,4)
    circle(300,672,15,(250,205,100),True)
    line(300,620,300,724,(230,180,90),2)

    raw = bytearray()
    stride=w*3
    for y in range(h):
        raw.append(0)
        raw.extend(px[y*stride:(y+1)*stride])

    def chunk(kind,data):
        return struct.pack(">I",len(data))+kind+data+struct.pack(">I",binascii.crc32(kind+data)&0xffffffff)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR",struct.pack(">IIBBBBB",w,h,8,2,0,0,0))
        + chunk(b"IDAT",zlib.compress(bytes(raw),9))
        + chunk(b"IEND",b"")
    )


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
        b'Content-Disposition: form-data; name="photo"; filename="worldz-treasury.png"', crlf,
        b"Content-Type: image/png", crlf, crlf,
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

    image_bytes = make_treasury_png()
    if not image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError("Treasury image did not generate as PNG")
    print("WORLD_SPEAKER_IMAGE=PASS format=png bytes=" + str(len(image_bytes)))

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
