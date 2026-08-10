-- Grace Build 2: extend encrypted OAuth storage from X-only to X + Facebook.

alter table public.grace_oauth_connections
  drop constraint if exists grace_oauth_connections_provider_check;

alter table public.grace_oauth_connections
  add constraint grace_oauth_connections_provider_check
  check (provider in ('x', 'facebook'));

alter table public.grace_oauth_states
  drop constraint if exists grace_oauth_states_provider_check;

alter table public.grace_oauth_states
  add constraint grace_oauth_states_provider_check
  check (provider in ('x', 'facebook'));

with ws as (
  select id from public.grace_workspaces
  where slug = 'cryptoworldz' and status = 'active'
  limit 1
)
insert into public.grace_social_accounts (
  workspace_id,
  platform,
  account_key,
  display_name,
  handle,
  credential_secret_ref,
  status,
  approval_required,
  emergency_disabled,
  created_by,
  metadata
)
select
  id,
  'facebook',
  'cryptoworldz_fb',
  'CryptoWorldz Facebook Page',
  'CryptoWorldz',
  'GRACE_FACEBOOK_TOKEN_CRYPTOWORLDZ_FB',
  'pending_credentials',
  true,
  false,
  8029135300,
  '{"oauth_provider":"facebook","oauth_connected":false}'::jsonb
from ws
on conflict (workspace_id, platform, account_key) do update
set display_name = excluded.display_name,
    handle = excluded.handle,
    credential_secret_ref = excluded.credential_secret_ref,
    metadata = public.grace_social_accounts.metadata || excluded.metadata,
    updated_at = now();
