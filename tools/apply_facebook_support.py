#!/usr/bin/env python3
from pathlib import Path
from html import escape
import shutil

ROOT = Path(__file__).resolve().parents[1]
BUILD = '2026-09-05-dedicated-v2'

# Preserved for future reassignment only. This destination is deliberately not rendered publicly.
RESERVED_FUTURE_SUPPORT_STRIPE = 'https://donate.stripe.com/14A6oHcG61Ox87Y0Xb0kE01'

STREAMS = {
    'davis-family': {
        'title':'Davis Family',
        'intro':'Dedicated Davis Family support pathway.',
        'facebook':'https://www.facebook.com/share/165Ken5f2Bt/',
        'stripe':'https://donate.stripe.com/dRm8wPdKa0Kt2NE7lz0kE03',
    },
    'jayjay-support': {
        'title':'Support JayJayTeamDev',
        'intro':'Voluntary support for the work behind the OneWorldz ecosystem.',
        'facebook':'https://www.facebook.com/share/1FyYhwKP3r/',
        'stripe':'https://buy.stripe.com/6oUeVd9tU0Ktewm0Xb0kE00',
    },
}
COMMUNITY_STRIPE='https://donate.stripe.com/9B67sLgWm78R73U35j0kE02'
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
('Mpagi Davis','https://www.facebook.com/share/18BmqfH7MS/'),
]

def write(rel,text):
    p=ROOT/rel; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(text,encoding='utf-8')

def shell(title, heading, intro, body, nav_extra=''):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><title>{escape(title)}</title><link rel="stylesheet" href="/visual-fix.css"></head><body data-oneworldz-build="{BUILD}"><nav class="nav"><a class="brand" href="/">DonateWorldz</a><a href="https://oneworldz.com">OneWorldz</a>{nav_extra}</nav><main class="shell"><section class="section"><p class="ey">Direct support pathway</p><h1>{escape(heading)}</h1><p>{escape(intro)}</p></section>{body}</main><div class="foot">OneWorldz 🌐 One Vision • Helping the People Who Help People</div></body></html>'''

def fb_card(name,url,note='Facebook destination'):
    return f'<article class="support-card"><h3>{escape(name)}</h3><p>{escape(note)}. Opens directly in Facebook.</p><div class="btns"><a class="btn secondary" href="{escape(url)}" target="_blank" rel="noopener noreferrer">Open Facebook</a></div></article>'

for slug,cfg in STREAMS.items():
    body = f'''<section class="section"><h2>Support directly</h2><p>This page keeps its payment destination separate from the other DonateWorldz purposes.</p><div class="btns"><a class="btn" href="{cfg['stripe']}" target="_blank" rel="noopener noreferrer">Donate securely with Stripe</a><a class="btn secondary" href="{cfg['facebook']}" target="_blank" rel="noopener noreferrer">Open Facebook</a><a class="btn secondary" href="/">All Donation Pages</a></div><p><small>Payment is completed on Stripe. No card details, bank credentials or Stripe secrets are stored on this website.</small></p></section>'''
    write(f'donateworldz.com/{slug}/index.html', shell(f'{cfg["title"]} | DonateWorldz',cfg['title'],cfg['intro'],body,f'<a href="/{slug}/">{escape(cfg["title"])}</a>'))

community_cards=''.join(fb_card(name,url,f'Community destination {i:02d} of 35') for i,(name,url) in enumerate(COMMUNITY,1))
community_body=f'''<section class="section"><h2>Donate to Community Impact</h2><p>A separate Community Impact Stripe destination plus 35 preserved Facebook community destinations.</p><div class="btns"><a class="btn" href="{COMMUNITY_STRIPE}" target="_blank" rel="noopener noreferrer">Donate securely with Stripe</a><a class="btn secondary" href="/">All Donation Pages</a></div></section><section class="section"><h2>35 community destinations</h2><div class="support-grid">{community_cards}</div></section>'''
community_page=shell('Community Impact | DonateWorldz','Community Impact','Thirty-five direct Facebook destinations preserved in their original display order.',community_body,'<a href="/community-impact/">Community Impact</a>')
write('donateworldz.com/community-impact/index.html',community_page)
write('oneworldz.com/community-support/index.html',community_page.replace('href="/"','href="https://donateworldz.com/"',1).replace('<a class="brand" href="/">DonateWorldz</a>','<a class="brand" href="/">OneWorldz</a>',1))

# Ensure retired public routes cannot survive a rebuild.
for retired in [ROOT/'donateworldz.com/reagan-children', ROOT/'oneworldz.com/heroes/reagan-kauja']:
    if retired.exists(): shutil.rmtree(retired)
for retired_file in [ROOT/'donateworldz.com/reagan.png',ROOT/'oneworldz.com/reagan.png',ROOT/'foodworldz.com/reagan.png']:
    if retired_file.exists(): retired_file.unlink()

urls_file=ROOT/'.ecosystem-urls.txt'
urls=[u.strip() for u in urls_file.read_text(encoding='utf-8').splitlines() if u.strip()]
urls=[u for u in urls if '/reagan-children/' not in u.lower() and '/heroes/reagan-kauja/' not in u.lower()]
for u in ['https://donateworldz.com/davis-family/','https://oneworldz.com/community-support/']:
    if u not in urls: urls.append(u)
urls_file.write_text('\n'.join(urls)+'\n',encoding='utf-8')

assert len(COMMUNITY)==35
required={
 'donateworldz.com/davis-family/index.html':STREAMS['davis-family']['stripe'],
 'donateworldz.com/community-impact/index.html':COMMUNITY_STRIPE,
 'donateworldz.com/jayjay-support/index.html':STREAMS['jayjay-support']['stripe'],
}
for rel,stripe in required.items():
    text=(ROOT/rel).read_text(encoding='utf-8')
    assert stripe in text, (rel,'stripe')
    assert '<iframe' not in text.lower(), rel
assert RESERVED_FUTURE_SUPPORT_STRIPE not in (ROOT/'donateworldz.com/index.html').read_text(encoding='utf-8')
assert (ROOT/'donateworldz.com/community-impact/index.html').read_text(encoding='utf-8').count('https://www.facebook.com/share/')==35
assert (ROOT/'oneworldz.com/community-support/index.html').read_text(encoding='utf-8').count('https://www.facebook.com/share/')==35
print('FACEBOOK_SUPPORT=PASS direct_links=35 active_stripe_streams=3 reserved_future_stripe=1 retired_uganda=0 iframes=0')
