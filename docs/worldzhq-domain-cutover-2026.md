# Worldz domain cutover checklist — DRAFT (15 October 2026)

New domains purchased through Spaceship: worldzhq.com, worldz.website, worldz.live, worldz.site, worldz.online, worldz.space, worldz.store. Registrations do not prove DNS, hosting, HTTPS, or website deployment.

## Approved target roles (proposed)
- **worldzhq.com**: primary public headquarters; deploy `worldzhq.com/index.html` and associated assets.
- **worldz.website**: permanent 301 redirect to https://worldzhq.com/ (preserve paths only when matching pages exist).
- **worldz.live**: events and Woodstock Revival; create a real page before promoting the link.
- **worldz.store**: reserve for merchandise; no checkout or commerce claims until ready.
- **worldz.space**: reserve for ecosystem explorer.
- **worldz.online**: reserve for community and learning portal.
- **worldz.site**: redirect to HQ or park.
- **oneworldz.com**: keep registered and redirect existing page paths to appropriate new destinations *after* validating all replacements. Audit subdomains (learn, law, impactbased) before redirects to prevent breaking applications.

## Deployment steps requiring registrar/hosting access
1. Inspect Hostinger plan, deployed directory and SSL configuration; confirm the correct site files and ownership.
2. Add worldzhq.com to Hostinger, use the actual Hostinger DNS values shown in the account (do not guess nameservers/IP addresses).
3. In Spaceship set DNS/nameservers for the chosen Hostinger configuration. Avoid changing email MX/SPF/DKIM records without review.
4. Confirm HTTPS certificate, mobile page, links and redirect loops before announcing the new URL.
5. Create Worldz Live landing page or hold it unpublished until ready.
6. Add 301 redirects from old OneWorldz paths and update canonical links, sitemaps, Open Graph, bot menus and GitHub docs after testing.
7. Check donation routes separately; do not change Stripe destinations or imply charity/tax-deductible status.
8. Verify individual domain renewal prices and calendar renewal reminders.

## Safety
This PR does not change live DNS, domain ownership, payment destinations, or Hostinger settings. No public claim that a migration is complete until deployed and checked. Keep old domains active during the transition.
