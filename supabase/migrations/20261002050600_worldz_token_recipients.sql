create table if not exists public.worldz_token_recipients (
  recipient_key text primary key,
  display_name text not null,
  x_handle text,
  wallet_address text not null,
  wallet_valid boolean not null default false,
  recipient_scope text not null default 'WORLDZ_ECOSYSTEM_TOKENS',
  status text not null,
  transfer_enabled boolean not null default false,
  notes text,
  token_symbol text,
  allocation_tokens numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.worldz_token_recipients enable row level security;

insert into public.worldz_token_recipients
(recipient_key,display_name,x_handle,wallet_address,wallet_valid,recipient_scope,status,transfer_enabled,notes)
values
('zikiaa_eth','Zikiaa.eth','@Zikiaa19','H6siGm2Vzwyj4GaL7535ULDpJYgj9fKVDvUuohi9Kn7p',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('cowboygan','CowboyGan',NULL,'Gh6FjHuVVB3MHACJ8dTPMUDejJ6gQXEtMBgXyYAPLokf',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('mystiverse','Mystiverse',NULL,'CS9Df98s9sWCmWjWtLgCNjYMnZkwi9wzyqKfjjmcbyeW',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('shieta','Shieta','@vyurixtaa','AXbhKzWjhFeNPG42sBFgmJsOdeb671vyNWV23L2x7VAi',false,'WORLDZ_ECOSYSTEM_TOKENS','INVALID_ADDRESS_PENDING_CORRECTION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('lmo_sol','LMO.SOL','@fw_lmo171','LmovS36E5iGBDVQchWPiF97WJ81uGGS33tgV5ThKWkK',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('kiyo','kiyo',NULL,'53p6g9CMoPs4D8jYwZW2nYfejZExS4y7oYyZg2RgJkNk',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('jkids','Jkids','@Jkids58','7vqG1cX8Y7YvpqR66G9384X8MTg8nBAXMCmJtwg8hyah',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('valentine','Valentine',NULL,'4rM8yPnTGCuEAptAu1sKxfJWmgG8zLtiHN77JHiAUBPRR',false,'WORLDZ_ECOSYSTEM_TOKENS','INVALID_ADDRESS_PENDING_CORRECTION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('zyro','Zyro','@Zyro_41','9yBQ7Rp8NgK94XaCEFV2VPYJqppSGRxrTW44pJfeH7Sx',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('rish','rish',NULL,'7QeAuqNKhzmlMpMjFm6wUQRuZwtJXUn3KgdinGSzoDfyQ',false,'WORLDZ_ECOSYSTEM_TOKENS','INVALID_ADDRESS_PENDING_CORRECTION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('logan','Logan','@loganstayy','GQrBvqKLrNfFhWG7pZZ2222KukW6GPDvvpBdxiA1ujJK',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('rubel','Rubel','@farukkcp0','EoPdYkvqHrc2f75YingJi7D1dZ3LwPy69vYsoQDUC7wS',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('nychaca','nychaca',NULL,'7ZpRyuPL7T8JJHF7ikUqx5Cohm1u4obY8zSaucwXR5FJ',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('cealum','Cealum',NULL,'GDjJCr8TtXTAA6HKNTuFs9gteexs5j97XE8fLrrxVqSV',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('ridho_alpha','Ridho Alpha',NULL,'4ZH782EEShj4FmCod1eFcKbQsNm4dctwco2aMubpSMXX',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('mei','mei','@mxxnwins','BADR3kkf4d7qv7L9rwZCwyW4rOVUtBCDYtw9M5h5Qi4j',false,'WORLDZ_ECOSYSTEM_TOKENS','INVALID_ADDRESS_PENDING_CORRECTION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('mike_sol','mike.sol',NULL,'88xHWqyNmQXKTn2F7me8dSme86bMMGNDCkDPS9JeBehZ',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('millie','Millie',NULL,'Gsw6dinmXNJrTkiAohdmJa8vwDm5VLCDtWk4LQdR9Cj4',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('udf','UDF',NULL,'CaPhCPgBDjAEXAW6G7W1BLbYoYrsWkfAHZY6CpufkvnL',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('cj','CJ','@CJMamaa','5jNSM268nfCUBoPGzjzHBgRqip6yGqi3yTg9N8PiuAQC',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('raees_crypto','Raees Crypto',NULL,'FaX14qGiKofqRRdtXyRykaz4NHokcSs8KrCfZ2iWd1yR',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('wagmi','WAGMI',NULL,'eW2RQQCS5FEec8VPjEu2E6NNHTxmvLY88EtLBnK63p6',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('yami','yami','@etherYami','57uhVLjyzLufbuUPfVdL4E1TEHWi3XgydEh9GfiTRA5m',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('zorix','Zorix','@NextZorix','6S5bDaggDnqLfteMWX8vntQ5zNsnTkhTbMeF3jyBJnxp',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02'),
('s3an','s3aN_','@Seansbw3','5JAXb7yf62gZKnzUVxYVX583q5TemRaL2kEPowZUQeQu',true,'WORLDZ_ECOSYSTEM_TOKENS','RECORDED_VALID_PENDING_ALLOCATION',false,'Purple Diamond Crew X follower/reply capture — owner approved 2026-10-02')
on conflict (recipient_key) do update set
 display_name=excluded.display_name,
 x_handle=coalesce(excluded.x_handle,public.worldz_token_recipients.x_handle),
 wallet_address=excluded.wallet_address,
 wallet_valid=excluded.wallet_valid,
 recipient_scope=excluded.recipient_scope,
 status=excluded.status,
 transfer_enabled=false,
 notes=excluded.notes,
 updated_at=now();
