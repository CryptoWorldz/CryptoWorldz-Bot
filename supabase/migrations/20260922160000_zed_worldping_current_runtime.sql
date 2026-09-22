create table if not exists public.zed_group_worldping_settings (
  chat_id bigint primary key,
  mode text not null default 'admins_only' check (mode in ('admins_only', 'full_member')),
  updated_by_telegram_id bigint,
  updated_at timestamptz not null default now()
);

create table if not exists public.zed_group_licences (
  chat_id bigint primary key,
  plan text not null default 'pending' check (plan in ('pending', 'rent', 'rent_to_own', 'own')),
  status text not null default 'pending_review' check (status in ('pending_review', 'active', 'revoked')),
  approved_by_telegram_id bigint,
  approved_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.zed_group_licence_receipts (
  id bigserial primary key,
  chat_id bigint not null,
  receipt_signature text not null unique,
  submitted_by_telegram_id bigint not null,
  submitted_at timestamptz not null default now(),
  status text not null default 'pending_review' check (status in ('pending_review', 'accepted', 'rejected'))
);

alter table public.zed_group_worldping_settings enable row level security;
alter table public.zed_group_licences enable row level security;
alter table public.zed_group_licence_receipts enable row level security;

create index if not exists zed_group_licences_status_expires_idx on public.zed_group_licences(status, expires_at);
create index if not exists zed_group_licence_receipts_chat_status_idx on public.zed_group_licence_receipts(chat_id, status, submitted_at desc);
