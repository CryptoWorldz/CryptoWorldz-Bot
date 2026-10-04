-- Retire RECAP from active Worldz integrations.
-- Preserve historical token/schedule records for auditability.
-- This follows the 2026-10-01 retirement of RECAP Command Centre control.

update public.shill_reward_tokens
set enabled=false,
    updated_at=now()
where symbol='RECAP';

update public.auto_tokens
set status='disabled',
    updated_at=now()
where symbol='RECAP';

-- Historical submissions, rewards and schedules remain intact.
