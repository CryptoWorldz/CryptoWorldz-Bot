#!/usr/bin/env python3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

pdc=ROOT/'purplediamondcrew.com/index.html'
if not pdc.is_file():
    raise SystemExit('WORLDZPAD_LINKS_MISSING_PDC')
text=pdc.read_text(encoding='utf-8')
if 'Legacy Revival Centre™' not in text:
    block='''<section class="section"><div class="info-card"><strong>Legacy Revival Centre™</strong><span>Audit and revive genuine Purple Diamond Crew token history without replacing original mints where they remain technically viable.</span><div class="actions"><a class="btn" href="https://impactbased.oneworldz.com/revival-centre/">Open Legacy Revival Centre</a></div></div></section>'''
    if '</main>' not in text:
        raise SystemExit('WORLDZPAD_LINKS_PDC_NO_MAIN')
    text=text.replace('</main>',block+'</main>',1)
    pdc.write_text(text,encoding='utf-8')

if 'https://impactbased.oneworldz.com/revival-centre/' not in pdc.read_text(encoding='utf-8'):
    raise SystemExit('WORLDZPAD_LINKS_PDC_FAILED')
print('WORLDZPAD_LINKS=PASS pdc_revival=1')
