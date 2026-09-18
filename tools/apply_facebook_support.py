#!/usr/bin/env python3
from pathlib import Path
from html import escape
import shutil

ROOT = Path(__file__).resolve().parents[1]
BUILD = '2026-09-18-slice-of-hope-v1'

# Reassigned from the previously reserved future-support slot to Slice of Hope Australia.
SLICE_OF_HOPE_STRIPE = 'https://donate.stripe.com/14A6oHcG61Ox87Y0Xb0kE01'
DAVIS_HERO_JPG = '/assets/support/davis-family/davis-family-hero.jpg'
DAVIS_HERO_WEBP = '/assets/support/davis-family/davis-family-hero.webp'

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

def shell(title, heading, intro, body, nav_extra='', hero_jpg=None, hero_webp=None):
    hero = ''
    social = ''
    if hero_jpg:
        webp = f'<source srcset="{escape(hero_webp)}" type="image/webp">' if hero_webp else ''
        hero = f'''<section class="hero"><div class="hero-grid"><picture>{webp}<img class="hero-art" src="{escape(hero_jpg)}" alt="Help the Davis Family — OneWorldz One Vision" width="1536" height="864" loading="eager" decoding="async" fetchpriority="high"></picture><div class="hero-copy"><p class="eyebrow">Direct support pathway</p><h1>{escape(heading)}</h1><p>{escape(intro)}</p></div></div></section>'''
        social = f'''<meta property="og:image" content="https://donateworldz.com{escape(hero_jpg)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://donateworldz.com{escape(hero_jpg)}">'''
    else:
        hero = f'''<section class="section"><p class="eyebrow">Direct support pathway</p><h1 class="big-title">{escape(heading)}</h1><p>{escape(intro)}</p></section>'''
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><title>{escape(title)}</title><meta name="description" content="{escape(intro)}"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/visual-fix.css"><style>:root{{--accent:#a855f7;--accent2:#38bdf8}}</style>{social}</head><body data-oneworldz-build="{BUILD}"><nav class="nav"><a class="brand" href="/">DonateWorldz</a><a href="https://oneworldz.com">OneWorldz</a>{nav_extra}</nav><main class="shell">{hero}{body}</main><footer class="footer"><strong>Created with the Vision</strong><br>When Someone say’s You can’t Change the World 🌐 just say “Why can’t I?”<br>Make the Difference • OneWorldz 🌏 One Vision</footer></body></html>'''

def fb_card(name,url,note='Facebook destination'):
    return f'<article class="support-card"><h3>{escape(name)}</h3><p>{escape(note)}. Opens directly in Facebook.</p><div class="btns"><a class="btn secondary" href="{escape(url)}" target="_blank" rel="noopener noreferrer">Open Facebook</a></div></article>'

for slug,cfg in STREAMS.items():
    body = f'''<section class="section"><h2>Support directly</h2><p>This page keeps its payment destination separate from the other DonateWorldz purposes.</p><div class="btns"><a class="btn" href="{cfg['stripe']}" target="_blank" rel="noopener noreferrer">Donate securely with Stripe</a><a class="btn secondary" href="{cfg['facebook']}" target="_blank" rel="noopener noreferrer">Open Facebook</a><a class="btn secondary" href="/">All Donation Pages</a></div><p><small>Payment is completed on Stripe. No card details, bank credentials or Stripe secrets are stored on this website.</small></p></section>'''
    is_davis = slug == 'davis-family'
    write(
        f'donateworldz.com/{slug}/index.html',
        shell(
            f'{cfg["title"]} | DonateWorldz', cfg['title'], cfg['intro'], body,
            f'<a href="/{slug}/">{escape(cfg["title"])}</a>',
            DAVIS_HERO_JPG if is_davis else None,
            DAVIS_HERO_WEBP if is_davis else None,
        )
    )

SLICE_BODY = f'''<section class="section"><p class="eyebrow">OneWorldz • DonateWorldz • Community Food Outreach</p><h2>Every Slice Can Make a Difference</h2><p><strong>Slice of Hope Australia 🍕🌏🦘</strong> is a community pizza and food outreach beginning in Dubbo NSW, with the goal of helping people who are homeless, doing it tough, or simply need a welcoming meal and connection.</p><p><strong>JayJayTeamDev fully supports this initiative and will do everything in his power to use every cent donated through this campaign toward buying pizzas and food for community outreach.</strong></p></section><section class="section"><h2>Dubbo pilot idea</h2><p>The proposed local model is a Thursday or Friday community pizza night from around 4pm, supported by OneWorldz, DonateWorldz, local volunteers and community connections such as Help a Mate. Possible community locations include Jay's Safe Place or the Church Street Rotunda, subject to local permissions and practical arrangements.</p><p>If a future partnership is approved, the vision is for hot pizzas to be delivered in waves during the evening, with a dedicated outreach presence helping volunteers connect with people respectfully.</p></section><section class="section"><h2>Donate to Slice of Hope Australia</h2><p>This campaign uses the dedicated payment pathway now assigned to Slice of Hope Australia. The existing dedicated bank-account pathway is also assigned to this campaign; bank credentials are intentionally not published on this website.</p><div class="btns"><a class="btn" href="{SLICE_OF_HOPE_STRIPE}" target="_blank" rel="noopener noreferrer">Donate securely with Stripe</a><a class="btn secondary" href="https://oneworldz.com" target="_blank" rel="noopener noreferrer">Visit OneWorldz</a><a class="btn secondary" href="/">All Donation Pages</a></div><p><small>Payment is completed on Stripe. No card details, bank credentials or Stripe secrets are stored on DonateWorldz.</small></p></section><section class="section"><h2>Pizza Hut Australia partnership invitation</h2><p>OneWorldz would like to invite Pizza Hut Australia to explore becoming a national support partner for Slice of Hope Australia. This is currently a proposal only. Pizza Hut Australia has not yet approved, endorsed or sponsored this campaign, and any Pizza Hut purchases made before an agreement are ordinary customer purchases.</p></section>'''
write('donateworldz.com/slice-of-hope-australia/index.html', shell('Slice of Hope Australia | DonateWorldz','Slice of Hope Australia 🍕🌏🦘','Community pizza and food outreach beginning in Dubbo NSW, with a vision to grow across Australia.',SLICE_BODY,'<a href="/slice-of-hope-australia/">Slice of Hope Australia</a>'))

