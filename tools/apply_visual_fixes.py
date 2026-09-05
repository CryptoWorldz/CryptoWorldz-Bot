#!/usr/bin/env python3
from pathlib import Path
core = Path(__file__).with_name('apply_visual_fixes_core.py')
exec(compile(core.read_text(encoding='utf-8'), str(core), 'exec'))
dedicated = Path(__file__).with_name('apply_dedicated_fix.py')
exec(compile(dedicated.read_text(encoding='utf-8'), str(dedicated), 'exec'))
finish = Path(__file__).with_name('apply_architecture_finish.py')
exec(compile(finish.read_text(encoding='utf-8'), str(finish), 'exec'))
retired = Path(__file__).with_name('remove_retired_uganda_support.py')
exec(compile(retired.read_text(encoding='utf-8'), str(retired), 'exec'))
print('VISUAL_ARCHITECTURE=PASS core=1 dedicated=1 finish=1 retired_uganda_cleanup=1')
