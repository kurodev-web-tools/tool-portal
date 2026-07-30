create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (
    select 1
    from pg_extension extension_record
    join pg_namespace extension_schema
      on extension_schema.oid = extension_record.extnamespace
    where extension_record.extname = 'pgcrypto'
      and extension_schema.nspname = 'extensions'
  ) then
    raise exception 'pgcrypto must be installed in the extensions schema';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_roles where rolname = 'comment_translator_api_owner'
  ) then
    create role comment_translator_api_owner;
  end if;

  if not exists (
    select 1 from pg_roles where rolname = 'comment_translator_billing_reader'
  ) then
    create role comment_translator_billing_reader;
  end if;
end;
$$;

alter role comment_translator_api_owner
  nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
alter role comment_translator_billing_reader
  nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;

do $$
begin
  if exists (
    select 1
    from pg_auth_members membership
    join pg_roles granted_role on granted_role.oid = membership.roleid
    join pg_roles member_role on member_role.oid = membership.member
    where granted_role.rolname in (
      'comment_translator_api_owner',
      'comment_translator_billing_reader'
    )
    or member_role.rolname in (
      'comment_translator_api_owner',
      'comment_translator_billing_reader'
    )
  ) then
    raise exception 'comment translator privileged roles must have no memberships';
  end if;
end;
$$;

grant comment_translator_api_owner to postgres;

create schema if not exists comment_translator_private authorization postgres;
create schema if not exists comment_translator_api authorization comment_translator_api_owner;

revoke all on schema comment_translator_private
  from public, anon, authenticated, authenticator, service_role,
    comment_translator_api_owner, comment_translator_billing_reader;
grant usage on schema comment_translator_private
  to service_role, comment_translator_billing_reader;

revoke all on schema comment_translator_api
  from public, anon, authenticated, authenticator, service_role,
    comment_translator_billing_reader;
grant usage on schema comment_translator_api
  to authenticated, comment_translator_billing_reader;
grant create on schema comment_translator_api to postgres;

alter default privileges for role postgres
  revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role comment_translator_api_owner
  revoke execute on functions from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema comment_translator_private
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema comment_translator_private
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema comment_translator_private
  revoke execute on functions from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema comment_translator_api
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema comment_translator_api
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema comment_translator_api
  revoke execute on functions from public, anon, authenticated, service_role;

alter default privileges for role comment_translator_api_owner
  in schema comment_translator_api
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role comment_translator_api_owner
  in schema comment_translator_api
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role comment_translator_api_owner
  in schema comment_translator_api
  revoke execute on functions from public, anon, authenticated, service_role;

create table if not exists comment_translator_private.paid_entitlement_owner_bindings (
  owner_user_id uuid primary key,
  billing_user_reference_id text not null unique,
  constraint paid_entitlement_owner_bindings_reference_check check (
    billing_user_reference_id ~ '^ctbill_[a-f0-9]{24}$'
  )
);

alter table comment_translator_private.paid_entitlement_owner_bindings
  owner to postgres;
alter table comment_translator_private.paid_entitlement_owner_bindings
  enable row level security;
alter table comment_translator_private.paid_entitlement_owner_bindings
  force row level security;

revoke all on table comment_translator_private.paid_entitlement_owner_bindings
  from public, anon, authenticated, authenticator, service_role,
    comment_translator_api_owner, comment_translator_billing_reader;
grant select on table comment_translator_private.paid_entitlement_owner_bindings
  to service_role;
grant select (owner_user_id, billing_user_reference_id)
  on table comment_translator_private.paid_entitlement_owner_bindings
  to comment_translator_billing_reader;

create policy comment_translator_paid_entitlement_bindings_owner_read
  on comment_translator_private.paid_entitlement_owner_bindings
  for select
  to comment_translator_billing_reader
  using ((select auth.uid()) = owner_user_id);

create policy comment_translator_paid_entitlement_bindings_migration_read
  on comment_translator_private.paid_entitlement_owner_bindings
  for select
  to postgres
  using (true);

create policy comment_translator_paid_entitlement_bindings_provision
  on comment_translator_private.paid_entitlement_owner_bindings
  for insert
  to postgres
  with check (true);

create or replace function
  comment_translator_private.reject_paid_entitlement_owner_binding_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'paid entitlement owner binding is immutable';
  end if;

  if old.owner_user_id is distinct from new.owner_user_id
    or old.billing_user_reference_id is distinct from new.billing_user_reference_id then
    raise exception 'paid entitlement owner binding is immutable';
  end if;

  return new;
end;
$$;

revoke all on function
  comment_translator_private.reject_paid_entitlement_owner_binding_mutation()
