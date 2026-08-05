-- CryptoWorldz executive leadership foundation.
-- Additive only: preserves all existing admins, users, roles and permissions.

create table if not exists public.executive_admins (
  telegram_id bigint primary key,
  display_name text not null,
  executive_title text not null default 'Executive Leader',
  responsibility text not null,
  status text not null default 'active' check (status in ('active','disabled')),
  appointed_by bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.executive_admins enable row level security;
revoke all on public.executive_admins from anon, authenticated;
grant all on public.executive_admins to service_role;

insert into public.executive_admins
  (telegram_id, display_name, executive_title, responsibility, status, appointed_by)
values
  (7615025841, 'Stepper', 'Executive Leader', 'Operations Lead', 'active', 8029135300),
  (5978625584, 'Savage', 'Executive Leader', 'Community & Security Lead', 'active', 8029135300)
on conflict (telegram_id) do update set
  display_name = excluded.display_name,
  executive_title = excluded.executive_title,
  responsibility = excluded.responsibility,
  status = 'active',
  appointed_by = excluded.appointed_by,
  updated_at = now();

insert into public.bot_admins (telegram_id, role, status, added_by, updated_at)
values
  (7615025841, 'admin', 'active', 8029135300, now()),
  (5978625584, 'admin', 'active', 8029135300, now())
on conflict (telegram_id) do update set
  role = 'admin',
  status = 'active',
  added_by = excluded.added_by,
  updated_at = now();

with executive_permissions(permission) as (
  values
    ('mission.create'), ('mission.edit'), ('mission.end'),
    ('submission.view'), ('submission.approve'), ('submission.reject'),
    ('communication.broadcast'), ('recap.publish'), ('member.view'), ('report.view'),
    ('treasury.view'), ('treasury.reconcile'), ('partner.report'),
    ('admin.view'), ('admin.manage_scoped'), ('grace.manage')
), executives(telegram_id) as (
  values (7615025841::bigint), (5978625584::bigint)
)
insert into public.bot_admin_permissions
  (telegram_id, permission, enabled, set_by, updated_at)
select executives.telegram_id, executive_permissions.permission, true, 8029135300, now()
from executives cross join executive_permissions
on conflict (telegram_id, permission) do update set
  enabled = true,
  set_by = excluded.set_by,
  updated_at = now();

create index if not exists executive_admins_status_idx
  on public.executive_admins(status, created_at);
