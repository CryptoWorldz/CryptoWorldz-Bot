-- Retire RECAP / RecapThisBot from Command Centre control.
-- This does not delete historical content or token records; it removes admin/control authority.

begin;

delete from public.bot_admin_permissions
where telegram_id in (
  select telegram_id
  from public.bot_admins
  where role = 'recap_manager'
);

delete from public.bot_admins
where role = 'recap_manager';

delete from public.partner_profiles
where partner_role = 'recap_manager';

alter table public.bot_admins drop constraint if exists bot_admins_role_check;
alter table public.bot_admins add constraint bot_admins_role_check
  check (role in (
    'owner','admin','moderator','partner_manager','treasury_manager','grace_manager'
  )) not valid;
alter table public.bot_admins validate constraint bot_admins_role_check;

alter table public.partner_profiles drop constraint if exists partner_profiles_partner_role_check;
alter table public.partner_profiles add constraint partner_profiles_partner_role_check
  check (partner_role in ('partner_manager','treasury_manager')) not valid;
alter table public.partner_profiles validate constraint partner_profiles_partner_role_check;

commit;
