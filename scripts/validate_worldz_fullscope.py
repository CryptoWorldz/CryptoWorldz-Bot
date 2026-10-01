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
foundation = (ROOT / "supabase/migrations/20260926172000_worldz_fullscope_foundation.sql").read_text()
hourly = (ROOT / "supabase/migrations/20261001054000_worldz_votes_hourly_only.sql").read_text()

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
assert list(contract["voting"]) == ["popularity"]
assert pop["brand"] == "Worldz Votes Centre™"
assert pop["cadence"] == "one vote per Telegram user per rolling 60 minutes"
assert "/vote" in pop["commandNamespace"]
assert "/tokenvote" in pop["commandNamespace"]
assert pop["sponsoredExposureCountsAsVote"] is False
assert "WorldzGovern™" not in contract["modules"]

required_chains = {"solana","xrpl","base","ethereum","bnb","sui","hyperevm","robinhood"}
assert {c["key"] for c in contract["chains"]} == required_chains
assert "MAX_TOKENS_PER_CHAIN = 20" in core
assert "assertVotingRules" in core
assert "one-vote-per-user-per-rolling-hour" in core
assert "mainnetExecutionEnabled: false" in core

for command in ["fullscope","fullscopechains","fullscopetokens","worldzwatch","worldzlock","worldzvest",
                "worldzvotes","vote","tokenvote","worldztrending","worldzrankings"]:
    assert re.search(rf'["\[]({re.escape(command)})["\],]', registry), command

for retired in ["worldzgovern","governproposals","governvote","governdelegate"]:
    assert retired not in registry

assert 'registerFullScopeTelegramHandlers' in runtime
assert 'register_worldz_fullscope' in runtime
assert 'DEX TOKEN VOTING' in command_centre
assert '/vote' in command_centre
assert 'WorldzGovern' not in command_centre
assert 'ONE VOTE PER USER PER HOUR' in telegram
assert 'WorldzGovern' not in telegram
assert 'ONE VOTE • ONE USER • EVERY 60 MINUTES' in page
assert 'WorldzGovern' not in page
assert '160' in page
assert 'WorldzFullScope™' in mini_html
assert 'DEX TOKEN VOTING • HOURLY' in mini_html
assert 'data-open="worldz-votes"' in mini_html
assert 'data-open="governance"' not in mini_html
assert 'WorldzGovern' not in mini_js

assert "worldz_popularity_votes" in foundation
assert "worldz_popularity_sponsored_boosts" in foundation
assert "worldz_fullscope_action_intents" in foundation
assert "requires_external_signature boolean not null default true" in foundation
assert "auto_broadcast boolean not null default false" in foundation
assert "transaction_payload jsonb" in foundation
assert "grant usage, select on sequence public.worldz_popularity_votes_id_seq" in foundation
assert "maximum 20 enabled tokens" in foundation

assert "drop constraint if exists worldz_popularity_votes_token_id_telegram_id_voted_on_key" in hourly
assert "pg_advisory_xact_lock" in hourly
assert "interval '60 minutes'" in hourly
assert "worldz_hourly_vote_limit" in hourly
assert "trg_worldz_popularity_vote_hourly_guard" in hourly

print("WORLDZ_FULLSCOPE_VALIDATION=PASS")
print("chains=8 token_slots=160 voting=hourly-dex-token-vote governance=RETIRED mainnet_execution=OFF")
