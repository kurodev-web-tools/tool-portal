-- Task 6 additive circuit authority seam.
-- A failure from a half-open probe must prove that it still owns the probe lease.
-- Remote application is a separate approval gate and is intentionally not run here.

create or replace function public.ct_paid_record_provider_circuit_failure_owned(
  p_provider text,
  p_error_class text,
  p_probe_attempt_id text,
  p_now timestamptz default now()
)
returns table (
  provider text,
  circuit_state text,
  failure_count integer,
  window_started_at timestamptz,
  degraded_until timestamptz,
  probe_attempt_id text,
  probe_lease_until timestamptz,
  last_error_class text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  circuit public.comment_translator_paid_provider_circuits%rowtype;
  ignored_state text;
begin
  p_now := statement_timestamp();
  if p_provider not in ('openai', 'azure_fallback') then
    raise exception 'provider circuit is not valid';
  end if;
  if p_error_class not in ('network', 'timeout', 'rate-limit', 'server-error', 'quota', 'configuration', 'policy') then
    raise exception 'error class is not valid';
  end if;
  if p_probe_attempt_id is not null
    and (length(trim(p_probe_attempt_id)) = 0 or length(p_probe_attempt_id) > 200)
  then
    raise exception 'provider circuit probe attempt is not valid';
  end if;

  select *
    into circuit
    from public.comment_translator_paid_provider_circuits as circuit_row
   where circuit_row.provider = p_provider
   for update;
  if circuit.provider is null then
    raise exception 'provider circuit is not configured';
  end if;

  if circuit.circuit_state = 'half_open'
    and (
      p_probe_attempt_id is null
      or circuit.probe_attempt_id is distinct from p_probe_attempt_id
      or circuit.probe_lease_until is null
      or circuit.probe_lease_until <= p_now
    )
  then
    return query
    select
      circuit.provider,
      circuit.circuit_state,
      circuit.failure_count,
      circuit.window_started_at,
      circuit.degraded_until,
      circuit.probe_attempt_id,
      circuit.probe_lease_until,
      circuit.last_error_class;
    return;
  end if;

  select public.ct_paid_record_provider_circuit_failure(
    p_provider,
    p_error_class,
    p_now
  ) into ignored_state;

  return query
  select
    circuit_row.provider,
    circuit_row.circuit_state,
    circuit_row.failure_count,
    circuit_row.window_started_at,
    circuit_row.degraded_until,
    circuit_row.probe_attempt_id,
    circuit_row.probe_lease_until,
    circuit_row.last_error_class
    from public.comment_translator_paid_provider_circuits as circuit_row
   where circuit_row.provider = p_provider;
end;
$$;

revoke all on function public.ct_paid_record_provider_circuit_failure_owned(text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.ct_paid_record_provider_circuit_failure_owned(text,text,text,timestamptz) to service_role;
