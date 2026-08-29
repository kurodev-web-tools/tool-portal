-- Converge the Task 6 Azure fallback guards without editing history.
--
-- A complete hardened definition is an idempotent no-op. The exact canonical
-- legacy definition is repaired. Partial, duplicate, or malformed definitions
-- fail closed. Only the existing nine-argument function definition is rebuilt;
-- ownership, privileges, leases, data, idempotency, and provider boundaries stay
-- unchanged.

do $task6_azure_uncertain_retry_guard_repair$
declare
  v_definition text;
  v_semantic_definition text;
  v_normalized_semantic_definition text;
  v_normalized_hardened_uncertain text;
  v_normalized_bounded_uncertain_opening_stem text;
  v_normalized_bounded_uncertain_opening text;
  v_normalized_legacy_first text;
  v_normalized_legacy_uncertain_opening text;
  v_normalized_legacy_raise text;
  v_legacy_first text := 'if v_openai_receipt_count = 2 then';
  v_legacy_uncertain_opening text := 'if v_openai_receipt_count <> 1 then';
  v_legacy_raise text := 'raise exception ''uncertain OpenAI fallback permits one OpenAI receipt'';';
  v_hardened_first_opening text := 'if v_openai_receipt_count = 2 and v_shared_attempt.attempt_state <> ''uncertain''';
  v_hardened_first text := 'if v_openai_receipt_count = 2 and v_shared_attempt.attempt_state <> ''uncertain'' then';
  v_expected_semantic_hardened_definition_md5 text := '67b6b5732907c2486ec50bf535bc4f55';
  v_semantic_hardened_first_pattern text := $semantic$if[[:space:]]+v_openai_receipt_count[[:space:]]*=[[:space:]]*2[[:space:]]+and[[:space:]]+v_shared_attempt[.]attempt_state[[:space:]]*<>[[:space:]]*'uncertain'[[:space:]]+then$semantic$;
  v_bounded_uncertain_opening_stem text := 'if v_openai_receipt_count not in (1, 2)';
  v_bounded_uncertain_opening text := 'if v_openai_receipt_count not in (1, 2) then';
  v_legacy_uncertain_pattern text := $legacy$if v_openai_receipt_count <> 1 then[[:space:]]+raise exception 'uncertain OpenAI fallback permits one OpenAI receipt';[[:space:]]+end if;$legacy$;
  v_hardened_uncertain text := $hardened$if v_openai_receipt_count not in (1, 2) then
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
       end if;$hardened$;
  v_compatibility_marker text := $compat$/* task6_azure_guard_history_compat_begin
if v_openai_receipt_count = 2 then
if v_openai_receipt_count <> 1 then
task6_azure_guard_history_compat_end */$compat$;
  v_compatibility_marker_after_history text;
  v_pre_history_marker_count integer;
  v_post_history_marker_count integer;
  v_valid_marker_count integer;
  v_marker_begin_count integer;
  v_marker_end_count integer;
  v_marker_is_valid boolean;
  v_is_hardened boolean;
  v_is_semantic_hardened boolean;
  v_semantic_hardened_first_count integer;
  v_is_legacy boolean;
