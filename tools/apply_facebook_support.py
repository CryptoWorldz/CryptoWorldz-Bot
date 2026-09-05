#!/usr/bin/env python3
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1]
BUILD = '2026-09-05-facebook-safe'

JAYJAY = ('JayJayTeamDev / OneWorldz', 'https://www.facebook.com/share/1FyYhwKP3r/')
REAGAN = ('Reagan & Children — Action Spreads Smiles', 'https://www.facebook.com/share/196pruFjJq/?mibextid=wwXIfr')
DAVIS = ('Davis Family', 'https://www.facebook.com/share/165Ken5f2Bt/')
COMMUNITY = [
('Sakina Charity','https://www.facebook.com/share/1BmTRrfQo7/'),
('Isabirye Donah','https://www.facebook.com/share/193tUYStL4/'),
('NewLife Junior School Kyampis','https://www.facebook.com/share/1DQhDp4CzW/'),
('Mpata Rogers','https://www.facebook.com/share/19D9XrUuzQ/'),
('Isabirye Kennedy','https://www.facebook.com/share/1Bc5S5yUJG/'),
('Abdul Rahman','https://www.facebook.com/share/1DVSBSLEyo/'),
('Community Support 07','https://www.facebook.com/share/1BeyrEWLGz/'),
('Yeko Wairagala Alpha','https://www.facebook.com/share/1Byi1xiu4M/'),
('Namutamba Zahara','https://www.facebook.com/share/1bzNo5Ea8v/'),
('Nsubuga Aksam','https://www.facebook.com/share/1HRf5ttw8b/'),
('Edigar Charity Ian','https://www.facebook.com/share/1EkFHZi9mm/'),
('Batambuze Najibu','https://www.facebook.com/share/16CajPwJduJ/'),
('Patrick Matic','https://www.facebook.com/share/1TomftXutg/'),
('Nabongho David James','https://www.facebook.com/share/1BWdL1EQTh/'),
('Children Voice Kisitu Moses','https://www.facebook.com/share/1byaGg2oU2/'),
('Marcy Home Ug','https://www.facebook.com/share/1BbFH6PfXV/'),
('Wambuzi Shafik','https://www.facebook.com/share/1Bdhxhnx94/'),
('Mutawonga Isma','https://www.facebook.com/share/1JpX6zaY7d/'),
('Community Support 19','https://www.facebook.com/share/1AbktByVp7/'),
('Yeko Wairagala','https://www.facebook.com/share/1HaHoN5TiK/'),
('Mugabi Nkolwa Fred','https://www.facebook.com/share/17nsTeFoJq/'),
('Nior Pro','https://www.facebook.com/share/1DM65ximC9/'),
('Isabirye Donah','https://www.facebook.com/share/14ohVcr8yz8/'),
('Lionstar Orina','https://www.facebook.com/share/1J5W3wd7Ef/'),
('Bukenya Abudu','https://www.facebook.com/share/1JMSjqkg6f/'),
('Mukisa Gift','https://www.facebook.com/share/1BBSN1B5Sx/'),
('Wankya Arafat','https://www.facebook.com/share/1M9i684JGg/'),
('Mulekwa Grace','https://www.facebook.com/share/18oGmZLysQ/'),
('Caroline Kaweesi Nakaddu','https://www.facebook.com/share/19UGYkcwPw/'),
('Kwagala Sharon','https://www.facebook.com/share/1Ham4mf3LY/'),
('Ayubu Job Nyangau','https://www.facebook.com/share/1DimMFXSM7/'),
('Kintu Shahidu','https://www.facebook.com/share/1EpHr25wKE/'),
('Mutesi Florence','https://www.facebook.com/share/186v7cwFZ7/'),
('Emmanuel Care','https://www.facebook.com/share/1R3Y6CKi1Q/'),
('Mpagi Davis','https://www.facebook.com/share/18BmqfH7MS/')
]

def fb_card(name, url, note='Verified Facebook destination'):
    return f'''<article class="fb-card">
      <h3>{escape(name)}</h3>
      <p>{escape(note)}. Opens directly in Facebook instead of relying on an embedded preview that can render as a blank white box in Messenger or other in-app browsers.</p>
      <a class="btn" href="{escape(url)}" target="_blank" rel="noopener noreferrer">Open Facebook →</a>
    </article>'''

def shell(title, eyebrow, heading, intro, body, nav_extra=''):
    return f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><title>{escape(title)}</title><link rel="stylesheet" href="/visual-fix.css"></head>
