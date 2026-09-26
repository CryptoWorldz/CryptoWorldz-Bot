from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
contract = json.loads((ROOT / "worldzpad-omnichain/fullscope/worldz-fullscope.v1.json").read_text())
core = (ROOT / "src/fullscope/core.js").read_text()
telegram = (ROOT / "src/fullscope/telegram.js").read_text()
registry = (ROOT / "src/command-registry.js").read_text()
command_centre = (ROOT / "src/command-centre.js").read_text()
runtime = (ROOT / "src/full-runtime-entry.js").read_text()
page = (ROOT / "launchpad.cryptoworldz.xyz/fullscope/index.html").read_text()
mini_html = (ROOT / "public/miniapp/index.html").read_text()
mini_js = (ROOT / "public/miniapp/app.js").read_text()
migration = (ROOT / "supabase/migrations/20260926172000_worldz_fullscope_foundation.sql").read_text()

assert contract["schema"] == "WORLDZ-FULLSCOPE-V1"
assert contract["brand"] == "WorldzFullScope™"
assert contract["maxTokensPerChain"] == 20
assert len(contract["chains"]) == 8
assert len({c["key"] for c in contract["chains"]}) == 8
assert contract["financialSafety"]["walletSignatureRequired"] is True
assert contract["financialSafety"]["autoBroadcast"] is False
assert contract["financialSafety"]["mainnetExecutionEnabled"] is False
assert contract["financialSafety"]["privateKeysInTelegramDatabase"] is False

pop = contract["voting"]["popularity"]
gov = contract["voting"]["governance"]
assert pop["brand"] == "Worldz Votes Centre™"
assert gov["brand"] == "WorldzGovern™"
assert pop["purpose"] != gov["purpose"]
assert set(pop["commandNamespace"]).isdisjoint(set(gov["commandNamespace"]))
assert pop["mayExecuteGovernance"] is False
assert gov["mayAffectPopularityRanking"] is False

required_chains = {"solana","xrpl","base","ethereum","bnb","sui","hyperevm","robinhood"}
assert {c["key"] for c in contract["chains"]} == required_chains
assert "MAX_TOKENS_PER_CHAIN = 20" in core
assert "assertVotingSeparation" in core
assert "mainnetExecutionEnabled: false" in core

for command in ["fullscope","fullscopechains","fullscopetokens","worldzwatch","worldzlock","worldzvest",
                "worldzvotes","tokenvote","worldztrending","worldzrankings",
                "worldzgovern","governproposals","governvote","governdelegate"]:
    assert re.search(rf'["\[]({re.escape(command)})["\],]', registry), command

assert 'registerFullScopeTelegramHandlers' in runtime
assert 'register_worldz_fullscope' in runtime
assert 'WORLDZ VOTES CENTRE™ — POPULARITY' in command_centre
assert 'WORLDZGOVERN™ — DAO GOVERNANCE' in command_centre
assert '/tokenvote' in command_centre and '/governvote' in command_centre
assert 'Worldz Votes Centre™' in telegram and 'WorldzGovern™' in telegram
assert 'POPULARITY ONLY' in page
assert 'GOVERNANCE ONLY' in page
assert '160' in page
assert 'WorldzFullScope™' in mini_html
assert 'Worldz Votes Centre™' in mini_html and 'POPULARITY ONLY' in mini_html
assert 'WorldzGovern™ — DAO Governance' in mini_html
assert 'data-open="worldz-votes"' in mini_html
assert 'data-open="governance"' in mini_html
assert 'WorldzGovern™ vote recorded' in mini_js
assert 'Popularity: Worldz Votes Centre™' in mini_js
assert 'Governance: WorldzGovern™' in mini_js

assert "worldz_popularity_votes" in migration
assert "worldz_popularity_sponsored_boosts" in migration
assert "worldz_fullscope_action_intents" in migration
assert "verification_state text not null default 'telegram'" in migration
for field in ("amount_raw text", "quote_value numeric", "block_reference text", "actor_address text"):
    assert field in migration, field
assert "requires_external_signature boolean not null default true" in migration
assert "auto_broadcast boolean not null default false" in migration
assert "transaction_payload jsonb" in migration
assert "grant usage, select on sequence public.worldz_popularity_votes_id_seq" in migration
assert "maximum 20 enabled tokens" in migration
assert "Must never be used to authorize WorldzGovern" in migration
assert "Must never be counted in Worldz Votes Centre" in migration

# Critical naming rule: the new popularity command is never bare /vote.
assert '/vote' not in pop["commandNamespace"]
assert '/governvote' in gov["commandNamespace"]

print("WORLDZ_FULLSCOPE_VALIDATION=PASS")
print("chains=8 token_slots=160 popularity=WorldzVotesCentre governance=WorldzGovern mainnet_execution=OFF")
