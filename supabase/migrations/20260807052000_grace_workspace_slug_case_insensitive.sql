create extension if not exists citext;

alter table public.grace_workspaces
  alter column slug type citext using slug::citext;
