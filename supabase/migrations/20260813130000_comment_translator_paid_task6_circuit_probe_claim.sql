-- Task 6 additive circuit authority seam.
-- Remote application is a separate approval gate and is intentionally not run here.

create or replace function public.ct_paid_read_provider_circuit(
  p_provider text
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
begin
  if p_provider not in ('openai', 'azure_fallback') then
    raise exception 'provider circuit is not valid';
  end if;
  if not exists (
    select 1
      from public.comment_translator_paid_provider_circuits
     where comment_translator_paid_provider_circuits.provider = p_provider
  ) then
    raise exception 'provider circuit is not configured';
  end if;

  return query
  select
    circuit.provider,
    circuit.circuit_state,
    circuit.failure_count,
    circuit.window_started_at,
    circuit.degraded_until,
    circuit.probe_attempt_id,
    circuit.probe_lease_until,
    circuit.last_error_class
    from public.comment_translator_paid_provider_circuits as circuit
   where circuit.provider = p_provider;
end;
$$;

create or replace function public.ct_paid_claim_provider_circuit_probe(
  p_provider text,
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
begin
  p_now := statement_timestamp();
  if p_provider not in ('openai', 'azure_fallback') then
    raise exception 'provider circuit is not valid';
  end if;
  if p_probe_attempt_id is null
    or length(trim(p_probe_attempt_id)) = 0
    or length(p_probe_attempt_id) > 200
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

  if circuit.circuit_state = 'degraded'
    and circuit.degraded_until is not null
    and circuit.degraded_until <= p_now
  then
    update public.comment_translator_paid_provider_circuits as circuit_row
       set circuit_state = 'half_open',
           probe_attempt_id = p_probe_attempt_id,
           probe_lease_until = p_now + interval '120 seconds',
           updated_at = p_now
     where circuit_row.provider = p_provider;
  elsif circuit.circuit_state = 'half_open'
    and (circuit.probe_lease_until is null or circuit.probe_lease_until <= p_now)
  then
    update public.comment_translator_paid_provider_circuits as circuit_row
       set probe_attempt_id = p_probe_attempt_id,
           probe_lease_until = p_now + interval '120 seconds',
           updated_at = p_now
     where circuit_row.provider = p_provider;
  end if;

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

revoke all on function public.ct_paid_read_provider_circuit(text) from public, anon, authenticated;
grant execute on function public.ct_paid_read_provider_circuit(text) to service_role;
revoke all on function public.ct_paid_claim_provider_circuit_probe(text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.ct_paid_claim_provider_circuit_probe(text,text,timestamptz) to service_role;
