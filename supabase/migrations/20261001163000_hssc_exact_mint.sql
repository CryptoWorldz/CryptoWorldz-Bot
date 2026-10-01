-- Record the exact HSSC mint already supplied for Hope St Support Coin.
-- Registry only: this migration does not enable transfers, swaps, or treasury execution.

insert into public.shill_reward_tokens(symbol, display_name, token_mint, enabled, points_per_verified_share)
values (
  'HSSC',
  'Hope St Support Coin',
  '29xKqmkvhYvMgWMqHgUoimzfBxweLUvcASAJUHHSkJMW',
  true,
  5
)
on conflict (symbol) do update
set display_name = excluded.display_name,
    token_mint = excluded.token_mint,
    enabled = true,
    updated_at = now();
