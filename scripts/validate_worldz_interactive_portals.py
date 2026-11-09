#!/usr/bin/env python3
"""Static proof gate for interactive Worldz portals; does not verify DNS or chain transactions."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
launch=(root/'worldzlaunch.com/index.html').read_text(encoding='utf-8')
hope=(root/'purplediamondcrew.com/hope-chest/index.html').read_text(encoding='utf-8')
domains=['solworldz.xyz','xrpworldz.xyz','ethworldz.xyz','suiworldz.xyz','baseworldz.xyz','bitworldz.xyz','hyperworldz.xyz','robinworldz.xyz','bnbworldz.xyz']
for domain in domains:
    assert (root/domain/'index.html').is_file(),f'Missing destination homepage: {domain}'
    assert f'https://{domain}/' in launch,f'Missing Worldz galaxy destination: {domain}'
assert launch.count('class="world-node"')==9,'Expected nine accessible Worldz links'
assert 'prefers-reduced-motion' in launch and 'aria-label=' in launch
mints=['F82HFwxDLKFAbQWq7BmniWWxMgUerQsVu8jS357epump','PDC1K9aG6vAg5jFYkLin2tdTgwqZypsdvVHhHN2WnWw','PDC1NgvtvLZwnopTfQdzXT5iAqBeGyLdFXEcqnvsR52','7mwWRQeNpwWrnNhRpC48k7xQCdjCXDWfLLuYsphupump','PDCLsBaTM3MxCzTWNoRvQejZ4kkhAWZiSc3ipCsoFuE','9Jd67VEgqWA2K5mck7yiYGxfLrQnmrTnXXzDYE3b7MLf','DyZP9zn6vRu8J8XCQLNCREgCc12YN4JndnrmE5Upump','DcekG6rLbQ3K5LtZfSMLgecfqnFAZgJUSpoY7tBgmuGv','VeSt6vaWE5JsT36sVCzL21daiY7nNNs73TJcJMHgnjC','Lmtdfb2b392STncVxf2rD6csY4w1rxuHEMizv7vXVtY']
for mint in mints:
    assert mint in hope,f'Historical Hope Chest record missing: {mint}'
assert hope.count('class="legacy-card"')==10,'Expected exactly ten historical cards'
assert 'prefers-reduced-motion' in hope and 'name="viewport"' in hope
for route in ['crew','our-work','acknowledgements']:
    assert (root/'purplediamondcrew.com'/route/'index.html').is_file(),f'Missing PDC route {route}'
print('INTERACTIVE_PORTAL_STATIC_GATE=PASS')
print('WORLDZ_DESTINATIONS=9 HOPE_CHEST_HISTORICAL_RECORDS=10')
print('LIVE_HOSTING_AND_CHAIN_EXECUTION=NOT_VERIFIED')
