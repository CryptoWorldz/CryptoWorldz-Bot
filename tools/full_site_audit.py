#!/usr/bin/env python3
"""Normalize visual output, then run the exhaustive page/image audit."""
from pathlib import Path
import runpy
import sys

ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / 'tools' / 'normalize_visual_assets.py'), run_name='__main__')

# The exhaustive auditor now checks the current approved Davis Family hero
# filenames directly. Do not rewrite them to retired profile-image names.
core = ROOT / 'tools' / 'full_site_audit_core.py'

if '--render' in sys.argv:
    runpy.run_path(str(ROOT / 'tools' / 'render_all_pages.py'), run_name='__main__')
else:
    runpy.run_path(str(core), run_name='__main__')
