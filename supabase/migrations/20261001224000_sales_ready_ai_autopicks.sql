-- Sales-ready Community AI Auto Pick profiles.
-- Existing customer profiles remain custom unless an admin explicitly selects a preset.

alter table public.community_suite_ai_profiles
  add column if not exists preset_key text not null default 'custom',
  add column if not exists role_label text not null default 'Customer Community Assistant',
  add column if not exists purpose text not null default '';

alter table public.community_suite_ai_profiles
  drop constraint if exists community_suite_ai_profiles_preset_key_check;

alter table public.community_suite_ai_profiles
  add constraint community_suite_ai_profiles_preset_key_check
  check (preset_key in ('no5','dipshit','alice','rex','grace','max','custom'));

comment on column public.community_suite_ai_profiles.preset_key is
  'Ready-made Auto Pick persona or custom customer build. Personality never changes module permissions.';
comment on column public.community_suite_ai_profiles.role_label is
  'Human-readable assistant role shown to the community.';
comment on column public.community_suite_ai_profiles.purpose is
  'Customer-approved purpose statement for the configured community assistant.';
