-- Comment Translator Paid Core v1 Task 6: allow one fresh OpenAI reservation
-- after a bounded ordinary 429. This is an additive function override; the
-- existing predecessor/slot/lease checks remain unchanged and the second
-- provider attempt is rejected once two receipts already exist.
do $$
declare
  v_definition text;
  v_original text;
begin
  select pg_get_functiondef(p.oid)
    into v_definition
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'ct_paid_openai_attempt'
     and p.pronargs = 12;

  if v_definition is null then
    raise exception 'Task 6 OpenAI retry function is unavailable';
  end if;

  v_original := 'v_shared_attempt.provider_failure_class is distinct from ''invalid-response''';
  if position(v_original in v_definition) = 0 then
    raise exception 'Task 6 OpenAI retry predecessor guard is unreadable';
  end if;

  v_definition := replace(
    v_definition,
    v_original,
    'v_shared_attempt.provider_failure_class is null or v_shared_attempt.provider_failure_class not in (''invalid-response'', ''rate-limit'')'
  );
  execute v_definition;
end;
$$;
