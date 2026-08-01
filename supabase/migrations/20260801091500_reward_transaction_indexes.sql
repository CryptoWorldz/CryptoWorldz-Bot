-- Cover reward ledger foreign keys used by history and retention operations.
create index if not exists reward_transactions_mission_id_idx
  on public.reward_transactions (mission_id);
