insert into public.funding_streams (
  stream_key, display_name, stream_type, status, metadata
)
values (
  'davis_family',
  'Davis Family Direct Impact Fund',
  'charitable',
  'setup_required',
  jsonb_build_object(
    'fundsprepare_version','1.1',
    'owner_approval_required_for_outgoing',true,
    'beneficiary_workspace_required',true,
    'country','Uganda',
    'current_oneworldz_story_focus',true
  )
)
on conflict (stream_key) do update set
  display_name = excluded.display_name,
  metadata = public.funding_streams.metadata || excluded.metadata,
  updated_at = now();

update public.funding_streams
set metadata = metadata || jsonb_build_object(
  'beneficiary_workspace_required',true,
  'country','Uganda',
  'mobile_money_supported',true,
  'owner_approval_required_for_outgoing',true
), updated_at = now()
where stream_key = 'reagan_direct_impact';

insert into public.funding_campaigns (
  stream_id,
  campaign_code,
  slug,
  display_name,
  beneficiary_name,
  purpose,
  client_reference_id,
  status,
  metadata
)
select
  fs.id,
  'OWZ-DAV-001',
  'the-davis-family',
  'Davis Family Direct Impact',
  'The Davis Family',
  'Rent, food, medication, school supplies and verified family support in Mityana, Uganda',
  'OWZ-DAV-001',
  'setup_required',
  jsonb_build_object(
    'beneficiary_workspace_required',true,
    'do_not_create_parent_stripe_link_until_isolated_payout_ready',true,
    'current_oneworldz_story_focus',true,
    'source_cause_slug','the-davis-family'
  )
from public.funding_streams fs
where fs.stream_key = 'davis_family'
on conflict (slug) do update set
  stream_id = excluded.stream_id,
  display_name = excluded.display_name,
  beneficiary_name = excluded.beneficiary_name,
  purpose = excluded.purpose,
  metadata = public.funding_campaigns.metadata || excluded.metadata,
  updated_at = now();

insert into public.fundsprepare_participants (
  participant_key,
  display_name,
  country,
  role,
  access_scope,
  can_prepare_transfer,
  can_approve_transfer,
  can_execute_transfer,
  beneficiary_only,
  readiness_status,
  metadata
)
values (
  'davis_family',
  'The Davis Family',
  'Uganda',
  'beneficiary',
  array['own_donation_page','own_campaign_view','own_donation_history','own_transfer_history','own_evidence','payout_rail_status','receipt_confirmation']::text[],
  false,
  false,
  false,
  true,
  'readiness_check',
  jsonb_build_object(
    'primary_contact_label','Teighlor Davis',
    'location','Mityana, Uganda',
    'financial_access','view-own-only; payout execution owner-controlled',
    'current_oneworldz_story_focus',true
  )
)
on conflict (participant_key) do update set
  display_name = excluded.display_name,
  country = excluded.country,
  role = excluded.role,
  access_scope = excluded.access_scope,
  can_prepare_transfer = false,
  can_approve_transfer = false,
  can_execute_transfer = false,
  beneficiary_only = true,
  metadata = public.fundsprepare_participants.metadata || excluded.metadata,
  updated_at = now();

update public.fundsprepare_participants
set
  access_scope = array['own_donation_page','own_campaign_view','own_donation_history','own_transfer_history','own_evidence','payout_rail_status','receipt_confirmation']::text[],
  can_prepare_transfer = false,
  can_approve_transfer = false,
  can_execute_transfer = false,
  beneficiary_only = true,
  metadata = metadata || jsonb_build_object(
    'financial_access','view-own-only; payout execution owner-controlled',
    'mobile_money_rails','MTN Uganda + Airtel Money'
  ),
  updated_at = now()
where participant_key = 'reagan';

create table if not exists public.fundsprepare_beneficiary_access (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.fundsprepare_participants(id) on delete cascade,
  stream_id uuid not null references public.funding_streams(id) on delete cascade,
  auth_user_id uuid null references auth.users(id) on delete set null,
  status text not null default 'awaiting_identity_link' check (status in ('awaiting_identity_link','invited','active','suspended','revoked')),
  capabilities jsonb not null default '{}'::jsonb,
  invited_at timestamptz null,
  activated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, stream_id)
);

alter table public.fundsprepare_beneficiary_access enable row level security;

drop policy if exists "No direct client access to beneficiary access registry" on public.fundsprepare_beneficiary_access;
create policy "No direct client access to beneficiary access registry"
on public.fundsprepare_beneficiary_access
for all
to anon, authenticated
using (false)
with check (false);

insert into public.fundsprepare_beneficiary_access (participant_id, stream_id, status, capabilities)
select p.id, s.id, 'awaiting_identity_link', jsonb_build_object(
  'view_own_donation_page',true,
  'view_own_campaign',true,
  'view_own_donation_history',true,
  'view_own_transfer_history',true,
  'view_own_evidence',true,
  'view_payout_rail_status',true,
  'confirm_receipt',true,
  'request_payout',false,
  'approve_payout',false,
  'execute_payout',false
)
from public.fundsprepare_participants p
join public.funding_streams s on s.stream_key = 'reagan_direct_impact'
where p.participant_key = 'reagan'
on conflict (participant_id, stream_id) do update set
  capabilities = excluded.capabilities,
  updated_at = now();

