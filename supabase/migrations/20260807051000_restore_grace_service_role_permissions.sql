grant usage on schema public to service_role;

grant select, insert, update, delete on table
  public.grace_workspaces,
  public.grace_workspace_members,
  public.grace_social_accounts,
  public.grace_settings,
  public.grace_posts,
  public.grace_post_targets,
  public.grace_growth_snapshots,
  public.grace_audit_log,
  public.grace_oauth_states,
  public.grace_oauth_connections
to service_role;

grant usage, select on all sequences in schema public to service_role;

grant execute on function public.grace_claim_due_targets(uuid, integer) to service_role;
grant execute on function public.grace_consume_oauth_state(uuid, text, text) to service_role;

revoke all on table
  public.grace_workspaces,
  public.grace_workspace_members,
  public.grace_social_accounts,
  public.grace_settings,
  public.grace_posts,
  public.grace_post_targets,
  public.grace_growth_snapshots,
  public.grace_audit_log,
  public.grace_oauth_states,
  public.grace_oauth_connections
from anon, authenticated;

revoke execute on function public.grace_claim_due_targets(uuid, integer) from anon, authenticated;
revoke execute on function public.grace_consume_oauth_state(uuid, text, text) from anon, authenticated;
