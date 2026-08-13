-- Task 6 additive circuit semantics override.
-- A successful closed-circuit request does not erase eligible failures that
-- remain inside the 60-second window. Only a successful half-open probe
-- resets the failure history. Remote application is a separate approval gate.

create or replace function public.ct_paid_record_provider_circuit_success(
  p_provider text,
  p_probe_attempt_id text default null,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_circuit public.comment_translator_paid_provider_circuits%rowtype;
  v_receipt public.comment_translator_paid_attempt_receipts%rowtype;
begin
  p_now := statement_timestamp();
  select *
    into v_circuit
    from public.comment_translator_paid_provider_circuits
   where provider = p_provider
   for update;
  if v_circuit.provider is null then
    return false;
  end if;
  if v_circuit.circuit_state = 'disabled' then
    return true;
  end if;
  if v_circuit.circuit_state = 'degraded' then
    return false;
  end if;
  if v_circuit.circuit_state = 'closed' then
    return true;
  end if;
  if v_circuit.circuit_state <> 'half_open' then
    return false;
  end if;
  if v_circuit.probe_attempt_id is distinct from p_probe_attempt_id
    or v_circuit.probe_lease_until is null
    or v_circuit.probe_lease_until <= p_now
  then
    return false;
  end if;

  select *
    into v_receipt
    from public.comment_translator_paid_attempt_receipts
   where attempt_id = p_probe_attempt_id
     and provider_kind = case
       when p_provider = 'openai' then 'openai_attempt'
       when p_provider = 'azure_fallback' then 'azure_direct_fallback'
       else null
     end
     and attempt_state = 'committed'
     and provider_failure_class is null
   order by provider_attempt
   limit 1
   for update;
  if v_receipt.id is null then
    return false;
  end if;

  update public.comment_translator_paid_provider_circuits
     set circuit_state = 'closed',
         failure_count = 0,
         window_started_at = null,
         degraded_until = null,
         probe_attempt_id = null,
         probe_lease_until = null,
         last_error_class = null,
         updated_at = p_now
   where provider = p_provider;
  return found;
end;
$$;
