create table if not exists public.worldz_fallback_registry (
  slug text primary key,
  display_name text not null,
  primary_url text,
  fallback_url text not null,
  build_sha text not null,
  status text not null default 'verified_live'
    check (status in ('verified_live','custom_domain_live','custom_domain_pending','disabled')),
  verified_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.worldz_fallback_registry enable row level security;
revoke all on public.worldz_fallback_registry from public;
grant select on public.worldz_fallback_registry to anon, authenticated, service_role;
grant insert, update, delete on public.worldz_fallback_registry to service_role;

drop policy if exists worldz_fallback_registry_public_read on public.worldz_fallback_registry;
create policy worldz_fallback_registry_public_read
on public.worldz_fallback_registry
for select
to anon, authenticated
using (status <> 'disabled');

insert into public.worldz_fallback_registry
  (slug, display_name, primary_url, fallback_url, build_sha, status, metadata)
values
('oneworldz','OneWorldz','https://OneWorldz.com','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?mode=mission&world=oneworldz','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{"route":"mission"}'),
('jayjayteamdev','JayJayTeamDev','https://OneWorldz.com/?page=jayjayteamdev','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?page=jayjayteamdev','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{"effort_index_percent":365,"effort_index_type":"self_reported_motivational"}'),
('cryptoworldz','CryptoWorldz','https://CryptoWorldz.xyz','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?world=cryptoworldz&mode=markets','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{}'),
('purple-diamond-crew','Purple Diamond Crew','https://PurpleDiamondCrew.com','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?site=pdc','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{"hope_chest_image":true}'),
('solworldz','SolWorldz','https://SolWorldz.xyz','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?world=solworldz&mode=world','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{}'),
('ethworldz','EthWorldz','https://EthWorldz.xyz','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?world=ethworldz&mode=coming-soon','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{}'),
('baseworldz','BaseWorldz','https://BaseWorldz.xyz','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?world=baseworldz&mode=coming-soon','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{}'),
('bnbworldz','BNBWorldz','https://BNBWorldz.xyz','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?world=bnbworldz&mode=coming-soon','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{}'),
('xrpworldz','XRPWorldz','https://XRPWorldz.xyz','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?world=xrpworldz&mode=coming-soon','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{}'),
('suiworldz','SuiWorldz','https://SuiWorldz.xyz','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?world=suiworldz&mode=coming-soon','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{}'),
('hyperworldz','HyperWorldz','https://HyperWorldz.xyz','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?world=hyperworldz&mode=coming-soon','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{}'),
('robinworldz','RobinWorldz','https://RobinWorldz.xyz','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?world=robinworldz&mode=coming-soon','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{}'),
('bitcoinworldz','BitcoinWorldz','https://BitcoinWorldz.xyz','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?world=bitcoinworldz&mode=coming-soon','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{}'),
('bitworldz','BitWorldz','https://BitWorldz.xyz','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?world=bitworldz&mode=coming-soon','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{}'),
('hodlerworldz','HodlerWorldz','https://HodlerWorldz.xyz','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?world=hodlerworldz&mode=coming-soon','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{}'),
('impactbased','ImpactBased','https://ImpactBased.OneWorldz.com','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?world=impactbased&mode=impact','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{}'),
('robinhoodlaw','Robin Hood Law','https://Law.OneWorldz.com','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?world=robinhoodlaw&mode=law','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{}'),
('learnworldz','LearnWorldz','https://Learn.OneWorldz.com','https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/index.html?world=learnworldz&mode=learn','b4950719f1280511b17dfa36d7835366404d3bfc','verified_live','{}')
on conflict (slug) do update set
  display_name = excluded.display_name,
  primary_url = excluded.primary_url,
  fallback_url = excluded.fallback_url,
  build_sha = excluded.build_sha,
  status = excluded.status,
  verified_at = now(),
  metadata = excluded.metadata,
  updated_at = now();

update public.community_projects
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
  'verified_fallback_directory',
  'https://raw.githack.com/CryptoWorldz/CryptoWorldz-Bot/b4950719f1280511b17dfa36d7835366404d3bfc/apps/cryptoworldz-web-core/live.html',
  'verified_fallback_build',
  'b4950719f1280511b17dfa36d7835366404d3bfc'
), updated_at = now()
where slug in ('cryptoworldz','oneworldz','jayjayteamdev','purple-diamond-crew','recover-your-debt','solworldz');
