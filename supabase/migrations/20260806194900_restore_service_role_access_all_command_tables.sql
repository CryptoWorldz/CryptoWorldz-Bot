-- Restore the server-only service role privileges required by the Zed, Grace,
-- Auto, referrals, WorldzCast, website registry and executive control systems.
-- RLS remains enabled and public anon access is not expanded by this migration.

grant usage on schema public to service_role;

grant select, insert, update, delete, truncate, references, trigger
on all tables in schema public
to service_role;

grant usage, select, update
on all sequences in schema public
to service_role;

grant execute
on all functions in schema public
to service_role;

alter default privileges in schema public
grant select, insert, update, delete, truncate, references, trigger
on tables to service_role;

alter default privileges in schema public
grant usage, select, update
on sequences to service_role;

alter default privileges in schema public
grant execute
on functions to service_role;
