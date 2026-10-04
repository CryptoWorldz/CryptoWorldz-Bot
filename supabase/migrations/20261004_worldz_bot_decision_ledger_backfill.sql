-- Backfill explicit automation decisions that pre-date the repository export fix.
-- Only rows carrying the bot-stack marker are eligible; human-reviewed history is not inferred.

insert into public.worldz_bot_decision_ledger(
  subject_type,subject_key,decision,rex,zed,auto,grace,dipshit,reason,updated_at
)
select
  'creator_request',
  r.id::text,
  'approved',
  '{"checked":true,"role":"credential_link_security","decision":"approved"}'::jsonb,
  '{"checked":true,"role":"creator_rules","decision":"approved"}'::jsonb,
  '{"checked":true,"role":"reward_limits","decision":"approved","outcome":"activated"}'::jsonb,
  '{"checked":true,"role":"content_destination","decision":"approved"}'::jsonb,
  '{"checked":true,"role":"creator_usability","decision":"approved"}'::jsonb,
  'worldz_bot_stack_auto_validated',
  coalesce(r.updated_at,now())
from public.raaiiidd_creator_requests r
where r.status='approved'
  and r.review_note='worldz_bot_stack_auto_validated'
on conflict(subject_type,subject_key) do nothing;