insert into public.fundsprepare_beneficiary_access (participant_id, stream_id, status, capabilities)
select p.id, s.id, 'awaiting_identity_link', jsonb_build_object(
  'view_own_donation_page',true,
  'view_own_campaign',true,
  'view_own_donation_history',true,
  'view_own_transfer_history',true,
  'view_own_evidence',true,
  'view_payout_rail_status',true,
  'confirm_receipt',true,
  'request_payout',false,
  'approve_payout',false,
  'execute_payout',false
)
from public.fundsprepare_participants p
join public.funding_streams s on s.stream_key = 'davis_family'
where p.participant_key = 'davis_family'
on conflict (participant_id, stream_id) do update set
  capabilities = excluded.capabilities,
  updated_at = now();

insert into public.fundsprepare_rails (
  rail_key, display_name, rail_type, provider, linked_stream_id, owner_label, currency, status, external_reference, metadata
)
select
  x.rail_key,
  x.display_name,
  'mobile_money_payout',
  'WorldRemit',
  s.id,
  x.owner_label,
  'UGX',
  'recipient_details_required',
  null,
  jsonb_build_object(
    'network',x.network,
    'country','Uganda',
    'owner_approval_required',true,
    'execution_mode','owner_approved_manual_first',
    'recipient_account_details_storage','provider_secure_only',
    'recipient_account_must_be_registered_and_active',true,
    'receipt_evidence_required',true,
    'automation_status','disabled_until_provider_and_compliance_verification'
  )
from (
  values
    ('reagan_mtn_momo','Reagan — MTN Uganda Mobile Money','Reagan','MTN Uganda','reagan_direct_impact'),
    ('reagan_airtel_money','Reagan — Airtel Money','Reagan','Airtel Money','reagan_direct_impact'),
    ('davis_mtn_momo','Davis Family — MTN Uganda Mobile Money','The Davis Family','MTN Uganda','davis_family'),
    ('davis_airtel_money','Davis Family — Airtel Money','The Davis Family','Airtel Money','davis_family')
) as x(rail_key,display_name,owner_label,network,stream_key)
join public.funding_streams s on s.stream_key = x.stream_key
on conflict (rail_key) do update set
  display_name = excluded.display_name,
  provider = excluded.provider,
  linked_stream_id = excluded.linked_stream_id,
  owner_label = excluded.owner_label,
  currency = excluded.currency,
  metadata = public.fundsprepare_rails.metadata || excluded.metadata,
  updated_at = now();

create table if not exists public.fundsprepare_historical_transfers (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references public.funding_streams(id) on delete cascade,
  beneficiary_participant_id uuid not null references public.fundsprepare_participants(id) on delete cascade,
  rail_id uuid null references public.fundsprepare_rails(id) on delete set null,
  source_provider text not null,
  external_transfer_reference text null,
  rail_network text null,
  sent_amount numeric(20,4) null,
  sent_currency text null,
  received_amount numeric(20,4) null,
  received_currency text null,
  sent_at timestamptz null,
  status text not null default 'import_pending' check (status in ('import_pending','verified','recipient_confirmed','evidence_complete','excluded')),
  source_email_message_id text null,
  receipt_file_name text null,
  evidence_locator text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists fundsprepare_historical_transfers_external_ref_uidx
on public.fundsprepare_historical_transfers (source_provider, external_transfer_reference)
where external_transfer_reference is not null;

alter table public.fundsprepare_historical_transfers enable row level security;

drop policy if exists "No direct client access to historical transfers" on public.fundsprepare_historical_transfers;
create policy "No direct client access to historical transfers"
on public.fundsprepare_historical_transfers
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.guard_fundsprepare_owner_approval()
returns trigger
language plpgsql
set search_path to 'public','pg_temp'
as $$
begin
  if new.status in ('owner_approved','sent','recipient_confirmed','evidence_complete') then
    if new.owner_approved_by is null or new.owner_approved_at is null then
      raise exception 'Owner approval is required before payout progression';
    end if;
  end if;

  if new.status in ('sent','recipient_confirmed','evidence_complete') then
    if new.executed_by is null or new.executed_at is null then
      raise exception 'Execution record is required before payout can be marked sent';
    end if;
  end if;

  if new.status = 'evidence_complete' and new.evidence_complete is distinct from true then
    raise exception 'Evidence must be complete before closing payout evidence';
  end if;

  return new;
end;
$$;

drop trigger if exists fundsprepare_owner_approval_guard on public.fundsprepare_transfer_requests;
create trigger fundsprepare_owner_approval_guard
before insert or update on public.fundsprepare_transfer_requests
for each row execute function public.guard_fundsprepare_owner_approval();