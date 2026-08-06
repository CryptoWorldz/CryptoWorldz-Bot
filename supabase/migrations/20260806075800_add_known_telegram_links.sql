update public.community_projects
set metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{telegram_links}',
  '[
    {"label":"CryptoWorldz HQ","url":"https://t.me/CryptoWorldzHQ"},
    {"label":"CryptoWorldz Raaiiidd Team","url":"https://t.me/CryptoWorldzRaaiiiddTeam"}
  ]'::jsonb,
  true
)
where slug = 'cryptoworldz';
