begin;

create extension if not exists pgtap with schema extensions;

select plan(46);

select has_schema(
  'comment_translator_private',
  'private billing schema exists'
);
select has_schema(
  'comment_translator_api',
  'fixed projection API schema exists'
);
select has_table(
  'comment_translator_private',
  'paid_entitlement_owner_bindings',
  'private owner binding exists'
);
select has_function(
  'comment_translator_api',
  'read_comment_translator_billing_state_v1',
  array[]::text[],
  'zero-argument fixed projection RPC exists'
);
select has_function(
  'comment_translator_private',
  'create_paid_entitlement_owner_binding',
  array[]::text[],
  'Auth-user forward provisioning function exists'
);
select ok(
  exists (
    select 1
    from pg_trigger trigger_record
    where trigger_record.tgname =
      'comment_translator_create_paid_entitlement_owner_binding'
      and trigger_record.tgrelid = 'auth.users'::regclass
      and not trigger_record.tgisinternal
  ),
  'Auth-user insert has one forward provisioning trigger'
);
select ok(
  (
    select relation.relrowsecurity
    from pg_class relation
    where relation.oid =
      'comment_translator_private.paid_entitlement_owner_bindings'::regclass
  ),
  'binding RLS is enabled'
);
select ok(
  (
    select relation.relforcerowsecurity
    from pg_class relation
    where relation.oid =
      'comment_translator_private.paid_entitlement_owner_bindings'::regclass
  ),
  'binding RLS is forced'
);
select ok(
  (
    select relation.relforcerowsecurity
    from pg_class relation
    where relation.oid =
      'public.comment_translator_paid_entitlements'::regclass
  ),
  'authority RLS is forced'
);
select ok(
  (
    select not role_record.rolcanlogin
      and not role_record.rolinherit
      and not role_record.rolsuper
      and not role_record.rolcreatedb
      and not role_record.rolcreaterole
      and not role_record.rolreplication
      and not role_record.rolbypassrls
    from pg_roles role_record
    where role_record.rolname = 'comment_translator_billing_reader'
  ),
  'reader role is NOLOGIN NOINHERIT NOBYPASSRLS'
);
select ok(
  (
    select not role_record.rolcanlogin
      and not role_record.rolinherit
      and not role_record.rolsuper
      and not role_record.rolcreatedb
      and not role_record.rolcreaterole
      and not role_record.rolreplication
      and not role_record.rolbypassrls
    from pg_roles role_record
    where role_record.rolname = 'comment_translator_api_owner'
  ),
  'API owner role is NOLOGIN NOINHERIT and non-privileged'
);
select ok(
  not exists (
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
  ),
  'privileged roles have no inbound or outbound membership'
);
select is(
  (
    select count(*)
    from pg_default_acl default_acl
    join pg_roles creator_role on creator_role.oid = default_acl.defaclrole
    where creator_role.rolname in (
      'postgres',
      'comment_translator_api_owner'
    )
      and default_acl.defaclnamespace = 0
      and default_acl.defaclobjtype = 'f'
  ),
  2::bigint,
  'both API routine creators have global function defaults'
);
select ok(
  not exists (
    select 1
    from pg_default_acl default_acl
    join pg_roles creator_role on creator_role.oid = default_acl.defaclrole
    cross join lateral aclexplode(default_acl.defaclacl) privilege_record
    left join pg_roles grantee_role
      on grantee_role.oid = privilege_record.grantee
    where creator_role.rolname in (
      'postgres',
      'comment_translator_api_owner'
    )
      and default_acl.defaclnamespace = 0
      and default_acl.defaclobjtype = 'f'
      and privilege_record.privilege_type = 'EXECUTE'
      and (
        privilege_record.grantee = 0
        or grantee_role.rolname in (
          'anon',
          'authenticated',
          'service_role'
        )
      )
  ),
  'routine creator defaults cannot auto-expose later functions'
);
select is(
  (
    select schema_owner.rolname
    from pg_namespace schema_record
    join pg_roles schema_owner on schema_owner.oid = schema_record.nspowner
    where schema_record.nspname = 'comment_translator_api'
  ),
  'comment_translator_api_owner',
  'API schema has its fixed owner'
);
select is(
  (
    select routine_owner.rolname
    from pg_proc routine
    join pg_roles routine_owner on routine_owner.oid = routine.proowner
    where routine.oid =
      'comment_translator_api.read_comment_translator_billing_state_v1()'::regprocedure
  ),
  'comment_translator_billing_reader',
  'fixed projection RPC has its non-bypass reader owner'
);
select ok(
  (
    select routine.prosecdef
    from pg_proc routine
    where routine.oid =
      'comment_translator_api.read_comment_translator_billing_state_v1()'::regprocedure
  ),
  'fixed projection RPC is SECURITY DEFINER'
);
select is(
  (
    select array_to_string(routine.proconfig, ',')
    from pg_proc routine
    where routine.oid =
      'comment_translator_api.read_comment_translator_billing_state_v1()'::regprocedure
  ),
  'search_path=""',
  'fixed projection RPC has an empty search_path'
);
select is(
  (
    select pg_get_function_result(routine.oid)
    from pg_proc routine
    where routine.oid =
      'comment_translator_api.read_comment_translator_billing_state_v1()'::regprocedure
  ),
  'TABLE(result_status text, billing_state text)',
  'RPC exposes exactly two fixed fields'
);
select ok(
  has_schema_privilege(
    'authenticated',
    'comment_translator_api',
    'USAGE'
  ),
  'authenticated can resolve the API schema'
);
select ok(
  not has_schema_privilege(
    'authenticated',
    'comment_translator_api',
    'CREATE'
  ),
  'authenticated cannot create API objects'
);
select ok(
  not has_schema_privilege(
    'service_role',
    'comment_translator_api',
    'USAGE'
  ),
  'service_role is outside the new read API'
);
select ok(
  not has_schema_privilege(
    'comment_translator_billing_reader',
    'comment_translator_api',
    'CREATE'
  ),
  'reader cannot create API objects'
);
select ok(
  has_function_privilege(
    'authenticated',
    'comment_translator_api.read_comment_translator_billing_state_v1()',
    'EXECUTE'
  ),
  'authenticated can execute only the fixed RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'comment_translator_api.read_comment_translator_billing_state_v1()',
    'EXECUTE'
  ),
  'anon cannot execute the fixed RPC'
);
select ok(
  not has_function_privilege(
    'service_role',
    'comment_translator_api.read_comment_translator_billing_state_v1()',
    'EXECUTE'
  ),
  'service_role cannot execute the new read RPC'
);
select ok(
  not exists (
    select 1
    from pg_proc routine
    cross join lateral aclexplode(
      coalesce(routine.proacl, acldefault('f', routine.proowner))
    ) privilege_record
    where routine.oid =
      'comment_translator_api.read_comment_translator_billing_state_v1()'::regprocedure
      and privilege_record.grantee = 0
      and privilege_record.privilege_type = 'EXECUTE'
  ),
  'PUBLIC cannot execute the fixed RPC'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'comment_translator_private.paid_entitlement_owner_bindings',
    'SELECT'
  ),
  'authenticated cannot read owner bindings directly'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.comment_translator_paid_entitlements',
    'SELECT'
  ),
  'authenticated cannot read authority rows directly'
);
select ok(
  has_table_privilege(
    'service_role',
    'public.comment_translator_paid_entitlements',
    'SELECT'
  ),
  'existing signed-evidence runtime keeps its authority read'
);
select ok(
  not has_table_privilege(
    'service_role',
    'public.comment_translator_paid_entitlements',
    'INSERT'
  ),
  'signed-evidence runtime cannot bypass the guarded writer'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'comment_translator_private'
      and tablename = 'paid_entitlement_owner_bindings'
      and policyname =
        'comment_translator_paid_entitlement_bindings_owner_read'
      and roles = array['comment_translator_billing_reader']::name[]
      and qual like '%auth.uid()%'
  ),
  'binding owner policy uses auth.uid()'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'comment_translator_paid_entitlements'
      and policyname = 'comment_translator_paid_entitlements_owner_read'
      and roles = array['comment_translator_billing_reader']::name[]
      and qual like '%auth.uid()%'
  ),
  'authority owner policy joins through the auth.uid() binding'
);

