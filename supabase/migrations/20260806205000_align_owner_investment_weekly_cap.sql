update public.project_wallets
set weekly_owner_deposit_cap_aud_cents = 10000,
    notes = 'JayJayTeamDev personal Diamond Buy Auto wallet. USDC-funded, buy-only owner investment wallet. AUD $100 weekly owner-funding ceiling.',
    updated_at = now()
where purpose = 'investment';
