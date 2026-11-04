-- SPARKY canonical settings and Community AI preset migration.
-- Keep legacy columns/tables intact so existing groups, memberships and payment history survive.
alter table public.zed_chat_settings
  add column if not exists sparky_enabled boolean not null default true;

update public.zed_chat_settings
set sparky_enabled = dipshit_enabled
where dipshit_enabled is not null;

update public.community_suite_ai_profiles
set preset_key = 'sparky'
where preset_key = 'dipshit';
