create or replace function public.zed_runtime_bootstrap(p_bot_token text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  response extensions.http_response;
  payload jsonb;
  derived text;
  bot_id bigint;
begin
  if p_bot_token is null or p_bot_token !~ '^[0-9]{5,15}:[A-Za-z0-9_-]{20,}$' then
    return false;
  end if;

  response := extensions.http_get(('https://api.telegram.org/bot' || p_bot_token || '/getMe')::varchar);
  if response.status <> 200 then return false; end if;
  payload := response.content::jsonb;
  if coalesce((payload->>'ok')::boolean, false) is not true then return false; end if;
  bot_id := nullif(payload#>>'{result,id}','')::bigint;
  if bot_id is null then return false; end if;

  derived := encode(extensions.digest(convert_to('zed-runtime-v1:' || p_bot_token, 'UTF8'), 'sha256'), 'hex');
  insert into zed_private.runtime_auth(id, secret_hash, telegram_bot_id)
  values(true, derived, bot_id)
  on conflict (id) do update
    set secret_hash = excluded.secret_hash
    where zed_private.runtime_auth.telegram_bot_id = excluded.telegram_bot_id;

  return exists(
    select 1 from zed_private.runtime_auth
    where id = true and telegram_bot_id = bot_id and secret_hash = derived
  );
end;
$function$;
