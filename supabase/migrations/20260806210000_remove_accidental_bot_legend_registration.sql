delete from public.users u
where u.telegram_id = 1087968824
  and lower(coalesce(u.username, '')) = 'groupanonymousbot'
  and not exists (
    select 1 from public.mission_submissions s where s.telegram_id = u.telegram_id
  )
  and not exists (
    select 1 from public.rewards r where r.telegram_id = u.telegram_id
  )
  and not exists (
    select 1 from public.reward_transactions rt where rt.telegram_id = u.telegram_id
  )
  and not exists (
    select 1 from public.governance_votes gv where gv.telegram_id = u.telegram_id
  )
  and not exists (
    select 1 from public.treasury_contributions tc where tc.telegram_id = u.telegram_id
  );
