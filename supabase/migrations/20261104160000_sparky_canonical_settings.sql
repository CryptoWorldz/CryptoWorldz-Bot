-- SPARKY canonical settings and Community AI preset migration.
-- Keep legacy membership tables, payment references and compatibility columns intact.
alter table public.zed_chat_settings
  add column if not exists sparky_enabled boolean not null default true;

update public.zed_chat_settings
set sparky_enabled = dipshit_enabled
where dipshit_enabled is not null;

-- The previous CHECK constraint rejects the new canonical preset value.
alter table public.community_suite_ai_profiles
  drop constraint if exists community_suite_ai_profiles_preset_key_check;

alter table public.community_suite_ai_profiles
  add constraint community_suite_ai_profiles_preset_key_check
  check (preset_key in ('no5','sparky','dipshit','alice','rex','grace','max','custom'));

-- Existing customer selections move to Sparky. The legacy value remains accepted
-- temporarily for older clients during the compatibility window.
update public.community_suite_ai_profiles
set preset_key = 'sparky'
where preset_key = 'dipshit';