insert into comment_translator_private.paid_entitlement_owner_bindings (
  owner_user_id,
  billing_user_reference_id
) values
  ('00000000-0000-0000-0000-000000000001', 'ctbill_000000000000000000000001'),
  ('00000000-0000-0000-0000-000000000002', 'ctbill_000000000000000000000002'),
  ('00000000-0000-0000-0000-000000000003', 'ctbill_000000000000000000000003'),
  ('00000000-0000-0000-0000-000000000004', 'ctbill_000000000000000000000004'),
  ('00000000-0000-0000-0000-000000000006', 'ctbill_000000000000000000000006');

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
) values
  (
    'ctbill_000000000000000000000001',
    'synthetic-customer-a',
    'synthetic-subscription-a',
    'active',
    'paid-active',
    '2999-01-01T00:00:00Z',
    'signed-stripe-webhook',
    'synthetic-event-a',
    '2026-07-30T00:00:00Z',
    '2026-07-30T00:00:01Z',
    '2026-07-30T00:00:01Z'
  ),
  (
    'ctbill_000000000000000000000002',
    'synthetic-customer-b',
    'synthetic-subscription-b',
    'trialing',
    'paid-active',
    '2999-01-01T00:00:00Z',
    'signed-stripe-webhook',
    'synthetic-event-b',
    '2026-07-30T00:00:00Z',
    '2026-07-30T00:00:01Z',
    '2026-07-30T00:00:01Z'
  ),
  (
    'ctbill_000000000000000000000004',
    null,
    null,
    'canceled',
    'paid-inactive',
    null,
    'signed-stripe-webhook',
    'synthetic-event-d',
    '2026-07-30T00:00:00Z',
    '2026-07-30T00:00:01Z',
    '2026-07-30T00:00:01Z'
  );

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;
select results_eq(
  $$select * from comment_translator_api.read_comment_translator_billing_state_v1()$$,
  $$values ('available'::text, 'paid-active'::text)$$,
  'active owner receives available paid-active'
);
select ok(auth.uid() is not null, 'behavior tests run with an Auth JWT owner');
reset role;

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;
select results_eq(
  $$select * from comment_translator_api.read_comment_translator_billing_state_v1()$$,
  $$values ('available'::text, 'paid-inactive'::text)$$,
  'trialing remains available paid-inactive'
);
reset role;

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000003',
  true
);
set local role authenticated;
select results_eq(
  $$select * from comment_translator_api.read_comment_translator_billing_state_v1()$$,
  $$values ('missing'::text, null::text)$$,
  'bound owner without authority receives missing'
);
reset role;

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000004',
  true
);
set local role authenticated;
select results_eq(
  $$select * from comment_translator_api.read_comment_translator_billing_state_v1()$$,
  $$values ('available'::text, 'paid-inactive'::text)$$,
  'inactive owner remains available paid-inactive'
);
reset role;

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000005',
  true
);
set local role authenticated;
select results_eq(
  $$select * from comment_translator_api.read_comment_translator_billing_state_v1()$$,
  $$values ('unavailable'::text, null::text)$$,
  'missing binding is unavailable rather than discovery'
);
reset role;

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000006',
  true
);
set local role authenticated;
select results_eq(
  $$select * from comment_translator_api.read_comment_translator_billing_state_v1()$$,
  $$values ('missing'::text, null::text)$$,
  'another owner cannot observe an active authority row'
);
reset role;

