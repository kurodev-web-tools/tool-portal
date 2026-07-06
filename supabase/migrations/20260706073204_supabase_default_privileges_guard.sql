-- Kuro Stream Kit / Comment Translator: future public object default privileges guard.
-- Reviewable local migration file only. Do not apply to a remote Supabase project
-- without same-thread approval and target-owner confirmation.
--
-- Existing public tables keep their current explicit grants and RLS policies.
-- This guard only changes defaults for future objects created by the postgres
-- owner role in the public schema. If a remote project creates migration objects
-- with a different owner role, add the equivalent ALTER DEFAULT PRIVILEGES block
-- for that owner in the approved remote apply plan.

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;
