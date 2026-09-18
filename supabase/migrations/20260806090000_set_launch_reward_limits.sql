update public.reward_budget_settings
set weekly_budget_cents = 6000,
    pilot_weekly_points_cap = 1000,
    maximum_weekly_points_cap = 1000,
    referral_inviter_points = 10,
    inviter_weekly_qualified_cap = 20,
    updated_at = now()
where id = 'global';
