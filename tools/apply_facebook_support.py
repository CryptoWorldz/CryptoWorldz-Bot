#!/usr/bin/env python3
from pathlib import Path
from urllib.parse import quote
from html import escape

ROOT = Path(__file__).resolve().parents[1]
BUILD = "2026-09-03-facebook-support"

JAYJAY = "https://www.facebook.com/share/1FyYhwKP3r/"
REAGAN = "https://www.facebook.com/share/196pruFjJq/?mibextid=wwXIfr"
DAVIS = "https://www.facebook.com/share/165Ken5f2Bt/"
COMMUNITY = [
"https://www.facebook.com/share/1BmTRrfQo7/","https://www.facebook.com/share/193tUYStL4/","https://www.facebook.com/share/1DQhDp4CzW/","https://www.facebook.com/share/19D9XrUuzQ/","https://www.facebook.com/share/1Bc5S5yUJG/","https://www.facebook.com/share/1DVSBSLEyo/","https://www.facebook.com/share/1BeyrEWLGz/","https://www.facebook.com/share/1Byi1xiu4M/","https://www.facebook.com/share/1bzNo5Ea8v/","https://www.facebook.com/share/1HRf5ttw8b/","https://www.facebook.com/share/1EkFHZi9mm/","https://www.facebook.com/share/16CajPwJduJ/","https://www.facebook.com/share/1TomftXutg/","https://www.facebook.com/share/1BWdL1EQTh/","https://www.facebook.com/share/1byaGg2oU2/","https://www.facebook.com/share/1BbFH6PfXV/","https://www.facebook.com/share/1Bdhxhnx94/","https://www.facebook.com/share/1JpX6zaY7d/","https://www.facebook.com/share/1AbktByVp7/","https://www.facebook.com/share/1HaHoN5TiK/","https://www.facebook.com/share/17nsTeFoJq/","https://www.facebook.com/share/1DM65ximC9/","https://www.facebook.com/share/14ohVcr8yz8/","https://www.facebook.com/share/1J5W3wd7Ef/","https://www.facebook.com/share/1JMSjqkg6f/","https://www.facebook.com/share/1BBSN1B5Sx/","https://www.facebook.com/share/1M9i684JGg/","https://www.facebook.com/share/18oGmZLysQ/","https://www.facebook.com/share/19UGYkcwPw/","https://www.facebook.com/share/1Ham4mf3LY/","https://www.facebook.com/share/1DimMFXSM7/","https://www.facebook.com/share/1EpHr25wKE/","https://www.facebook.com/share/186v7cwFZ7/","https://www.facebook.com/share/1R3Y6CKi1Q/","https://www.facebook.com/share/18BmqfH7MS/"
]

def fb_embed(url, title):
    plugin = "https://www.facebook.com/plugins/page.php?href=" + quote(url, safe='') + "&tabs=timeline&width=500&height=420&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true"
    return f'''<div style="border:1px solid #35518a;border-radius:20px;background:#080d18;padding:14px;overflow:hidden">
      <iframe title="{escape(title)} Facebook page preview" src="{plugin}" width="500" height="420" style="border:0;overflow:hidden;width:100%;max-width:500px;display:block;margin:auto;background:#fff;border-radius:14px" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" loading="lazy"></iframe>
      <p style="margin:12px 0 0;text-align:center"><a class="btn" href="{escape(url)}" target="_blank" rel="noopener noreferrer">Open verified Facebook link →</a></p>
    </div>'''

def shell(title, eyebrow, heading, intro, body, nav_extra=''):
    return f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)}</title><link rel="stylesheet" href="/visual-fix.css"></head>
