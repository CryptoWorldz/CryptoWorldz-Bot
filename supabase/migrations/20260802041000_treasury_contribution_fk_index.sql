-- Cover the treasury contribution foreign key used by reconciliation queries.
create index if not exists treasury_contributions_account_idx
  on public.treasury_contributions(treasury_account_id);
