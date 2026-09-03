#!/usr/bin/env python3
from pathlib import Path
core = Path(__file__).with_name('apply_visual_fixes_core.py')
exec(compile(core.read_text(encoding='utf-8'), str(core), 'exec'))
donate = Path(__file__).resolve().parents[1] / 'donateworldz.com' / 'index.html'
text = donate.read_text(encoding='utf-8')
text = text.replace('The OneWorldz GPT graphic is no longer used as the DonateWorldz identity.', 'Choose a direct support pathway and see clearly where it leads.')
donate.write_text(text, encoding='utf-8')
print('DONATE_IDENTITY_FIX=PASS')
