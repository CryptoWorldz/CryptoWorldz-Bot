create or replace function public.set_cryptoworldz_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

revoke all on function public.set_cryptoworldz_updated_at() from public;
