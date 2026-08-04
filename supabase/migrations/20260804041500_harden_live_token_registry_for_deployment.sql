create or replace function public.set_cryptoworldz_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_cryptoworldz_updated_at() from public;

drop trigger if exists ecosystem_worlds_set_updated_at on public.ecosystem_worlds;
create trigger ecosystem_worlds_set_updated_at
before update on public.ecosystem_worlds
for each row execute function public.set_cryptoworldz_updated_at();

drop trigger if exists impact_projects_set_updated_at on public.impact_projects;
create trigger impact_projects_set_updated_at
before update on public.impact_projects
for each row execute function public.set_cryptoworldz_updated_at();

drop trigger if exists ecosystem_tokens_set_updated_at on public.ecosystem_tokens;
create trigger ecosystem_tokens_set_updated_at
before update on public.ecosystem_tokens
for each row execute function public.set_cryptoworldz_updated_at();

alter table public.ecosystem_tokens
  drop constraint if exists ecosystem_tokens_nonblank_identity_check,
  add constraint ecosystem_tokens_nonblank_identity_check
  check (
    btrim(name) <> ''
    and btrim(symbol) <> ''
    and btrim(chain_id) <> ''
    and (contract_address is null or btrim(contract_address) <> '')
  );

alter table public.ecosystem_tokens
  drop constraint if exists ecosystem_tokens_live_verification_check,
  add constraint ecosystem_tokens_live_verification_check
  check (
    launch_status <> 'live'
    or (
      contract_address is not null
      and verified_at is not null
      and (
        nullif(btrim(coalesce(dexscreener_url, '')), '') is not null
        or nullif(btrim(coalesce(pair_address, '')), '') is not null
        or nullif(btrim(coalesce(trade_url, '')), '') is not null
      )
    )
  );
