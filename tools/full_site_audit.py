#!/usr/bin/env python3
"""Repair visual output first, then run the exhaustive page/image audit."""
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / 'tools' / 'normalize_visual_assets.py'), run_name='__main__')
runpy.run_path(str(ROOT / 'tools' / 'full_site_audit_core.py'), run_name='__main__')