select throws_ok(
  $$update comment_translator_private.paid_entitlement_owner_bindings
    set billing_user_reference_id = 'ctbill_000000000000000000000099'
    where owner_user_id = '00000000-0000-0000-0000-000000000006'$$,
  'P0001',
  'paid entitlement owner binding is immutable',
  'binding reassignment is rejected'
);
select throws_ok(
  $$delete from comment_translator_private.paid_entitlement_owner_bindings
    where owner_user_id = '00000000-0000-0000-0000-000000000006'$$,
  'P0001',
  'paid entitlement owner binding is immutable',
  'binding deletion is rejected'
);
select throws_ok(
  $$select public.apply_comment_translator_paid_entitlement_evidence(
    'ctbill_000000000000000000000099',
    null,
    null,
    'canceled',
    'paid-inactive',
    null,
    'synthetic-unbound-event',
    '2026-07-30T00:00:00Z',
    '2026-07-30T00:00:01Z'
  )$$,
  '23503',
  'paid entitlement owner binding is required',
  'writer rejects an unbound reference'
);
select is(
  public.apply_comment_translator_paid_entitlement_evidence(
    'ctbill_000000000000000000000006',
    'synthetic-customer-f',
    'synthetic-subscription-f',
    'active',
    'paid-active',
    '2999-01-01T00:00:00Z',
    'synthetic-event-f-active',
    '2026-07-30T00:00:00Z',
    '2026-07-30T00:00:01Z'
  ),
  true,
  'bound signed evidence is applied'
);
select is(
  public.apply_comment_translator_paid_entitlement_evidence(
    'ctbill_000000000000000000000006',
    'synthetic-customer-f',
    'synthetic-subscription-f',
    'active',
    'paid-active',
    '2999-01-01T00:00:00Z',
    'synthetic-event-f-replay',
    '2026-07-30T00:00:00Z',
    '2026-07-30T00:00:02Z'
  ),
  false,
  'equal active evidence remains ignored'
);
select is(
  public.apply_comment_translator_paid_entitlement_evidence(
    'ctbill_000000000000000000000006',
    null,
    null,
    'canceled',
    'paid-inactive',
    null,
    'synthetic-event-f-inactive',
    '2026-07-30T00:00:00Z',
    '2026-07-30T00:00:03Z'
  ),
  true,
  'inactive evidence still wins an equal timestamp'
);

select *
from finish();

rollback;
