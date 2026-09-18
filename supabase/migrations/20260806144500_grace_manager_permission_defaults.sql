-- Ensure every future Grace Controller receives only the scoped Grace permissions.

create or replace function public.sync_grace_manager_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role = 'grace_manager' and new.status = 'active' then
    insert into public.bot_admin_permissions
      (telegram_id, permission, enabled, set_by, updated_at)
    select
      new.telegram_id,
      permission,
      true,
      coalesce(new.added_by, 8029135300),
      now()
    from (values
      ('communication.broadcast'::text),
      ('grace.view'::text),
      ('grace.draft'::text),
      ('grace.schedule'::text),
      ('grace.approve'::text),
      ('grace.results'::text)
    ) as defaults(permission)
    on conflict (telegram_id, permission) do update set
      enabled = true,
      set_by = excluded.set_by,
      updated_at = now();
  end if;
  return new;
end;
$$;

revoke all on function public.sync_grace_manager_permissions() from public, anon, authenticated;
grant execute on function public.sync_grace_manager_permissions() to service_role;

drop trigger if exists sync_grace_manager_permissions_trigger on public.bot_admins;
create trigger sync_grace_manager_permissions_trigger
after insert or update of role, status on public.bot_admins
for each row
execute function public.sync_grace_manager_permissions();

-- Re-apply the defaults to all currently active Grace Controllers.
update public.bot_admins
set updated_at = now()
where role = 'grace_manager' and status = 'active';
