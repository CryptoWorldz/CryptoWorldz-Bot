update public.community_projects
set website_url = 'https://OneWorldz.com/?page=jayjayteamdev',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'founder_page', 'https://OneWorldz.com/?page=jayjayteamdev',
      'effort_index_percent', 365,
      'effort_index_type', 'self_reported_motivational'
    ),
    updated_at = now()
where slug = 'jayjayteamdev';

update public.community_projects
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'fallback_url', 'https://cryptobotz.cryptoworldz.xyz/purple-diamond-crew/',
      'custom_domain_status', 'dns_ssl_pending'
    ),
    updated_at = now()
where slug = 'purple-diamond-crew';
