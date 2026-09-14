#!/usr/bin/env python3
from pathlib import Path
import base64

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'donateworldz.com/davis-family/index.html'
CHUNKS = ROOT / 'assets-source/davis-family/chunks'
PUBLIC = ROOT / 'donateworldz.com/assets/support/davis-family'
PUBLIC.mkdir(parents=True, exist_ok=True)

MAIN = '/assets/support/davis-family/one-kind-act.webp'
PROFILE = '/assets/support/davis-family/donateworldz-profile.webp'
FACEBOOK = 'https://www.facebook.com/share/165Ken5f2Bt/'
STRIPE = 'https://donate.stripe.com/dRm8wPdKa0Kt2NE7lz0kE03'
BUILD = '2026-09-14-davis-family-final-v4'

parts=[]
for i in range(5):
    raw=(CHUNKS / f'main.{i:02d}').read_text(encoding='utf-8').strip()
    need=6000 if i<4 else 4472
    assert len(raw) >= need, (i,len(raw),need)
    parts.append(raw[:need])
main_b64=''.join(parts)
raw_profile=(CHUNKS / 'profile.00').read_text(encoding='utf-8').strip()
assert len(raw_profile) >= 5952
profile_b64=raw_profile[:5952]
assert len(main_b64)==28472 and len(profile_b64)==5952
main_bytes=base64.b64decode(main_b64,validate=True)
profile_bytes=base64.b64decode(profile_b64,validate=True)
assert len(main_bytes)==21352, len(main_bytes)
assert len(profile_bytes)==4462, len(profile_bytes)
for data in (main_bytes,profile_bytes):
    assert data[:4]==b'RIFF' and data[8:12]==b'WEBP'
(PUBLIC/'one-kind-act.webp').write_bytes(main_bytes)
(PUBLIC/'donateworldz-profile.webp').write_bytes(profile_bytes)

copy='''
<p>Life can change in a moment, and sometimes we all need a helping hand to get through difficult times. This campaign was created to bring together kind-hearted people who believe in hope, compassion, and making a difference.</p>
<p>Every donation, no matter the amount, helps provide support during challenging times and reminds someone that they are not alone. Whether you contribute financially, share this campaign, or keep us in your thoughts and prayers, your support means more than words can express.</p>
<p>Together, we can turn kindness into hope and hope into a brighter future.</p>
<p>Thank you for your generosity, compassion, support</p>
'''
html=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><title>Davis Family | DonateWorldz</title><meta name="description" content="Support the Davis Family through kindness, compassion and hope."><meta property="og:title" content="Davis Family | DonateWorldz"><meta property="og:description" content="One kind act changes everything. Support the Davis Family through DonateWorldz."><meta property="og:image" content="https://donateworldz.com{MAIN}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://donateworldz.com{MAIN}"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/visual-fix.css"><style>:root{{--accent:#a855f7;--accent2:#38bdf8}}.davis-nav{{justify-content:flex-start;gap:12px;overflow:visible}}.davis-home{{display:inline-flex!important;align-items:center;justify-content:center;width:64px;height:64px;padding:0!important;border:1px solid rgba(255,255,255,.22)!important;border-radius:50%!important;overflow:hidden;background:#000!important;box-shadow:0 0 20px rgba(168,85,247,.3)}}.davis-home img{{width:100%;height:100%;object-fit:cover;display:block}}.davis-nav-title{{font-size:1rem;font-weight:900;letter-spacing:.04em}}.davis-shell{{width:min(980px,100%);margin:0 auto}}.davis-hero{{padding:0;background:radial-gradient(circle at 50% 0,rgba(56,189,248,.13),transparent 48%),#05030a}}.davis-main-image{{display:block;width:min(760px,100%);height:auto;margin:0 auto;border-radius:24px;border:1px solid rgba(255,255,255,.18);box-shadow:0 20px 60px rgba(0,0,0,.45),0 0 42px rgba(168,85,247,.16);background:#fff;object-fit:contain}}.davis-title{{text-align:center;margin:22px 0 6px;font-size:clamp(2.1rem,7vw,4.8rem);line-height:.95;letter-spacing:-.03em}}.davis-kicker{{text-align:center;color:#8edbff;font-weight:900;text-transform:uppercase;letter-spacing:.16em;font-size:.78rem}}.davis-story{{font-size:clamp(1rem,2.3vw,1.2rem);line-height:1.72;max-width:800px;margin:0 auto}}.davis-story p{{color:#eeeaf7;margin:0 0 1.05em}}.davis-actions{{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:20px}}.davis-actions .btn{{min-height:54px;text-align:center}}.davis-note{{text-align:center;color:#aaa2b7;font-size:.86rem;margin-top:15px}}@media(max-width:720px){{.davis-home{{width:52px;height:52px;flex:0 0 52px}}.davis-nav-title{{font-size:.9rem}}.davis-shell{{padding:8px}}.davis-main-image{{border-radius:17px}}.davis-actions{{grid-template-columns:1fr}}.davis-story{{line-height:1.62}}}}</style></head><body data-oneworldz-build="{BUILD}"><nav class="nav davis-nav"><a class="davis-home" href="/" aria-label="Return to DonateWorldz home"><img src="{PROFILE}" alt="DonateWorldz" width="128" height="128"></a><a class="davis-nav-title" href="/">DonateWorldz</a><a href="https://oneworldz.com">OneWorldz</a></nav><main class="shell davis-shell"><section class="section davis-hero"><img class="davis-main-image" src="{MAIN}" alt="One Kind Act Changes Everything — Donate, Share, Hope" width="600" height="624" loading="eager" decoding="async" fetchpriority="high"><p class="davis-kicker">Direct support pathway</p><h1 class="davis-title">Davis Family</h1></section><section class="section"><div class="davis-story">{copy}</div><div class="davis-actions"><a class="btn" href="{STRIPE}" target="_blank" rel="noopener noreferrer">Donate securely with Stripe</a><a class="btn secondary" href="{FACEBOOK}" target="_blank" rel="noopener noreferrer">Open Facebook</a><a class="btn secondary" href="/">All Donation Pages</a></div><p class="davis-note">Payment is completed on Stripe. No card details, bank credentials or Stripe secrets are stored on this website.</p></section></main><footer class="footer"><strong>Created with the Vision</strong><br>When Someone say’s You can’t Change the World 🌐 just say “Why can’t I?”<br>Make the Difference • OneWorldz 🌏 One Vision</footer></body></html>'''
PAGE.parent.mkdir(parents=True,exist_ok=True)
PAGE.write_text(html,encoding='utf-8')
text=PAGE.read_text(encoding='utf-8')
assert MAIN in text and PROFILE in text and STRIPE in text and FACEBOOK in text
for phrase in ['Life can change in a moment','Every donation, no matter the amount','Together, we can turn kindness into hope','Thank you for your generosity, compassion, support']:
    assert phrase in text
print('DAVIS_PAGE=PASS image=1 profile_home=1 copy=1 stripe=1 facebook=1 mobile=1')
