-- OneWorldz Command Centre v4 bootstrap.
-- Additive and idempotent: preserve the existing workspace, settings, posts,
-- OAuth connections, Auto records and every unrelated table.

insert into public.grace_social_accounts (
  workspace_id,
  platform,
  account_key,
  display_name,
  handle,
  credential_secret_ref,
  status,
  daily_post_limit,
  monthly_budget_usd,
  metadata,
  created_by
)
select
  workspace.id,
  'x',
  'cryptoworldzx',
  'CryptoWorldz on X',
  'CryptoWorldzX',
  'GRACE_X_OAUTH_CONNECTION',
  'pending_credentials',
  10,
  25.00,
  jsonb_build_object(
    'oauth_provider', 'x',
    'connection_command', '/connectx 1',
    'exact_redirect_uri', 'https://cryptobotz.cryptoworldz.xyz/grace/oauth/x/callback'
  ),
  workspace.owner_telegram_id
from public.grace_workspaces workspace
where workspace.slug = 'cryptoworldz'
on conflict (workspace_id, platform, account_key) do update
set display_name = excluded.display_name,
    handle = excluded.handle,
    credential_secret_ref = excluded.credential_secret_ref,
    daily_post_limit = excluded.daily_post_limit,
    monthly_budget_usd = excluded.monthly_budget_usd,
    metadata = public.grace_social_accounts.metadata || excluded.metadata,
    updated_at = now();

update public.grace_settings settings
set approval_required = true,
    posting_enabled = false,
    updated_at = now()
from public.grace_workspaces workspace
where settings.workspace_id = workspace.id
  and workspace.slug = 'cryptoworldz';

comment on table public.grace_oauth_connections is
  'Encrypted owner-approved social connections. Command Centre v4 uses OAuth 2.0 PKCE and exact-handle verification for X.';
