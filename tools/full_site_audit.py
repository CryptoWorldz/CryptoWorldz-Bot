#!/usr/bin/env python3
"""Repair visual output first, then run the exhaustive page/image audit."""
from pathlib import Path
import runpy
import sys

ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / 'tools' / 'normalize_visual_assets.py'), run_name='__main__')

# Keep the exhaustive auditor aligned with the user-approved Davis Family
# replacement artwork rather than the retired legacy hero filenames.
core = ROOT / 'tools' / 'full_site_audit_core.py'
text = core.read_text(encoding='utf-8')
text = text.replace('davis-family-hero.jpg', 'one-kind-act.webp')
text = text.replace('davis-family-hero.webp', 'donateworldz-profile.webp')
core.write_text(text, encoding='utf-8')

if '--render' in sys.argv:
    runpy.run_path(str(ROOT / 'tools' / 'render_all_pages.py'), run_name='__main__')
else:
    runpy.run_path(str(core), run_name='__main__')