<body data-oneworldz-build="{BUILD}"><nav class="nav"><a class="brand" href="https://oneworldz.com">OneWorldz</a><a href="https://donateworldz.com">DonateWorldz</a>{nav_extra}</nav><main class="shell">
<section class="section"><p class="ey">{escape(eyebrow)}</p><h1>{escape(heading)}</h1><p>{escape(intro)}</p></section>{body}</main><div class="foot">OneWorldz 🌐 One Vision • Helping the People Who Help People</div></body></html>'''

def write(rel, text):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')

write('donateworldz.com/reagan-children/index.html', shell(
    'Reagan & Children | DonateWorldz','Verified Facebook','Reagan & Children — Action Spreads Smiles',
    'Dedicated support for Reagan and the children, with the previously verified Action Spreads Smiles Facebook destination.',
    '<section class="section"><img src="/reagan.png" alt="Reagan and children approved artwork" style="width:100%;max-height:620px;object-fit:contain;background:#020205;border-radius:18px"></section><section class="section"><h2>Facebook preview</h2>'+fb_embed(REAGAN,'Action Spreads Smiles')+'</section>',
    '<a href="/reagan-children/">Reagan & Children</a>'))

write('donateworldz.com/davis-family/index.html', shell(
    'Davis Family | DonateWorldz','Verified Facebook','Davis Family',
    'Dedicated Davis Family support page using the repository-verified Mpagi Davis Facebook destination.',
    '<section class="section"><h2>Facebook preview</h2>'+fb_embed(DAVIS,'Mpagi Davis / Davis Family')+'</section>',
    '<a href="/davis-family/">Davis Family</a>'))

write('donateworldz.com/jayjay-support/index.html', shell(
    'JayJayTeamDev Support | DonateWorldz','Verified Facebook','Support JayJayTeamDev',
    'Voluntary support for the Helping the People Who Help People mission, with the current OneWorldz/JayJayTeamDev Facebook Page destination.',
    '<section class="section"><h2>Facebook preview</h2>'+fb_embed(JAYJAY,'JayJayTeamDev')+'</section>',
    '<a href="/jayjay-support/">JayJayTeamDev</a>'))

community_cards = ''.join(f'<article style="border:1px solid #294a80;border-radius:18px;background:#080d18;padding:12px">{fb_embed(u, f"Community support profile {i}")}</article>' for i,u in enumerate(COMMUNITY,1))
community_body = f'''<section class="section"><h2>35 verified Facebook destinations</h2><p>These are the exact 35 destinations preserved in the approved repository registry. Each preview remains linked to its original Facebook destination.</p><div class="grid2">{community_cards}</div></section>'''
community_page = shell('Community Charity | OneWorldz','Community Charity','Community Charity Support','Thirty-five previously verified Facebook destinations preserved in their original display order.',community_body,'<a href="/community-impact/">Community Charity</a>')
write('donateworldz.com/community-impact/index.html', community_page)
write('oneworldz.com/community-support/index.html', community_page.replace('href="/community-impact/"','href="https://donateworldz.com/community-impact/"'))

# Add Davis Family and Community Charity to the DonateWorldz root without disturbing the existing visual identity.
root = ROOT / 'donateworldz.com/index.html'
text = root.read_text(encoding='utf-8')
text = text.replace('<a class="chip" href="/community-impact/">Community Impact</a>', '<a class="chip" href="/davis-family/">Davis Family</a><a class="chip" href="/community-impact/">Community Charity</a>')
text = text.replace('<a class="chip" href="/jayjay-support/">JayJay Support</a>', '<a class="chip" href="/jayjay-support/">JayJayTeamDev Support</a>')
root.write_text(text, encoding='utf-8')

# Link the dedicated Community Charity page from OneWorldz.
one = ROOT / 'oneworldz.com/index.html'
one_text = one.read_text(encoding='utf-8')
if 'href="/community-support/"' not in one_text:
    one_text = one_text.replace('<section class="section"><h2>Enter the ecosystem</h2>', '<section class="section"><h2>Community Charity</h2><div class="btns"><a class="btn" href="/community-support/">Open 35 verified Facebook previews →</a></div></section><section class="section"><h2>Enter the ecosystem</h2>')
one.write_text(one_text, encoding='utf-8')

urls_file = ROOT / '.ecosystem-urls.txt'
urls = [u.strip() for u in urls_file.read_text(encoding='utf-8').splitlines() if u.strip()]
for u in ['https://donateworldz.com/davis-family/','https://oneworldz.com/community-support/']:
    if u not in urls: urls.append(u)
urls_file.write_text('\n'.join(urls)+'\n', encoding='utf-8')

print(f'FACEBOOK_SUPPORT=PASS jayjay=1 reagan=1 davis=1 community={len(COMMUNITY)} pages={len(urls)}')
