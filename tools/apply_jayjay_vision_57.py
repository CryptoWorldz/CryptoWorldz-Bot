#!/usr/bin/env python3
"""Apply the vision layer, finalize Davis Family, then normalize visual output."""
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / 'tools' / 'apply_jayjay_vision_57_core.py'), run_name='__main__')
runpy.run_path(str(ROOT / 'tools' / 'apply_davis_page.py'), run_name='__main__')
page=ROOT/'donateworldz.com/davis-family/index.html'
text=page.read_text(encoding='utf-8')
if '/mobile-safe.css' not in text:
    text=text.replace('</head>','<link rel="stylesheet" href="/mobile-safe.css"></head>',1)
    page.write_text(text,encoding='utf-8')
for old in [
    ROOT/'donateworldz.com/assets/support/davis-family/one-kind-act.jpg',
    ROOT/'donateworldz.com/assets/support/davis-family/donateworldz-profile.jpg',
]:
    if old.exists(): old.unlink()
runpy.run_path(str(ROOT / 'tools' / 'normalize_visual_assets.py'), run_name='__main__')
