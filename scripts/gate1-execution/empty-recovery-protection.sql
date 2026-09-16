-- Empty destination only; NOT a production migration or a restore wrapper.
-- Bind the new project/creation receipt and the TLS connection BEFORE submission.
-- One submission only. A lost response requires readback, never blind replay.
BEGIN;
SET LOCAL statement_timeout = '10000ms';
SET LOCAL lock_timeout = '3000ms';
SET LOCAL search_path = pg_catalog;
SET LOCAL row_security = off;
DO $guard$
BEGIN
  IF current_user <> 'postgres' OR (SELECT rolsuper FROM pg_roles WHERE rolname = current_user)
     OR current_setting('server_version_num')::int / 10000 <> 17
     OR to_regnamespace('gate1_restore_guard') IS NOT NULL
     OR to_regclass('auth.users') IS NULL OR to_regclass('storage.buckets') IS NULL
     OR to_regclass('storage.objects') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin')
  THEN RAISE EXCEPTION 'EMPTY_RECOVERY_PRECONDITION'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users) OR EXISTS (SELECT 1 FROM storage.buckets)
     OR EXISTS (SELECT 1 FROM storage.objects)
  THEN RAISE EXCEPTION 'EMPTY_RECOVERY_OCCUPIED'; END IF;
END
$guard$;
CREATE SCHEMA gate1_restore_guard AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA gate1_restore_guard FROM PUBLIC, anon, authenticated, service_role, supabase_auth_admin;
GRANT USAGE ON SCHEMA gate1_restore_guard TO supabase_auth_admin;
CREATE FUNCTION gate1_restore_guard.deny_delivery(event jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SECURITY INVOKER
SET search_path = pg_catalog
AS $deny$SELECT '{"error":{"http_code":403,"message":"RECOVERY_DELIVERY_DISABLED"}}'::jsonb;$deny$;
REVOKE ALL ON FUNCTION gate1_restore_guard.deny_delivery(jsonb) FROM PUBLIC, anon, authenticated, service_role, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION gate1_restore_guard.deny_delivery(jsonb) TO supabase_auth_admin;
COMMIT;
