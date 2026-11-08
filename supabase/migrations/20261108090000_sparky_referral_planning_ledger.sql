-- SPARKY referral planning ledger. No token minting, valuation, wallet transfer or payout.
-- Existing Telegram invite attribution and 7-day qualification remain in member_referrals.
create table if not exists public.sparky_referral_campaigns (
  id text primary key,
  target_chat_id bigint not null,
  reward_usd_cents integer not null check (reward_usd_cents between 1 and 100000),
  max_referrals_per_legend integer not null check (max_referrals_per_legend between 1 and 100),
  enabled boolean not null default false,
  payout_enabled boolean not null default false check (payout_enabled = false),
  created_at timestamptz not null default now(),
  constraint sparky_campaign_fixed_id check (id = 'worldzhq-shill-v1')
);
insert into public.sparky_referral_campaigns(id,target_chat_id,reward_usd_cents,max_referrals_per_legend,enabled)
values ('worldzhq-shill-v1',-1003732353996,500,20,false)
on conflict (id) do nothing;

create table if not exists public.sparky_referral_ledger (
  id bigint generated always as identity primary key,
  campaign_id text not null references public.sparky_referral_campaigns(id),
  referral_id bigint not null unique references public.member_referrals(id),
  inviter_telegram_id bigint not null,
  referred_telegram_id bigint not null,
  usd_cents integer not null check (usd_cents > 0),
  status text not null default 'pending_launch' check (status in ('pending_launch','void')),
  token_quantity numeric,
  transfer_signature text,
  created_at timestamptz not null default now(),
  constraint sparky_no_token_allocation check (token_quantity is null and transfer_signature is null)
);
create index if not exists sparky_ledger_inviter_idx on public.sparky_referral_ledger(inviter_telegram_id,campaign_id);
alter table public.sparky_referral_campaigns enable row level security;
alter table public.sparky_referral_ledger enable row level security;
revoke all on public.sparky_referral_campaigns from anon,authenticated;
revoke all on public.sparky_referral_ledger from anon,authenticated;

-- Service-side only, invoked after existing referral qualification. No duplicate or self-referrals.
create or replace function public.record_sparky_referral(p_referral_id bigint)
returns text language plpgsql security invoker set search_path = ''
as $$
declare
  v_ref public.member_referrals%rowtype;
  v_campaign public.sparky_referral_campaigns%rowtype;
  v_count integer;
begin
  select * into v_ref from public.member_referrals where id=p_referral_id for update;
  if not found then return 'referral_missing'; end if;
  if v_ref.status <> 'qualified' or v_ref.qualified_at is null then return 'not_qualified'; end if;
  if v_ref.inviter_telegram_id=v_ref.referred_telegram_id then return 'self_referral'; end if;
  select * into v_campaign from public.sparky_referral_campaigns where id='worldzhq-shill-v1' for update;
  if not found or not v_campaign.enabled then return 'campaign_disabled'; end if;
  if v_ref.chat_id<>v_campaign.target_chat_id then return 'wrong_chat'; end if;
  if exists(select 1 from public.sparky_referral_ledger where referral_id=p_referral_id) then return 'already_recorded'; end if;
  select count(*) into v_count from public.sparky_referral_ledger
    where campaign_id=v_campaign.id and inviter_telegram_id=v_ref.inviter_telegram_id and status='pending_launch';
  if v_count>=v_campaign.max_referrals_per_legend then return 'legend_cap_reached'; end if;
  insert into public.sparky_referral_ledger(campaign_id,referral_id,inviter_telegram_id,referred_telegram_id,usd_cents)
  values(v_campaign.id,v_ref.id,v_ref.inviter_telegram_id,v_ref.referred_telegram_id,v_campaign.reward_usd_cents);
  return 'recorded_pending_launch';
end $$;
revoke all on function public.record_sparky_referral(bigint) from public,anon,authenticated;
grant execute on function public.record_sparky_referral(bigint) to service_role;
-- Activation and settlement intentionally require a separately reviewed release.
