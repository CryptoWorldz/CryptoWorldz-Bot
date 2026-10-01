-- Worldz Votes Centre™ — DEX-style hourly favourite-token voting.
-- One Telegram user may cast one token vote per rolling 60 minutes.
-- Historical votes remain intact; governance data is not part of this voting path.

alter table public.worldz_popularity_votes
  drop constraint if exists worldz_popularity_votes_token_id_telegram_id_voted_on_key;

create index if not exists worldz_popularity_votes_telegram_created_idx
  on public.worldz_popularity_votes (telegram_id, created_at desc);

create or replace function public.worldz_popularity_vote_hourly_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vote_time timestamptz := coalesce(new.created_at, now());
begin
  -- Serialize votes for one Telegram user so simultaneous requests cannot bypass the hour gate.
  perform pg_advisory_xact_lock(new.telegram_id);

  if exists (
    select 1
    from public.worldz_popularity_votes v
    where v.telegram_id = new.telegram_id
      and v.created_at > v_vote_time - interval '60 minutes'
      and v.created_at <= v_vote_time
  ) then
    raise exception 'worldz_hourly_vote_limit'
      using errcode = 'P0001',
            hint = 'One favourite-token vote is allowed per Telegram user every rolling 60 minutes.';
  end if;

  new.created_at := v_vote_time;
  new.voted_on := (timezone('utc', v_vote_time))::date;
  return new;
end;
$$;

drop trigger if exists trg_worldz_popularity_vote_hourly_guard
  on public.worldz_popularity_votes;

create trigger trg_worldz_popularity_vote_hourly_guard
before insert on public.worldz_popularity_votes
for each row execute function public.worldz_popularity_vote_hourly_guard();

comment on table public.worldz_popularity_votes is
'Worldz Votes Centre™ DEX-style favourite-token votes. One vote per Telegram user per rolling 60 minutes. Sponsored exposure is separate; this table grants no treasury or DAO authority.';
