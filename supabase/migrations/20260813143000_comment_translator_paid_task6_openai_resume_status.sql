-- Task 6 additive exact-replay receipt read. The service-role runtime receives
-- only allowlisted terminal authority state and a sanitized failure class.

create or replace function public.ct_paid_read_openai_attempt(
  p_attempt_id text,
  p_provider_attempt text
)
returns table (attempt_state text, provider_failure_class text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_attempt_id is null
    or p_attempt_id !~ '^ctpa_[A-Za-z0-9_-]{1,32}_[A-Za-z0-9_-]{43}$'
    or p_provider_attempt is null
    or length(trim(p_provider_attempt)) = 0
    or length(p_provider_attempt) > 200
  then
    raise exception 'OpenAI attempt receipt reference is invalid';
  end if;

  return query
  select receipt.attempt_state, receipt.provider_failure_class
    from public.comment_translator_paid_attempt_receipts receipt
   where receipt.attempt_id = p_attempt_id
     and receipt.provider_attempt = p_provider_attempt
     and receipt.provider_kind = 'openai_attempt'
     and receipt.attempt_state in ('reserved', 'uncertain', 'committed', 'released', 'expired')
     and (
       receipt.provider_failure_class is null
       or receipt.provider_failure_class in (
         'network', 'timeout', 'rate-limit', 'server-error',
         'invalid-response', 'quota', 'configuration', 'policy'
       )
     );
end;
$$;

revoke all on function public.ct_paid_read_openai_attempt(text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.ct_paid_read_openai_attempt(text,text)
  to service_role;
