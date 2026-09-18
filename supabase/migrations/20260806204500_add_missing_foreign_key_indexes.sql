create index if not exists auto_schedules_auto_token_id_idx
  on public.auto_schedules(auto_token_id);

create index if not exists auto_transactions_simulation_run_id_idx
  on public.auto_transactions(simulation_run_id);

create index if not exists community_referral_targets_project_slug_idx
  on public.community_referral_targets(project_slug);

create index if not exists grace_growth_snapshots_account_id_idx
  on public.grace_growth_snapshots(account_id);

create index if not exists grace_oauth_states_account_id_idx
  on public.grace_oauth_states(account_id);

create index if not exists legend_status_applications_status_code_idx
  on public.legend_status_applications(status_code);

create index if not exists member_legend_statuses_status_code_idx
  on public.member_legend_statuses(status_code);

create index if not exists member_referral_links_chat_id_idx
  on public.member_referral_links(chat_id);

create index if not exists member_referrals_referral_link_id_idx
  on public.member_referrals(referral_link_id);

create index if not exists worldzcast_deliveries_destination_id_idx
  on public.worldzcast_deliveries(destination_id);
