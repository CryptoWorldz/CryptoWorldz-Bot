# Worldz Heroes V2 — migration and visual audit
Status: staging only; no public endorsement or partnership implied.

## Confirmed existing hero registry
- Just Knate — /heroes/just-knate/
- Victor — The Good Boss — /heroes/victor-good-boss/
- Sam Weidenhofer — /heroes/sam-weidenhofer/
- Bi Phakathi — /heroes/bi-phakathi/
- MDMotivator (Zachery Dereniowski) — /heroes/mdmotivator/
- Dylan Thiry — /heroes/dylan-thiry/
- Bob the Roofer — /heroes/bob-roofer/ (appears in other scripts; not in six-profile source registry)

## Critical repository defects
- tools/final_visual_overhaul.py assigns hero portraits to other people (e.g. just-knate mapped to sam-weidenhofer.webp).
- tools/apply_real_visual_repairs.py documents similarly shifted file-to-person assignments.
- tools/apply_heroes_worldz.py still emits OneWorldz titles, headings, footers and email.
- Verify actual image content, ownership/permission and person match before any public use. Do not assume filename proves identity.
- Existing heroes page on default branch was not found at oneworldz.com/heroes/index.html during this audit. Generator exists; check deployment/build output.

## Approved design
Worldz Galaxy V2: deep purple starfield, blue glow, silver borders, black glass cards, large readable names, responsive layouts. Use authentic licensed portraits; avoid AI-generated likenesses presented as real photographs.
Replace only site-owned OneWorldz / SolWorld branding with WORLDZ / Purple Diamond Crew. Never alter a person's own name or independently owned social profile. Keep original source/credit links.
No claim any hero is an official partner, ambassador or supporter absent permission.

## Safe release checklist
1. Inventory deployed hero pages and assets on all mapped domains.
2. Check each photo visually against its original creator-owned public profile and rights.
3. Fix image mappings in a single source-of-truth registry.
4. Generate responsive WORLDZ-branded cards and profile pages.
5. Validate every image, link and attribution.
6. Stage preview and test before merging/deploying.
