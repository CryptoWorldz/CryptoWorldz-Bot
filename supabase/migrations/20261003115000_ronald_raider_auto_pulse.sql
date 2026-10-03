-- Ronald Raider Auto-Pulse
-- Keeps the active Raid resurfacing in Telegram without filling the chat with
-- duplicate cards. The runtime posts a fresh silent pulse, then removes the
-- previous pulse. This state makes the behaviour restart-safe and multi-instance safe.

alter table public.raid_campaigns
  add column if not exists last_pulse_message_id bigint,
  add column if not exists last_pulse_at timestamptz;

create index if not exists raid_campaigns_active_pulse_idx
  on public.raid_campaigns(last_pulse_at asc)
  where status = 'active';

create or replace function public.claim_raid_pulse(
  p_campaign_id bigint,
  p_min_seconds integer default 55
)
returns table(claimed boolean, previous_message_id bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.zed_runtime_authorized() then
    raise exception 'not_authorized';
  end if;

  if p_min_seconds < 30 or p_min_seconds > 3600 then
    raise exception 'invalid_pulse_interval';
  end if;

  select r.last_pulse_message_id
  into v_previous
  from public.raid_campaigns r
  where r.id = p_campaign_id
    and r.status = 'active'
    and (
      r.last_pulse_at is null
      or r.last_pulse_at <= now() - pg_catalog.make_interval(secs => p_min_seconds)
    )
  for update skip locked;

  if not found then
    return query select false, null::bigint;
    return;
  end if;

  update public.raid_campaigns
  set last_pulse_at = now(),
      updated_at = now()
  where id = p_campaign_id;

  return query select true, v_previous;
end;
$$;

revoke all on function public.claim_raid_pulse(bigint, integer) from public, authenticated;
grant execute on function public.claim_raid_pulse(bigint, integer) to anon, service_role;
