-- Task 6 additive Azure reservation override.
--
-- The Task 5 Azure reservation RPC already accepts one uncertain OpenAI
-- receipt. Task 6 can legitimately have two OpenAI receipts when the first
-- attempt is a bounded invalid-response/429 predecessor and the fresh retry
-- becomes uncertain. The retry reservation RPC proves the older receipt is
-- terminal; this narrow override lets Azure reserve while retaining the
-- latest uncertain OpenAI cost/slot/lease.
-- Remote application is a separate approval gate and is intentionally not
-- run in this thread.

do $task6$
declare
  v_definition text;
  v_original text;
begin
  select pg_get_functiondef(p.oid)
    into v_definition
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'ct_paid_azure_direct_fallback'
      and p.pronargs = 9;

  if v_definition is null then
    raise exception 'Task 6 Azure reservation function is unavailable';
  end if;

  v_original := 'if v_openai_receipt_count = 2 then';
  if position(v_original in v_definition) = 0 then
    raise exception 'Task 6 Azure retry receipt guard is unreadable';
  end if;
  v_definition := replace(
    v_definition,
    v_original,
    'if v_openai_receipt_count = 2 and v_shared_attempt.attempt_state <> ''uncertain'' then'
  );

  v_original := 'if v_openai_receipt_count <> 1 then';
  if position(v_original in v_definition) = 0 then
    raise exception 'Task 6 Azure uncertain receipt guard is unreadable';
  end if;
  v_definition := replace(
    v_definition,
    v_original,
    $replacement$if v_openai_receipt_count not in (1, 2) then
         raise exception 'uncertain OpenAI fallback permits one or two OpenAI receipts';
       end if;
       if v_openai_receipt_count = 2
         and exists (
           select 1
             from public.comment_translator_paid_attempt_receipts receipt
            where receipt.attempt_id = p_attempt_id
              and receipt.provider_kind = 'openai_attempt'
              and receipt.provider_attempt <> v_shared_attempt.provider_attempt
              and (
                receipt.owner_user_id <> p_owner_user_id
                or receipt.session_reference_id <> p_session_reference_id
                or receipt.period_start is distinct from p_period_start
                or receipt.period_end is distinct from p_period_end
                or receipt.utc_month <> p_utc_month
                or receipt.attempt_state not in ('committed', 'released')
                or receipt.provider_failure_class is null
                or receipt.provider_failure_class not in ('invalid-response', 'rate-limit')
                or receipt.committed_input_characters <> 0
                or (
                  receipt.attempt_state = 'committed'
                  and (
                    receipt.reserved_cost_micros <> 0
                    or receipt.committed_cost_micros <= 0
                    or not exists (
                      select 1
                        from public.comment_translator_paid_openai_slots slot_row
                       where slot_row.attempt_id = receipt.attempt_id
                         and slot_row.provider_attempt = receipt.provider_attempt
                         and slot_row.slot_state = 'released'
                    )
                    or not exists (
                      select 1
                        from public.comment_translator_paid_openai_rate_reservations rate_row
                       where rate_row.attempt_id = receipt.attempt_id
                         and rate_row.provider_attempt = receipt.provider_attempt
                         and rate_row.reservation_state = 'completed'
                    )
                  )
                )
                or (
                  receipt.attempt_state = 'released'
                  and (
                    receipt.reserved_cost_micros <> 0
                    or receipt.committed_cost_micros <> 0
                    or not exists (
                      select 1
                        from public.comment_translator_paid_openai_slots slot_row
                       where slot_row.attempt_id = receipt.attempt_id
                         and slot_row.provider_attempt = receipt.provider_attempt
                         and slot_row.slot_state = 'released'
                    )
                    or not exists (
                      select 1
                        from public.comment_translator_paid_openai_rate_reservations rate_row
                       where rate_row.attempt_id = receipt.attempt_id
                         and rate_row.provider_attempt = receipt.provider_attempt
                         and rate_row.reservation_state = 'released'
                    )
                  )
                )
              )
         )
       then
         raise exception 'OpenAI retry predecessor is not safely terminal';
       end if;$replacement$
  );

  execute v_definition;
end;
$task6$;