# Make the former reserved home-page position an active Slice of Hope pathway.
home = ROOT/'donateworldz.com/index.html'
home.write_text(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><title>DonateWorldz | Make the Difference</title><meta name="description" content="Choose a dedicated OneWorldz support pathway."><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/visual-fix.css"><style>:root{{--accent:#a855f7;--accent2:#38bdf8}}.donate-path{{min-height:190px;justify-content:center}}.donate-path b{{font-size:1.25rem}}.slice{{border-color:#a855f7;background:linear-gradient(145deg,#2b123d,#0c0912)}}</style></head><body data-oneworldz-build="{BUILD}"><nav class="nav"><a class="brand" href="/">DonateWorldz</a><a href="https://oneworldz.com">OneWorldz</a><a href="/slice-of-hope-australia/">Slice of Hope</a><a href="/davis-family/">Davis Family</a><a href="/community-impact/">Community Impact</a><a href="/jayjay-support/">JayJayTeamDev</a></nav><main class="shell"><section class="section"><p class="eyebrow">Give clearly • Support directly</p><h1 class="big-title">Make the Difference</h1><p>Choose where your support goes. Each DonateWorldz pathway has a separate purpose and destination.</p><div class="grid2"><a class="card donate-path slice" href="/slice-of-hope-australia/"><b>Slice of Hope Australia 🍕🌏🦘</b><span>Community pizza and food outreach beginning in Dubbo, with a vision to grow across Australia.</span><i>OPEN DONATION PAGE →</i></a><a class="card donate-path" href="/davis-family/"><b>Davis Family</b><span>Dedicated family support.</span><i>OPEN DONATION PAGE →</i></a><a class="card donate-path" href="/community-impact/"><b>Community Impact</b><span>A separate community support stream plus direct community destinations.</span><i>OPEN DONATION PAGE →</i></a><a class="card donate-path" href="/jayjay-support/"><b>Support JayJayTeamDev</b><span>Support the work behind the OneWorldz ecosystem.</span><i>OPEN DONATION PAGE →</i></a></div></section></main><footer class="footer"><strong>Created with the Vision</strong><br>When Someone say’s You can’t Change the World 🌐 just say “Why can’t I?”<br>Make the Difference • OneWorldz 🌏 One Vision</footer></body></html>''',encoding='utf-8')

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
for u in ['https://donateworldz.com/slice-of-hope-australia/','https://donateworldz.com/davis-family/','https://oneworldz.com/community-support/']:
    if u not in urls: urls.append(u)
urls_file.write_text('\n'.join(urls)+'\n',encoding='utf-8')
sitemap=ROOT/'donateworldz.com/sitemap.xml'
slice_url='https://donateworldz.com/slice-of-hope-australia/'
if sitemap.is_file():
    sitemap_text=sitemap.read_text(encoding='utf-8')
    if slice_url not in sitemap_text:
        sitemap_text=sitemap_text.replace('</urlset>',f'  <url><loc>{slice_url}</loc></url>\n</urlset>')
        sitemap.write_text(sitemap_text,encoding='utf-8')

assert len(COMMUNITY)==35
required={
 'donateworldz.com/slice-of-hope-australia/index.html':SLICE_OF_HOPE_STRIPE,
 'donateworldz.com/davis-family/index.html':STREAMS['davis-family']['stripe'],
 'donateworldz.com/community-impact/index.html':COMMUNITY_STRIPE,
 'donateworldz.com/jayjay-support/index.html':STREAMS['jayjay-support']['stripe'],
}
for rel,stripe in required.items():
    text=(ROOT/rel).read_text(encoding='utf-8')
    assert stripe in text, (rel,'stripe')
    assert '<iframe' not in text.lower(), rel
    assert 'href="/style.css"' in text and 'href="/visual-fix.css"' in text, (rel,'styles')
    assert 'class="footer"' in text and 'class="eyebrow"' in text, (rel,'visual-shell')
for asset in [
    ROOT/'donateworldz.com/assets/support/davis-family/davis-family-hero.jpg',
    ROOT/'donateworldz.com/assets/support/davis-family/davis-family-hero.webp',
]:
    assert asset.is_file() and asset.stat().st_size > 10000, (asset,'approved-davis-hero')
davis=(ROOT/'donateworldz.com/davis-family/index.html').read_text(encoding='utf-8')
assert DAVIS_HERO_JPG in davis and DAVIS_HERO_WEBP in davis and STREAMS['davis-family']['facebook'] in davis
slice_home=(ROOT/'donateworldz.com/index.html').read_text(encoding='utf-8')
assert 'Slice of Hope Australia' in slice_home and 'href="/slice-of-hope-australia/"' in slice_home
assert (ROOT/'donateworldz.com/community-impact/index.html').read_text(encoding='utf-8').count('https://www.facebook.com/share/')==35
assert (ROOT/'oneworldz.com/community-support/index.html').read_text(encoding='utf-8').count('https://www.facebook.com/share/')==35
print('FACEBOOK_SUPPORT=PASS direct_links=35 active_stripe_streams=4 slice_of_hope=1 retired_uganda=0 iframes=0 styled_support=1 davis_visual=1')
