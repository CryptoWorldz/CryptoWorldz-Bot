alter table public.oneworldz_support_profiles
  add column if not exists facebook_object_id text,
  add column if not exists preview_title text,
  add column if not exists preview_description text,
  add column if not exists preview_image_url text,
  add column if not exists preview_verified_at timestamptz,
  add column if not exists preview_source text,
  add column if not exists preview_status text not null default 'pending';

alter table public.oneworldz_support_profiles
  drop constraint if exists oneworldz_support_profiles_preview_status_check;

alter table public.oneworldz_support_profiles
  add constraint oneworldz_support_profiles_preview_status_check
  check (preview_status in ('pending','verified','restricted','unavailable','error'));

create index if not exists oneworldz_support_profiles_preview_status_idx
  on public.oneworldz_support_profiles(preview_status, display_order);