from public, anon, authenticated, authenticator, service_role,
  comment_translator_api_owner, comment_translator_billing_reader;

create trigger comment_translator_paid_entitlement_owner_bindings_immutable
before update or delete
on comment_translator_private.paid_entitlement_owner_bindings
for each row
execute function
  comment_translator_private.reject_paid_entitlement_owner_binding_mutation();

create or replace function
  comment_translator_private.create_paid_entitlement_owner_binding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into comment_translator_private.paid_entitlement_owner_bindings (
    owner_user_id,
    billing_user_reference_id
  ) values (
    new.id,
    'ctbill_' || substr(
      encode(
        extensions.digest(
          convert_to('comment-translator-billing:' || new.id::text, 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      1,
      24
    )
  );

  return new;
end;
$$;

revoke all on function
  comment_translator_private.create_paid_entitlement_owner_binding()
from public, anon, authenticated, authenticator, service_role,
  comment_translator_api_owner, comment_translator_billing_reader;

create trigger comment_translator_create_paid_entitlement_owner_binding
after insert on auth.users
for each row
execute function
  comment_translator_private.create_paid_entitlement_owner_binding();

alter table public.comment_translator_paid_entitlements
  enable row level security;
alter table public.comment_translator_paid_entitlements
  force row level security;

revoke all on table public.comment_translator_paid_entitlements
  from service_role;
grant select on table public.comment_translator_paid_entitlements
  to service_role;
grant select (
  billing_user_reference_id,
  stripe_customer_reference_id,
  stripe_subscription_reference_id,
  subscription_status,
  billing_state,
  current_period_end,
  evidence_source,
  evidence_event_reference_id,
  evidence_created_at,
  evidence_recorded_at,
  updated_at
) on table public.comment_translator_paid_entitlements
  to comment_translator_billing_reader;

create policy comment_translator_paid_entitlements_owner_read
  on public.comment_translator_paid_entitlements
  for select
  to comment_translator_billing_reader
  using (
    exists (
      select 1
      from comment_translator_private.paid_entitlement_owner_bindings binding
      where binding.billing_user_reference_id =
        comment_translator_paid_entitlements.billing_user_reference_id
        and binding.owner_user_id = (select auth.uid())
    )
  );

create policy comment_translator_paid_entitlements_migration_writer
  on public.comment_translator_paid_entitlements
  for all
  to postgres
  using (true)
  with check (true);

create or replace function public.apply_comment_translator_paid_entitlement_evidence(
  p_billing_user_reference_id text,
  p_stripe_customer_reference_id text,
  p_stripe_subscription_reference_id text,
  p_subscription_status text,
  p_billing_state text,
  p_current_period_end timestamptz,
  p_evidence_event_reference_id text,
  p_evidence_created_at timestamptz,
  p_evidence_recorded_at timestamptz
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_rows integer;
begin
  if not exists (
    select 1
    from comment_translator_private.paid_entitlement_owner_bindings binding
    where binding.billing_user_reference_id = p_billing_user_reference_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'paid entitlement owner binding is required';
  end if;

  insert into public.comment_translator_paid_entitlements (
    billing_user_reference_id,
    stripe_customer_reference_id,
    stripe_subscription_reference_id,
    subscription_status,
    billing_state,
    current_period_end,
    evidence_source,
    evidence_event_reference_id,
    evidence_created_at,
    evidence_recorded_at,
    updated_at
  ) values (
    p_billing_user_reference_id,
    p_stripe_customer_reference_id,
    p_stripe_subscription_reference_id,
    p_subscription_status,
    p_billing_state,
    p_current_period_end,
    'signed-stripe-webhook',
    p_evidence_event_reference_id,
    p_evidence_created_at,
    p_evidence_recorded_at,
    p_evidence_recorded_at
  )
  on conflict (billing_user_reference_id) do update set
    stripe_customer_reference_id = excluded.stripe_customer_reference_id,
    stripe_subscription_reference_id = excluded.stripe_subscription_reference_id,
    subscription_status = excluded.subscription_status,
    billing_state = excluded.billing_state,
    current_period_end = excluded.current_period_end,
    evidence_event_reference_id = excluded.evidence_event_reference_id,
    evidence_created_at = excluded.evidence_created_at,
    evidence_recorded_at = excluded.evidence_recorded_at,
    updated_at = excluded.updated_at
  where excluded.evidence_created_at >
      comment_translator_paid_entitlements.evidence_created_at
    or (
      excluded.evidence_created_at =
        comment_translator_paid_entitlements.evidence_created_at
      and comment_translator_paid_entitlements.billing_state = 'paid-active'
      and excluded.billing_state = 'paid-inactive'
    );

  get diagnostics changed_rows = row_count;
  return changed_rows > 0;
end;
$$;

revoke all on function public.apply_comment_translator_paid_entitlement_evidence(
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  timestamptz,
  timestamptz
) from public, anon, authenticated;
grant execute on function public.apply_comment_translator_paid_entitlement_evidence(
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  timestamptz,
  timestamptz
) to service_role;

create or replace function
  comment_translator_api.read_comment_translator_billing_state_v1()
returns table(result_status text, billing_state text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_billing_reference text;
  stored_subscription_status text;
  stored_billing_state text;
  stored_period_end timestamptz;
  stored_customer_reference text;
  stored_subscription_reference text;
  stored_evidence_source text;
  stored_evidence_event_reference text;
  stored_evidence_created_at timestamptz;
  stored_evidence_recorded_at timestamptz;
  stored_updated_at timestamptz;
begin
  if auth.uid() is null then
    return query select 'unavailable'::text, null::text;
    return;
  end if;

  select binding.billing_user_reference_id
  into caller_billing_reference
  from comment_translator_private.paid_entitlement_owner_bindings binding
  where binding.owner_user_id = (select auth.uid());

  if not found then
    return query select 'unavailable'::text, null::text;
    return;
  end if;

  select
    entitlement.subscription_status,
    entitlement.billing_state,
    entitlement.current_period_end,
    entitlement.stripe_customer_reference_id,
    entitlement.stripe_subscription_reference_id,
    entitlement.evidence_source,
    entitlement.evidence_event_reference_id,
    entitlement.evidence_created_at,
    entitlement.evidence_recorded_at,
    entitlement.updated_at
  into
    stored_subscription_status,
    stored_billing_state,
    stored_period_end,
    stored_customer_reference,
    stored_subscription_reference,
    stored_evidence_source,
    stored_evidence_event_reference,
    stored_evidence_created_at,
    stored_evidence_recorded_at,
    stored_updated_at
  from public.comment_translator_paid_entitlements entitlement
  where entitlement.billing_user_reference_id = caller_billing_reference;

  if not found then
    return query select 'missing'::text, null::text;
    return;
  end if;

  if stored_evidence_source is distinct from 'signed-stripe-webhook'
    or stored_subscription_status is null
    or stored_subscription_status not in (
      'active',
      'trialing',
      'past_due',
      'unpaid',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'paused'
    )
    or stored_billing_state is null
    or stored_billing_state not in ('paid-active', 'paid-inactive')
    or stored_evidence_event_reference is null
    or stored_evidence_created_at is null
    or stored_evidence_recorded_at is null
    or stored_updated_at is null
    or (
      stored_billing_state = 'paid-active'
      and (
        stored_customer_reference is null
        or stored_subscription_reference is null
        or stored_period_end is null
      )
    )
  then
    return query select 'unavailable'::text, null::text;
    return;
  end if;

  if stored_billing_state = 'paid-active'
    and stored_subscription_status = 'active'
    and stored_period_end > now()
  then
    return query select 'available'::text, 'paid-active'::text;
    return;
  end if;

  return query select 'available'::text, 'paid-inactive'::text;
end;
$$;

grant comment_translator_billing_reader to postgres;
grant create on schema comment_translator_api
  to comment_translator_billing_reader;
alter function comment_translator_api.read_comment_translator_billing_state_v1()
  owner to comment_translator_billing_reader;
revoke create on schema comment_translator_api
  from comment_translator_billing_reader;

revoke all on function
  comment_translator_api.read_comment_translator_billing_state_v1()
from public, anon, authenticated, service_role;
grant execute on function
  comment_translator_api.read_comment_translator_billing_state_v1()
to authenticated;

revoke comment_translator_billing_reader from postgres;
revoke comment_translator_api_owner from postgres;

comment on schema comment_translator_private is
  'Unexposed Comment Translator relations and helpers. Never add this schema to the Data API.';
comment on schema comment_translator_api is
  'Dedicated exposed schema for reviewed fixed-projection Comment Translator RPCs only.';
comment on table
  comment_translator_private.paid_entitlement_owner_bindings is
  'Immutable retained Auth-owner to private billing-reference bindings. Backfill and cutover proof are separately approval-gated.';
comment on function
  comment_translator_private.create_paid_entitlement_owner_binding() is
  'Creates the deterministic immutable billing binding in the Auth-user insert transaction.';
comment on function
  comment_translator_api.read_comment_translator_billing_state_v1() is
  'Authenticated auth.uid()-owned fixed two-field Creator billing-state projection.';
comment on function public.apply_comment_translator_paid_entitlement_evidence(
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  timestamptz,
  timestamptz
) is
  'Atomically rejects unbound references, ignores stale signed evidence, and lets inactive state win timestamp ties.';

do $$
begin
  if exists (
    select 1
    from pg_auth_members membership
    join pg_roles granted_role on granted_role.oid = membership.roleid
    join pg_roles member_role on member_role.oid = membership.member
    where granted_role.rolname in (
      'comment_translator_api_owner',
      'comment_translator_billing_reader'
    )
    or member_role.rolname in (
      'comment_translator_api_owner',
      'comment_translator_billing_reader'
    )
  ) then
    raise exception 'comment translator privileged roles must have no memberships';
  end if;

  if exists (
    select 1
    from pg_roles
    where rolname in (
      'comment_translator_api_owner',
      'comment_translator_billing_reader'
    )
    and (
      rolcanlogin
      or rolinherit
      or rolsuper
      or rolcreatedb
      or rolcreaterole
      or rolreplication
      or rolbypassrls
    )
  ) then
    raise exception 'comment translator privileged role attributes are unsafe';
  end if;

  if (
    select schema_owner.rolname
    from pg_namespace api_schema
    join pg_roles schema_owner on schema_owner.oid = api_schema.nspowner
    where api_schema.nspname = 'comment_translator_api'
  ) <> 'comment_translator_api_owner' then
    raise exception 'comment translator API schema owner is unsafe';
  end if;

  if (
    select count(*)
    from pg_namespace owned_schema
    join pg_roles owner_role on owner_role.oid = owned_schema.nspowner
    where owner_role.rolname = 'comment_translator_api_owner'
      and owned_schema.nspname = 'comment_translator_api'
  ) <> 1
  or exists (
    select 1
    from pg_namespace owned_schema
    join pg_roles owner_role on owner_role.oid = owned_schema.nspowner
    where owner_role.rolname in (
      'comment_translator_api_owner',
      'comment_translator_billing_reader'
    )
      and not (
        owner_role.rolname = 'comment_translator_api_owner'
        and owned_schema.nspname = 'comment_translator_api'
      )
  ) then
    raise exception 'comment translator privileged schema ownership is unsafe';
  end if;

  if exists (
    select 1
    from pg_class relation
    join pg_namespace relation_schema
      on relation_schema.oid = relation.relnamespace
    where relation_schema.nspname = 'comment_translator_api'
  ) then
    raise exception 'comment translator API schema contains an unexpected relation';
  end if;

  if exists (
    select 1
    from pg_class relation
    join pg_roles owner_role on owner_role.oid = relation.relowner
    where owner_role.rolname in (
      'comment_translator_api_owner',
      'comment_translator_billing_reader'
    )
  ) then
    raise exception 'comment translator privileged roles own an unexpected relation';
  end if;

  if exists (
    select 1
    from pg_type owned_type
    join pg_roles owner_role on owner_role.oid = owned_type.typowner
    where owner_role.rolname in (
      'comment_translator_api_owner',
      'comment_translator_billing_reader'
    )
  ) then
    raise exception 'comment translator privileged roles own an unexpected type';
  end if;

  if exists (
    select 1
    from pg_proc routine
    join pg_namespace routine_schema
      on routine_schema.oid = routine.pronamespace
    where routine_schema.nspname = 'comment_translator_api'
      and routine.oid <>
        'comment_translator_api.read_comment_translator_billing_state_v1()'::regprocedure
  ) then
    raise exception 'comment translator API schema contains an unexpected routine';
  end if;

  if exists (
    select 1
    from pg_proc routine
    join pg_roles owner_role on owner_role.oid = routine.proowner
    where owner_role.rolname = 'comment_translator_api_owner'
  ) then
    raise exception 'comment translator API schema owner owns an unexpected routine';
  end if;

  if (
    select count(*)
    from pg_proc routine
    join pg_roles owner_role on owner_role.oid = routine.proowner
    where owner_role.rolname = 'comment_translator_billing_reader'
      and routine.oid =
        'comment_translator_api.read_comment_translator_billing_state_v1()'::regprocedure
  ) <> 1
  or exists (
    select 1
    from pg_proc routine
    join pg_roles owner_role on owner_role.oid = routine.proowner
    where owner_role.rolname = 'comment_translator_billing_reader'
      and routine.oid <>
        'comment_translator_api.read_comment_translator_billing_state_v1()'::regprocedure
  ) then
    raise exception 'comment translator reader routine ownership is unsafe';
  end if;

  if has_schema_privilege(
    'comment_translator_billing_reader',
    'comment_translator_api',
    'CREATE'
  )
  or has_schema_privilege('authenticated', 'comment_translator_api', 'CREATE')
  or has_schema_privilege('service_role', 'comment_translator_api', 'CREATE')
  then
    raise exception 'comment translator API schema create privilege is unsafe';
  end if;
end;
$$;
