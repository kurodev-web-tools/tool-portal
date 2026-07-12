-- Kuro Live Comment Translator: durable usage counter and quota ledger events.
-- Reviewable local migration file only. This thread does not apply the migration
-- to a remote Supabase project and does not include private credential values.

create table if not exists public.comment_translator_usage_ledger_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  user_ledger_reference_id text not null,
  session_reference_id text,
  provider text not null default 'youtube' check (provider = 'youtube'),
  plan_entitlement_reference_id text,
  event_type text not null check (
    event_type in (
      'session-started',
      'session-stopped',
      'provider-request-estimated',
      'ai-usage-estimated',
      'provider-translation-error-estimated',
      'quota-budget-stop'
    )
  ),
  occurred_at timestamptz not null,
  usage_day date not null,
  usage_month date not null,
  session_elapsed_ms integer not null default 0 check (session_elapsed_ms >= 0),
  provider_request_estimate_count integer not null default 0 check (provider_request_estimate_count >= 0),
  provider_quota_unit_estimate integer not null default 0 check (provider_quota_unit_estimate >= 0),
  translated_message_estimate integer not null default 0 check (translated_message_estimate >= 0),
  translated_character_estimate integer not null default 0 check (translated_character_estimate >= 0),
  estimated_cost_micros bigint not null default 0 check (estimated_cost_micros >= 0),
  provider_error_class text check (provider_error_class in ('recoverable-error', 'terminal-error')),
  provider_error_count integer not null default 0 check (provider_error_count >= 0),
  stop_reason text check (
    stop_reason is null
    or stop_reason in (
      'user-stop',
      'stream-ended',
      'stream-unavailable',
      'browser-disconnect',
      'missing-heartbeat',
      'auth-failed',
      'token-refresh-failed',
      'reconnect-required',
      'daily-time-limit',
      'session-time-limit',
      'translated-message-cap',
      'provider-quota-stop',
      'global-budget-stop',
      'ai-budget-stop',
      'translation-provider-limit',
      'session-limit',
      'terminal-provider-error'
    )
  ),
  quota_stop_category text check (
    quota_stop_category is null
    or quota_stop_category in (
      'provider-quota',
      'global-budget',
      'ai-budget',
      'translated-message-cap',
      'session-time-limit',
      'daily-time-limit'
    )
  ),
  client_readable_detail text check (
    client_readable_detail is null
    or client_readable_detail = 'sanitized-stop-reason-only'
  ),
  created_at timestamptz not null default now(),
  constraint comment_translator_usage_ledger_reference_nonempty check (length(trim(user_ledger_reference_id)) > 0),
  constraint comment_translator_usage_ledger_month_start check (date_trunc('month', usage_month)::date = usage_month),
  constraint comment_translator_usage_ledger_session_started_shape check (
    event_type <> 'session-started'
    or (session_reference_id is not null and plan_entitlement_reference_id is not null)
  ),
  constraint comment_translator_usage_ledger_session_stopped_shape check (
    event_type <> 'session-stopped'
    or (session_reference_id is not null and plan_entitlement_reference_id is not null and stop_reason is not null)
  ),
  constraint comment_translator_usage_ledger_provider_request_shape check (
    event_type <> 'provider-request-estimated'
    or (session_reference_id is not null and provider_request_estimate_count > 0)
  ),
  constraint comment_translator_usage_ledger_ai_usage_shape check (
    event_type <> 'ai-usage-estimated'
    or (session_reference_id is not null and translated_message_estimate > 0)
  ),
  constraint comment_translator_usage_ledger_provider_error_shape check (
    event_type <> 'provider-translation-error-estimated'
    or (session_reference_id is not null and provider_error_class is not null and provider_error_count > 0)
  ),
  constraint comment_translator_usage_ledger_quota_stop_shape check (
    event_type <> 'quota-budget-stop'
    or (stop_reason is not null and quota_stop_category is not null and client_readable_detail = 'sanitized-stop-reason-only')
  )
);

alter table public.comment_translator_usage_ledger_events enable row level security;

revoke all on table public.comment_translator_usage_ledger_events from anon;
revoke all on table public.comment_translator_usage_ledger_events from authenticated;
grant all on table public.comment_translator_usage_ledger_events to service_role;

drop policy if exists "comment_translator_usage_ledger_events_service_role_all" on public.comment_translator_usage_ledger_events;
create policy "comment_translator_usage_ledger_events_service_role_all"
  on public.comment_translator_usage_ledger_events
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists comment_translator_usage_ledger_events_owner_month_idx
  on public.comment_translator_usage_ledger_events (owner_user_id, usage_month, occurred_at);

create index if not exists comment_translator_usage_ledger_events_owner_day_idx
  on public.comment_translator_usage_ledger_events (owner_user_id, usage_day, occurred_at);

create index if not exists comment_translator_usage_ledger_events_session_idx
  on public.comment_translator_usage_ledger_events (session_reference_id, occurred_at)
  where session_reference_id is not null;

create index if not exists comment_translator_usage_ledger_events_quota_stop_idx
  on public.comment_translator_usage_ledger_events (owner_user_id, usage_day, quota_stop_category)
  where event_type = 'quota-budget-stop';

comment on table public.comment_translator_usage_ledger_events is
  'Server-owned Kuro Live Comment Translator usage counter authority. Rows store sanitized usage estimates and stop categories only.';

comment on column public.comment_translator_usage_ledger_events.owner_user_id is
  'Trusted server ownership reference used only for authorization and per-owner usage aggregation.';

comment on column public.comment_translator_usage_ledger_events.user_ledger_reference_id is
  'Deterministic sanitized ledger reference derived server-side; not a provider or credential identifier.';

comment on column public.comment_translator_usage_ledger_events.session_reference_id is
  'Opaque browser-safe session reference. It is not a channel identifier or credential value.';

comment on column public.comment_translator_usage_ledger_events.translated_character_estimate is
  'Sanitized translated character estimate for durable monthly and daily quota accounting. Source text is not stored.';

comment on column public.comment_translator_usage_ledger_events.quota_stop_category is
  'Sanitized quota or budget stop category for enforcement and support evidence without provider response bodies.';
