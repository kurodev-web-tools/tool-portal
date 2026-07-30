with expected_migrations(version, ordinal) as (
  values
    ('20260527000000', 1),
    ('20260601000000', 2),
    ('20260615000000', 3),
    ('20260615001000', 4),
    ('20260623000000', 5),
    ('20260624000000', 6),
    ('20260705000000', 7),
    ('20260706073204', 8),
    ('20260722000000', 9),
    ('20260722001000', 10),
    ('20260722002000', 11),
    ('20260722003000', 12),
    ('20260723000000', 13),
    ('20260723001000', 14),
    ('20260723002000', 15),
    ('20260723003000', 16),
    ('20260730000000', 17)
),
remote_history as (
  select version::text
  from supabase_migrations.schema_migrations
),
history_metrics as (
  select
    count(*) filter (
      where expected.ordinal <= 16 and remote.version is not null
    )::integer as expected_prior_count,
    count(*) filter (
      where remote.version is null
    )::integer as sole_pending_count,
    count(*) filter (
      where expected.ordinal <= 16 and remote.version is null
    )::integer as unexpected_pending_count,
    count(*) filter (
      where expected.ordinal = 17 and remote.version is not null
    )::integer as target_applied_count,
    (
      select count(*)::integer
      from remote_history extra
      left join expected_migrations expected_extra
        on expected_extra.version = extra.version
      where expected_extra.version is null
    ) as unexpected_remote_count,
    coalesce(
      array_agg(remote.version order by remote.version) filter (
        where expected.ordinal <= 16 and remote.version is not null
      ) = array[
        '20260527000000',
        '20260601000000',
        '20260615000000',
        '20260615001000',
        '20260623000000',
        '20260624000000',
        '20260705000000',
        '20260706073204',
        '20260722000000',
        '20260722001000',
        '20260722002000',
        '20260722003000',
        '20260723000000',
        '20260723001000',
        '20260723002000',
        '20260723003000'
      ]::text[],
      false
    ) as prior_order_matches
  from expected_migrations expected
  left join remote_history remote on remote.version = expected.version
),
role_context as (
  select
    role_record.rolsuper,
    role_record.rolcreaterole,
    true as expected_apply_role,
    has_database_privilege('postgres', current_database(), 'CREATE')
      as can_create_in_database,
    pg_has_role('postgres', 'postgres', 'USAGE') as holds_postgres_role
  from pg_roles role_record
  where role_record.rolname = 'postgres'
),
expected_columns(column_name, udt_name, is_nullable) as (
  values
    ('billing_user_reference_id', 'text', 'NO'),
    ('stripe_customer_reference_id', 'text', 'YES'),
    ('stripe_subscription_reference_id', 'text', 'YES'),
    ('subscription_status', 'text', 'NO'),
    ('billing_state', 'text', 'NO'),
    ('current_period_end', 'timestamptz', 'YES'),
    ('evidence_source', 'text', 'NO'),
    ('evidence_event_reference_id', 'text', 'NO'),
    ('evidence_created_at', 'timestamptz', 'NO'),
    ('evidence_recorded_at', 'timestamptz', 'NO'),
    ('created_at', 'timestamptz', 'NO'),
    ('updated_at', 'timestamptz', 'NO')
),
table_shape as (
  select
    (
      select count(*)
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'comment_translator_paid_entitlements'
    ) = 12
    and not exists (
      select 1
      from expected_columns expected
      left join information_schema.columns actual
        on actual.table_schema = 'public'
        and actual.table_name = 'comment_translator_paid_entitlements'
        and actual.column_name = expected.column_name
      where actual.column_name is null
        or actual.udt_name <> expected.udt_name
        or actual.is_nullable <> expected.is_nullable
    ) as matches
),
writer_shape as (
  select coalesce(bool_and(
    owner_role.rolname = 'postgres'
    and routine.prosecdef
    and coalesce(routine.proconfig, array[]::text[])
      @> array['search_path=public']::text[]
  ), false) as matches
  from pg_proc routine
  join pg_roles owner_role on owner_role.oid = routine.proowner
  where routine.oid = to_regprocedure(
    'public.apply_comment_translator_paid_entitlement_evidence(text,text,text,text,text,timestamp with time zone,text,timestamp with time zone,timestamp with time zone)'
  )
),
extension_state as (
  select
    exists (
      select 1
      from pg_extension installed
      join pg_namespace extension_schema
        on extension_schema.oid = installed.extnamespace
      where installed.extname = 'pgcrypto'
        and extension_schema.nspname = 'extensions'
    ) as installed_correctly,
    exists (
      select 1
      from pg_extension installed
      join pg_namespace extension_schema
        on extension_schema.oid = installed.extnamespace
      where installed.extname = 'pgcrypto'
        and extension_schema.nspname <> 'extensions'
    ) as installed_in_wrong_schema,
    exists (
      select 1
      from pg_available_extensions
      where name = 'pgcrypto'
    ) as available
),
dependency_state as (
  select
    to_regclass('auth.users') is not null
    and to_regprocedure('auth.uid()') is not null
    and (
      select count(*)
      from pg_roles
      where rolname in (
        'postgres',
        'anon',
        'authenticated',
        'authenticator',
        'service_role'
      )
    ) = 5
    and to_regclass(
      'public.comment_translator_paid_entitlements'
    ) is not null
    and to_regprocedure(
      'public.apply_comment_translator_paid_entitlement_evidence(text,text,text,text,text,timestamp with time zone,text,timestamp with time zone,timestamp with time zone)'
    ) is not null
    and (select matches from table_shape)
    and (select matches from writer_shape)
    and (
      (select installed_correctly from extension_state)
      or (
        not (select installed_in_wrong_schema from extension_state)
        and (select available from extension_state)
        and (select can_create_in_database from role_context)
      )
    )
    and (
      to_regnamespace('extensions') is not null
      or (select can_create_in_database from role_context)
    ) as ready
),
capability_state as (
  select
    expected_apply_role
    and (rolsuper or rolcreaterole)
    and can_create_in_database as postgres_ready,
    expected_apply_role
    and (rolsuper or rolcreaterole)
    and can_create_in_database
    and holds_postgres_role
    and case
      when to_regclass('auth.users') is null then false
      else has_table_privilege('postgres', 'auth.users', 'TRIGGER')
    end
    and case
      when to_regclass(
        'public.comment_translator_paid_entitlements'
      ) is null then false
      else (
        rolsuper
        or (
          select relation.relowner = (
            select oid from pg_roles where rolname = 'postgres'
          )
          from pg_class relation
          where relation.oid = to_regclass(
            'public.comment_translator_paid_entitlements'
          )
        )
      )
    end
    and case
      when to_regprocedure(
        'public.apply_comment_translator_paid_entitlement_evidence(text,text,text,text,text,timestamp with time zone,text,timestamp with time zone,timestamp with time zone)'
      ) is null then false
      else (
        rolsuper
        or (
          select routine.proowner = (
            select oid from pg_roles where rolname = 'postgres'
          )
          from pg_proc routine
          where routine.oid = to_regprocedure(
            'public.apply_comment_translator_paid_entitlement_evidence(text,text,text,text,text,timestamp with time zone,text,timestamp with time zone,timestamp with time zone)'
          )
        )
      )
    end as role_ready
  from role_context
),
collision_state as (
  select
    (
      select count(*)::integer
      from pg_roles
      where rolname in (
        'comment_translator_api_owner',
        'comment_translator_billing_reader'
      )
    ) as role_collision_count,
    (
      select count(*)::integer
      from pg_namespace
      where nspname in (
        'comment_translator_private',
        'comment_translator_api'
      )
    ) as schema_collision_count
),
postgrest_settings as (
  select unnest(setting_record.setconfig) as setting
  from pg_db_role_setting setting_record
  union all
  select
    'pgrst.db_schemas=' || current_setting('pgrst.db_schemas', true)
  where current_setting('pgrst.db_schemas', true) is not null
),
api_exposure as (
  select count(*)::integer as exposure_count
  from postgrest_settings
  cross join lateral regexp_split_to_table(
    substring(setting from length('pgrst.db_schemas=') + 1),
    '\s*,\s*'
  ) as exposed(exposed_schema)
  where setting like 'pgrst.db_schemas=%'
    and trim(both ' "' from exposed_schema) = 'comment_translator_api'
)
select
  'pass'::text as project_health_status,
  case when capability.postgres_ready then 'pass' else 'fail' end::text
    as postgres_capability_status,
  case
    when history.expected_prior_count = 16
      and history.sole_pending_count = 1
      and history.unexpected_pending_count = 0
      and history.target_applied_count = 0
      and history.unexpected_remote_count = 0
      and history.prior_order_matches
    then 'pass'
    else 'fail'
  end::text as migration_history_status,
  history.expected_prior_count as expected_prior_migration_count,
  history.sole_pending_count as sole_pending_migration_count,
  history.unexpected_pending_count as unexpected_pending_migration_count,
  case when dependency.ready then 'pass' else 'fail' end::text
    as dependency_status,
  case when capability.role_ready then 'pass' else 'fail' end::text
    as role_capability_status,
  collision.role_collision_count,
  collision.schema_collision_count,
  case
    when exposure.exposure_count = 0 then 'unexposed'
    else 'exposed'
  end::text as api_exposure_status
from history_metrics history
cross join dependency_state dependency
cross join capability_state capability
cross join collision_state collision
cross join api_exposure exposure;
