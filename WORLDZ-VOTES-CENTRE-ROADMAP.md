# Worldz Votes Centre™ — Build Roadmap

## Mission

Build a civic participation platform that is **Fair • Calm • Organised • Transparent • Safe**, while remaining politically neutral and complying with the law of each jurisdiction in which it operates.

## Phase 0 — Foundation (this PR)

- preserve existing hourly token-popularity voting;
- add a separate civic/public-consultation namespace;
- hard-code equal option weight and prohibit paid ballot placement;
- provide single-choice, approval and ranked-choice IRV counting;
- refuse hidden algorithmic tie-breaking;
- add a public charter, Mini App surface, Telegram read surface and read-only API;
- keep civic vote casting and binding mode OFF;
- add a dated Australia federal compliance profile;
- define a server-only draft schema with RLS.

## Phase 1 — Non-binding public consultation pilot

### Eligibility
- integrate a reviewed human/eligibility verifier;
- issue one unlinkable eligibility credential per person per ballot;
- do not use token ownership, wealth, donation size, social rank or Worldz points as civic voting weight;
- do not store legal identity beside ballot choices.

### Ballot publication
- neutral title and summary;
- jurisdiction + scope;
- method + complete count rules;
- open/close times;
- equal option/candidate card schema;
- source bundle;
- arguments for, against and alternatives using equal presentation limits;
- authorisation field where law requires it;
- public change history before opening.

### Voting
- one eligible credential = one ballot;
- immutable close time once voting begins except documented emergency procedure;
- no paid boost;
- no admin editing of submitted ballots;
- receipt hash issued to voter;
- no live result display when it could distort the ballot unless the ballot rules explicitly require it.

### Results
- deterministic count;
- round-by-round transfers for ranked ballots;
- invalid/exhausted ballot totals where applicable;
- machine-readable result JSON;
- human-readable result;
- audit status and correction history.

## Phase 2 — Privacy + independent audit gate

Required before any high-stakes or official integration:
- independent application security review;
- cryptographic review of unlinkable credentials;
- penetration test;
- threat model covering coercion, duplicate voting, credential theft, insider access, denial of service and database compromise;
- accessibility audit;
- count implementation audit;
- public incident-response and recount procedures.

## Phase 3 — Jurisdiction adapters

A jurisdiction adapter contains:
- legal profile name and effective dates;
- ballot/election method allowed for the use case;
- eligibility authority;
- electoral communication authorisation rules;
- funding/donation/expenditure disclosure rules;
- privacy/data-retention requirements;
- accessibility requirements;
- mandatory notices;
- official source URLs;
- mandatory review date.

**Fail closed:** an expired compliance profile blocks regulated publication until reviewed.

Initial target:
1. Australia — Federal
2. Australia — NSW
3. other Australian states/territories
4. additional countries only after jurisdiction-specific legal review

There is no single “world election law”; adapters must not assume Australian rules apply elsewhere.

## Phase 4 — Public money + funding transparency

Build a neutral transparency register that can show, where legally available:
- declared donations;
- electoral expenditure;
- public election funding;
- relevant disclosure dates;
- official source;
- corrections.

Worldz must present these records descriptively and never convert financial data into a political recommendation or ranking.

## Phase 5 — Official-authority integration

Binding election mode remains impossible until:
- an official authority is integrated;
- jurisdiction legal review is approved;
- eligibility and secret-ballot design are independently audited;
- certification requirements are met;
- recount/challenge processes are implemented;
- operational responsibility is contractually clear.

A Worldz administrator cannot self-authorise binding mode.

## Permanent product prohibitions

- vote buying;
- paid ballot position;
- wealth/token-weighted civic votes;
- personalised political persuasion;
- hidden candidate ranking;
- fabricated sources;
- undisclosed rule changes after voting opens;
- publishing individual ballot choices;
- treasury execution from civic votes;
- treating non-binding consultation as an official election result.

## Public statement

**Worldz 🌐 A Better World 🌏 💜🌈⭐🎢**

Worldz Votes Centre™ gives people a clear place to understand choices, examine evidence and express their own preferences. Worldz does not choose for them.
