#!/usr/bin/env python3
"""Fail closed when a Turn Up Town program is labelled open without claim proof."""
import json
from pathlib import Path
from urllib.parse import urlparse

root = Path(__file__).resolve().parents[1]
page = (root / 'cryptoworldz.xyz/turn-up-town/index.html').read_text()
programs = json.loads((root / 'cryptoworldz.xyz/turn-up-town/programs.json').read_text())['programs']
assert 'Claiming is not live on this page yet.' in page
assert 'programs.js' in page
assert len(programs) == len({item['id'] for item in programs})
for item in programs:
    assert item['status'] in {'PREPARING', 'RECRUITING', 'EXPLORE', 'OPEN', 'CLOSED'}
    assert all(item.get(key) for key in ('name', 'pathway', 'reward', 'eligibility', 'proof'))
    dest = urlparse(item['destination'])
    assert dest.scheme == 'https' and dest.hostname in {
        'oneworldz.com', 'donateworldz.com', 'cryptoworldz.xyz',
        'launchpad.cryptoworldz.xyz',
    }
    if item['status'] == 'OPEN':
        assert all(item.get(key) for key in (
            'opensAt', 'closesAt', 'claimUrl', 'approvedSnapshot',
            'claimAuthority', 'transactionProofUrl',
        )), f"Open claim missing verified details: {item['id']}"
        assert item['claimUrl'].startswith('https://')
print(f"TURN_UP_TOWN=PASS programs={len(programs)} open={sum(item['status'] == 'OPEN' for item in programs)}")
