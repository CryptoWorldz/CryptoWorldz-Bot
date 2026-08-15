# OneWorldz AI Core — LOCKED STRUCTURE

Status: BUILD ACTIVE
Owner: JayJayTeamDev / OneWorldz

## Core principle

OneWorldz is not only an AI front door for new visitors. The people already helping people in need — including the 35 existing OneWorldz support/community profiles — are eligible to become users of the same system.

OneWorldz AI Core is the shared source of truth used by:

- OneWorldz.com/gpt
- OneWorldz GPT inside ChatGPT
- Robin Hood Law research
- CryptoWorldz admin/member tools
- G.R.A.C.E. research/content workflows
- OneWorldz Full Support / Stripe control tooling
- DonateWorldz and FoodWorldz
- Command Centre Ultimate
- future OneWorldz apps

## Community-partner access

All 35 currently active records in `oneworldz_support_profiles` are seeded as **eligible** community partners.

Default partner capabilities:

- research: YES
- draft posts: YES
- create image requests: YES
- submit work for approval: YES
- publish directly: NO
- manage billing: NO

Eligibility is not automatic account access. A person must be invited/verified and linked to an authenticated user before partner access becomes active.

## Dedicated beneficiary access — LOCKED

Reagan and the Davis Family are separate from the general 35-partner access model because each has a dedicated humanitarian funding stream.

### Reagan
- dedicated Reagan Direct Impact workspace
- can view his own donation page, campaign, donation history, transfer history, evidence and payout-rail status
- can confirm receipt of support
- cannot approve or execute payouts
- cannot view Davis Family private funding records

### Davis Family
- dedicated Davis Family Direct Impact workspace
- can view their own donation page, campaign, donation history, transfer history, evidence and payout-rail status
- can confirm receipt of support
- cannot approve or execute payouts
- cannot view Reagan private funding records
- Davis Family remains a current priority OneWorldz human-impact story; no private details about children are stored unnecessarily

Account access becomes active only after the correct person is identity-linked to an authenticated account.

## Uganda mobile-money payout rails — LOCKED

Four beneficiary payout slots are registered:

- Reagan — MTN Uganda Mobile Money
- Reagan — Airtel Money
- Davis Family — MTN Uganda Mobile Money
- Davis Family — Airtel Money

Rules:

- currency: UGX
- recipient account must be fully registered, active and verified
- mobile-money account numbers are not committed to GitHub or public source
- recipient data is entered only through a secure payment/provider setup
- JayJayTeamDev owner approval is mandatory before payout progression
- no beneficiary can approve or execute their own payout
- receipt/evidence is required for completed support transfers
- automation remains disabled until provider, compliance and identity verification are complete

The initial supported Australia-to-Uganda route is WorldRemit mobile money. Direct provider API expansion may be added later only after provider approval and compliance review.

`fundsprepare_historical_transfers` is the evidence ledger for importing verified past WorldRemit/other transfer receipts for Reagan and the Davis Family.

## Research engines

### OneWorldz general research
Visitors and approved partners can investigate practical problems, community needs, solutions and evidence.

### Robin Hood Law research
Dedicated research projects can collect sources, compare jurisdictions, build evidence, draft reform concepts and preserve verified findings. AI output is research/drafting support — not automatic legal authority. Publication remains review-controlled.

### CryptoWorldz research
Admins and members can research chains/projects, prepare educational material, draft community posts and prepare campaign concepts.

## G.R.A.C.E. content engine

Target workflow:

Research -> Draft -> Image Request -> Platform Variants -> Approval -> Publish -> Measure -> Improve

G.R.A.C.E. remains the controlled publishing layer. Community partners may prepare and submit content, but direct publishing is disabled by default.

## OneWorldz knowledge system

`oneworldz_knowledge_items` stores versioned knowledge across:

- OneWorldz
- Robin Hood Law
- CryptoWorldz
- G.R.A.C.E.
- Community Impact
- Support
- General Research

Only verified/public knowledge is readable anonymously.

## AI jobs

`oneworldz_ai_jobs` records research, law research, post drafts, image requests, campaign plans, summaries, website copy and support guidance.

Jobs may require approval before downstream publication or operational use.

## Cost Control

`oneworldz_ai_usage` records model/provider usage, tokens, image generations, web searches and estimated/actual/reconciled cost.

`oneworldz_ai_budgets` stores global, domain and partner budget controls. The global budget is initially in **track-first** mode so real usage can be observed before a hard cap is set.

Target reporting:

- spend today
- spend this week
- month-to-date
- projected month-end
- spend by partner
- spend by domain
- spend by job type
- amount estimated vs reconciled
- budget alerts

## Security rules

- No OpenAI secret keys in GitHub or public client code.
- No Stripe secret keys or raw bank/mobile-money account data in the AI Core.
- Authenticated partner access must be linked to an approved support profile or dedicated beneficiary identity.
- Publishing, payments and billing management require separate explicit permissions.
- Community AI work is traceable to a user/job.
- Public knowledge requires verification status `verified` and visibility `public`.
- Sensitive operational tables remain server/service-role controlled.
- Outgoing beneficiary support cannot be marked sent without JayJayTeamDev owner approval and execution evidence.

## Current live foundation

Applied Supabase migrations:

`20260815103921_oneworldz_ai_core_and_community_partner_access`

`20260815105139_beneficiary_workspaces_mobile_money_and_owner_approval`

Created live foundation tables include:

- `oneworldz_ai_partner_access`
- `oneworldz_knowledge_items`
- `oneworldz_research_projects`
- `oneworldz_research_findings`
- `oneworldz_ai_jobs`
- `oneworldz_ai_grace_links`
- `oneworldz_ai_usage`
- `oneworldz_ai_budgets`
- `fundsprepare_beneficiary_access`
- `fundsprepare_historical_transfers`

35 eligible community-partner records have been seeded from the existing active OneWorldz support directory. Reagan and the Davis Family additionally have isolated beneficiary-workspace records awaiting identity linkage.

## Build order — LOCKED

1. OneWorldz AI Core database and permissions
2. Secure OpenAI API gateway
3. OneWorldz GPT connection to Core
4. `OneWorldz.com/gpt` native chat
5. Robin Hood Law research mode
6. G.R.A.C.E. research/post/image workflow
7. CryptoWorldz admin/member AI tools
8. Community-partner + dedicated-beneficiary invitation/onboarding
9. AI Cost Control dashboard
10. Stripe/DonateWorldz support routing integration
11. WorldRemit/mobile-money receipt import + payout workflow
12. analytics + growth measurement
13. controlled automation expansion

## Permanent design rule

One system, shared verified knowledge, role-based access, human approval where consequences matter, and no secret/bank/payment credentials copied into public AI content or repositories.