begin
  select pg_get_functiondef(p.oid)
    into v_definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'ct_paid_azure_direct_fallback'
     and p.pronargs = 9
     and p.oid = to_regprocedure('public.ct_paid_azure_direct_fallback(text,text,uuid,text,timestamptz,timestamptz,date,bigint,timestamptz)');

  if v_definition is null then
    raise exception 'Task 6 Azure reservation function is unavailable';
  end if;

  v_compatibility_marker_after_history := replace(
    replace(v_compatibility_marker, v_legacy_first, v_hardened_first),
    v_legacy_uncertain_opening,
    v_hardened_uncertain
  );
  v_normalized_hardened_uncertain := regexp_replace(v_hardened_uncertain, '[[:space:]]+', ' ', 'g');
  v_normalized_bounded_uncertain_opening_stem := regexp_replace(v_bounded_uncertain_opening_stem, '[[:space:]]+', ' ', 'g');
  v_normalized_bounded_uncertain_opening := regexp_replace(v_bounded_uncertain_opening, '[[:space:]]+', ' ', 'g');
  v_normalized_legacy_first := regexp_replace(v_legacy_first, '[[:space:]]+', ' ', 'g');
  v_normalized_legacy_uncertain_opening := regexp_replace(v_legacy_uncertain_opening, '[[:space:]]+', ' ', 'g');
  v_normalized_legacy_raise := regexp_replace(v_legacy_raise, '[[:space:]]+', ' ', 'g');
  v_pre_history_marker_count := (length(v_definition) - length(replace(v_definition, v_compatibility_marker, ''))) / length(v_compatibility_marker);
  v_post_history_marker_count := (length(v_definition) - length(replace(v_definition, v_compatibility_marker_after_history, ''))) / length(v_compatibility_marker_after_history);
  v_valid_marker_count := v_pre_history_marker_count + v_post_history_marker_count;
  v_marker_begin_count := (length(v_definition) - length(replace(v_definition, 'task6_azure_guard_history_compat_begin', ''))) / length('task6_azure_guard_history_compat_begin');
  v_marker_end_count := (length(v_definition) - length(replace(v_definition, 'task6_azure_guard_history_compat_end', ''))) / length('task6_azure_guard_history_compat_end');
  v_marker_is_valid :=
    (v_valid_marker_count = 0 and v_marker_begin_count = 0 and v_marker_end_count = 0)
    or (v_valid_marker_count = 1 and v_marker_begin_count = 1 and v_marker_end_count = 1);
  if not v_marker_is_valid then
    raise exception 'Task 6 Azure compatibility marker is malformed';
  end if;
  if v_pre_history_marker_count = 1 then
    v_semantic_definition := replace(v_definition, v_compatibility_marker, '');
  elsif v_post_history_marker_count = 1 then
    v_semantic_definition := replace(v_definition, v_compatibility_marker_after_history, '');
  else
    v_semantic_definition := v_definition;
  end if;
  v_normalized_semantic_definition := regexp_replace(v_semantic_definition, '[[:space:]]+', ' ', 'g');
  v_is_hardened :=
    (length(v_semantic_definition) - length(replace(v_semantic_definition, v_hardened_first, ''))) / length(v_hardened_first) = 1
    and (length(v_semantic_definition) - length(replace(v_semantic_definition, v_hardened_first_opening, ''))) / length(v_hardened_first_opening) = 1
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_hardened_uncertain, ''))) / length(v_normalized_hardened_uncertain) = 1
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_bounded_uncertain_opening, ''))) / length(v_normalized_bounded_uncertain_opening) = 1
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_bounded_uncertain_opening_stem, ''))) / length(v_normalized_bounded_uncertain_opening_stem) = 1
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_legacy_first, ''))) / length(v_normalized_legacy_first) = 0
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_legacy_uncertain_opening, ''))) / length(v_normalized_legacy_uncertain_opening) = 0
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_legacy_raise, ''))) / length(v_normalized_legacy_raise) = 0;

  if v_is_hardened then
    return;
  end if;

  select count(*)
    into v_semantic_hardened_first_count
    from regexp_matches(v_semantic_definition, v_semantic_hardened_first_pattern, 'g');
  v_is_semantic_hardened :=
    v_valid_marker_count = 0
    and md5(v_definition) = v_expected_semantic_hardened_definition_md5
    and v_semantic_hardened_first_count = 1
    and (length(v_semantic_definition) - length(replace(v_semantic_definition, v_hardened_first, ''))) / length(v_hardened_first) = 0
    and (length(v_semantic_definition) - length(replace(v_semantic_definition, v_hardened_first_opening, ''))) / length(v_hardened_first_opening) = 0
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_hardened_uncertain, ''))) / length(v_normalized_hardened_uncertain) = 1
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_bounded_uncertain_opening, ''))) / length(v_normalized_bounded_uncertain_opening) = 1
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_bounded_uncertain_opening_stem, ''))) / length(v_normalized_bounded_uncertain_opening_stem) = 1
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_legacy_first, ''))) / length(v_normalized_legacy_first) = 0
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_legacy_uncertain_opening, ''))) / length(v_normalized_legacy_uncertain_opening) = 0
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_legacy_raise, ''))) / length(v_normalized_legacy_raise) = 0;
  if v_is_semantic_hardened then
    v_definition := regexp_replace(v_definition, v_semantic_hardened_first_pattern, v_hardened_first);
    if v_pre_history_marker_count = 1 then
      v_semantic_definition := replace(v_definition, v_compatibility_marker, '');
    elsif v_post_history_marker_count = 1 then
      v_semantic_definition := replace(v_definition, v_compatibility_marker_after_history, '');
    else
      v_semantic_definition := v_definition;
    end if;
    v_normalized_semantic_definition := regexp_replace(v_semantic_definition, '[[:space:]]+', ' ', 'g');
    v_is_hardened :=
      (length(v_semantic_definition) - length(replace(v_semantic_definition, v_hardened_first, ''))) / length(v_hardened_first) = 1
      and (length(v_semantic_definition) - length(replace(v_semantic_definition, v_hardened_first_opening, ''))) / length(v_hardened_first_opening) = 1
      and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_hardened_uncertain, ''))) / length(v_normalized_hardened_uncertain) = 1
      and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_bounded_uncertain_opening, ''))) / length(v_normalized_bounded_uncertain_opening) = 1
      and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_bounded_uncertain_opening_stem, ''))) / length(v_normalized_bounded_uncertain_opening_stem) = 1
      and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_legacy_first, ''))) / length(v_normalized_legacy_first) = 0
      and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_legacy_uncertain_opening, ''))) / length(v_normalized_legacy_uncertain_opening) = 0
      and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_legacy_raise, ''))) / length(v_normalized_legacy_raise) = 0;
    if not v_is_hardened then
      raise exception 'Task 6 Azure semantic guard canonicalization did not converge';
    end if;
    execute v_definition;
    return;
  end if;

  v_is_legacy :=
    (length(v_semantic_definition) - length(replace(v_semantic_definition, v_legacy_first, ''))) / length(v_legacy_first) = 1
    and v_semantic_definition ~ v_legacy_uncertain_pattern
    and (length(v_semantic_definition) - length(replace(v_semantic_definition, v_legacy_uncertain_opening, ''))) / length(v_legacy_uncertain_opening) = 1
    and (length(v_semantic_definition) - length(replace(v_semantic_definition, v_legacy_raise, ''))) / length(v_legacy_raise) = 1
    and (length(v_semantic_definition) - length(replace(v_semantic_definition, v_hardened_first, ''))) / length(v_hardened_first) = 0
    and (length(v_semantic_definition) - length(replace(v_semantic_definition, v_hardened_first_opening, ''))) / length(v_hardened_first_opening) = 0
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_hardened_uncertain, ''))) / length(v_normalized_hardened_uncertain) = 0
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_bounded_uncertain_opening, ''))) / length(v_normalized_bounded_uncertain_opening) = 0
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_bounded_uncertain_opening_stem, ''))) / length(v_normalized_bounded_uncertain_opening_stem) = 0
    and position('elsif v_shared_attempt.attempt_state = ''uncertain'' then' in v_semantic_definition) > 0
    and position('uncertain OpenAI resources are not retained' in v_semantic_definition) > 0;
  if not v_is_legacy then
    raise exception 'Task 6 Azure guard definition is partial or malformed';
  end if;

  v_definition := replace(v_definition, v_legacy_first, v_hardened_first);
  v_definition := regexp_replace(v_definition, v_legacy_uncertain_pattern, v_hardened_uncertain);

  v_pre_history_marker_count := (length(v_definition) - length(replace(v_definition, v_compatibility_marker, ''))) / length(v_compatibility_marker);
  v_post_history_marker_count := (length(v_definition) - length(replace(v_definition, v_compatibility_marker_after_history, ''))) / length(v_compatibility_marker_after_history);
  v_valid_marker_count := v_pre_history_marker_count + v_post_history_marker_count;
  v_marker_begin_count := (length(v_definition) - length(replace(v_definition, 'task6_azure_guard_history_compat_begin', ''))) / length('task6_azure_guard_history_compat_begin');
  v_marker_end_count := (length(v_definition) - length(replace(v_definition, 'task6_azure_guard_history_compat_end', ''))) / length('task6_azure_guard_history_compat_end');
  v_marker_is_valid :=
    (v_valid_marker_count = 0 and v_marker_begin_count = 0 and v_marker_end_count = 0)
    or (v_valid_marker_count = 1 and v_marker_begin_count = 1 and v_marker_end_count = 1);
  if not v_marker_is_valid then
    raise exception 'Task 6 Azure compatibility marker is malformed';
  end if;
  if v_pre_history_marker_count = 1 then
    v_semantic_definition := replace(v_definition, v_compatibility_marker, '');
  elsif v_post_history_marker_count = 1 then
    v_semantic_definition := replace(v_definition, v_compatibility_marker_after_history, '');
  else
    v_semantic_definition := v_definition;
  end if;
  v_normalized_semantic_definition := regexp_replace(v_semantic_definition, '[[:space:]]+', ' ', 'g');
  v_is_hardened :=
    (length(v_semantic_definition) - length(replace(v_semantic_definition, v_hardened_first, ''))) / length(v_hardened_first) = 1
    and (length(v_semantic_definition) - length(replace(v_semantic_definition, v_hardened_first_opening, ''))) / length(v_hardened_first_opening) = 1
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_hardened_uncertain, ''))) / length(v_normalized_hardened_uncertain) = 1
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_bounded_uncertain_opening, ''))) / length(v_normalized_bounded_uncertain_opening) = 1
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_bounded_uncertain_opening_stem, ''))) / length(v_normalized_bounded_uncertain_opening_stem) = 1
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_legacy_first, ''))) / length(v_normalized_legacy_first) = 0
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_legacy_uncertain_opening, ''))) / length(v_normalized_legacy_uncertain_opening) = 0
    and (length(v_normalized_semantic_definition) - length(replace(v_normalized_semantic_definition, v_normalized_legacy_raise, ''))) / length(v_normalized_legacy_raise) = 0;
  if not v_is_hardened then
    raise exception 'Task 6 Azure guard repair did not converge';
  end if;

  execute v_definition;
end;
$task6_azure_uncertain_retry_guard_repair$;
