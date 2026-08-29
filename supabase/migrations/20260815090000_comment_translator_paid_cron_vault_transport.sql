-- Comment Translator Paid Core v1: runtime-only Supabase Cron secret transport.
-- This migration creates no scheduler and stores no secret values.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create or replace function private.ct_paid_invoke_maintenance_from_vault()
returns void
language plpgsql
security definer
set search_path = pg_catalog, private, vault
as $$
declare
    v_maintenance_url_count integer;
    v_cron_token_count integer;
    v_maintenance_url text;
    v_cron_token text;
begin
    select
      count(*) filter (
        where name = 'comment_translator_paid_maintenance_url'
      )::integer,
      count(*) filter (
        where name = 'comment_translator_paid_cron_token'
      )::integer,
      max(decrypted_secret) filter (
        where name = 'comment_translator_paid_maintenance_url'
      ),
      max(decrypted_secret) filter (
        where name = 'comment_translator_paid_cron_token'
      )
      into
        v_maintenance_url_count,
        v_cron_token_count,
        v_maintenance_url,
        v_cron_token
      from vault.decrypted_secrets
     where name in (
       'comment_translator_paid_maintenance_url',
       'comment_translator_paid_cron_token'
     );

    if v_maintenance_url_count <> 1
      or v_cron_token_count <> 1
      or v_maintenance_url is null
      or pg_catalog.btrim(v_maintenance_url) = ''
      or v_cron_token is null
      or pg_catalog.btrim(v_cron_token) = ''
    then
      raise exception 'paid maintenance secret references are not configured';
    end if;

    perform public.ct_paid_invoke_maintenance_http(
      v_maintenance_url,
      v_cron_token,
      'supabase-cron'
    );
end;
$$;

revoke all on function private.ct_paid_invoke_maintenance_from_vault()
  from public, anon, authenticated, service_role;
grant execute on function private.ct_paid_invoke_maintenance_from_vault()
  to service_role;

comment on function private.ct_paid_invoke_maintenance_from_vault() is
  'Paid maintenance transport contract: read the two named Vault references only at invocation time, delegate to the existing supabase-cron HTTP RPC, and never return or log secret values, URLs, request IDs, or scheduler payloads. No Cron job is created by this migration.';
