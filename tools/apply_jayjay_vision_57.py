#!/usr/bin/env python3
"""Apply the vision layer, finalize Davis Family, then normalize visual output."""
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
runpy.run_path(str(ROOT / 'tools' / 'apply_jayjay_vision_57_core.py'), run_name='__main__')
runpy.run_path(str(ROOT / 'tools' / 'apply_davis_page.py'), run_name='__main__')
runpy.run_path(str(ROOT / 'tools' / 'normalize_visual_assets.py'), run_name='__main__')