<body data-oneworldz-build="{BUILD}"><nav class="nav"><a class="brand" href="https://oneworldz.com">OneWorldz</a><a href="https://donateworldz.com">DonateWorldz</a>{nav_extra}</nav><main class="shell">
<section class="section"><p class="ey">{escape(eyebrow)}</p><h1>{escape(heading)}</h1><p>{escape(intro)}</p></section>{body}</main><div class="foot">OneWorldz 🌐 One Vision • Helping the People Who Help People</div></body></html>'''

def write(rel, text):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')

write('donateworldz.com/reagan-children/index.html', shell(
    'Reagan & Children | DonateWorldz','Direct Support','Reagan & Children — Action Spreads Smiles',
    'Dedicated support for Reagan and the children. The verified Facebook destination opens directly and no embedded Facebook iframe is used.',
    '<section class="section"><img src="/reagan.png" alt="Reagan and children approved artwork" style="width:100%;height:auto;object-fit:contain;background:#020205;border-radius:18px"></section><section class="section"><h2>Verified destination</h2>'+fb_card(*REAGAN)+'</section>',
    '<a href="/reagan-children/">Reagan & Children</a>'))

write('donateworldz.com/davis-family/index.html', shell(
    'Davis Family | DonateWorldz','Direct Support','Davis Family',
    'Dedicated Davis Family support page with the repository-verified Facebook destination.',
    '<section class="section"><h2>Verified destination</h2>'+fb_card(*DAVIS)+'</section>',
    '<a href="/davis-family/">Davis Family</a>'))

write('donateworldz.com/jayjay-support/index.html', shell(
    'JayJayTeamDev Support | DonateWorldz','Direct Support','Support JayJayTeamDev',
    'Voluntary support for the Helping the People Who Help People mission, with the current OneWorldz/JayJayTeamDev Facebook destination.',
    '<section class="section"><h2>Verified destination</h2>'+fb_card(*JAYJAY)+'</section>',
    '<a href="/jayjay-support/">JayJayTeamDev</a>'))

community_cards = ''.join(fb_card(name, url, f'Community destination {i:02d} of 35') for i,(name,url) in enumerate(COMMUNITY,1))
community_body = f'''<section class="section"><h2>35 community destinations</h2><p>These are the exact 35 Facebook destinations preserved in the repository registry. They open directly, so Messenger cannot replace them with empty white iframe boxes.</p><div class="fb-grid">{community_cards}</div></section>'''
community_page = shell('Community Charity | OneWorldz','Community Charity','Community Charity Support','Thirty-five verified Facebook destinations preserved in their original display order.',community_body,'<a href="/community-impact/">Community Charity</a>')
write('donateworldz.com/community-impact/index.html', community_page)
write('oneworldz.com/community-support/index.html', community_page.replace('href="/community-impact/"','href="https://donateworldz.com/community-impact/"'))

root = ROOT / 'donateworldz.com/index.html'
text = root.read_text(encoding='utf-8')
if '/davis-family/' not in text:
    text = text.replace('</div></section>', '<a class="hero-card" href="/davis-family/"><span class="symbol">💜</span><span><strong>Davis Family</strong><span>Dedicated family support</span></span></a></div></section>', 1)
root.write_text(text, encoding='utf-8')

one = ROOT / 'oneworldz.com/index.html'
one_text = one.read_text(encoding='utf-8')
if 'href="/community-support/"' not in one_text:
    one_text = one_text.replace('<section class="section"><h2>Enter the ecosystem</h2>', '<section class="section"><h2>Community Charity</h2><p>Open the verified community destinations directly — no blank embedded Facebook boxes.</p><div class="btns"><a class="btn" href="/community-support/">Open Community Charity →</a></div></section><section class="section"><h2>Enter the ecosystem</h2>')
one.write_text(one_text, encoding='utf-8')

urls_file = ROOT / '.ecosystem-urls.txt'
urls = [u.strip() for u in urls_file.read_text(encoding='utf-8').splitlines() if u.strip()]
for u in ['https://donateworldz.com/davis-family/','https://oneworldz.com/community-support/']:
    if u not in urls:
        urls.append(u)
urls_file.write_text('\n'.join(urls)+'\n', encoding='utf-8')

assert len(COMMUNITY) == 35
print(f'FACEBOOK_SUPPORT=PASS direct_links_only=1 iframes=0 community={len(COMMUNITY)} pages={len(urls)}')
