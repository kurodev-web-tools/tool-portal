with known_migrations(version) as (
  values
    ('20260527000000'),
    ('20260601000000'),
    ('20260615000000'),
    ('20260615001000'),
    ('20260623000000'),
    ('20260624000000'),
    ('20260705000000'),
    ('20260706073204'),
    ('20260722000000'),
    ('20260722001000'),
    ('20260722002000'),
    ('20260722003000'),
    ('20260723000000'),
    ('20260723001000'),
    ('20260723002000'),
    ('20260723003000'),
    ('20260730000000')
),
effect_checks(version, ordinal, satisfied_count, expected_count, conflict_count) as (
  select
    '20260623000000',
    1,
    (
      (to_regclass('public.comment_translator_real_comments_feed_snapshots') is not null)::integer
      + ((select count(*) = 8 from information_schema.columns
          where table_schema = 'public'
            and table_name = 'comment_translator_real_comments_feed_snapshots'))::integer
      + ((select count(*) = 4 from pg_constraint
          where conrelid = to_regclass('public.comment_translator_real_comments_feed_snapshots')
            and contype = 'c'))::integer
      + coalesce((select relrowsecurity from pg_class
          where oid = to_regclass('public.comment_translator_real_comments_feed_snapshots')), false)::integer
      + ((select count(*) = 1 from pg_policies
          where schemaname = 'public'
            and tablename = 'comment_translator_real_comments_feed_snapshots'
            and cmd = 'ALL'
            and roles = array['service_role']::name[]))::integer
      + ((to_regclass('public.comment_translator_real_comments_feed_snapshots_session_key') is not null
          and to_regclass('public.comment_translator_real_comments_feed_snapshots_owner_session_idx') is not null))::integer
    ),
    6,
    (
      (to_regclass('public.comment_translator_real_comments_feed_snapshots') is not null
        and (
          has_table_privilege('anon', 'public.comment_translator_real_comments_feed_snapshots', 'SELECT,INSERT,UPDATE,DELETE')
          or has_table_privilege('authenticated', 'public.comment_translator_real_comments_feed_snapshots', 'SELECT,INSERT,UPDATE,DELETE')
        ))::integer
    )
  union all
  select
    '20260624000000',
    2,
    (
      ((select count(*) = 1 from information_schema.columns
          where table_schema = 'public'
            and table_name = 'user_preferences'
            and column_name = 'time_zone'
            and data_type = 'text'))::integer
      + ((select count(*) = 1 from pg_constraint
          where conrelid = to_regclass('public.user_preferences')
            and conname = 'user_preferences_time_zone_format'
            and contype = 'c'))::integer
      + (col_description(
          to_regclass('public.user_preferences'),
          (select attnum from pg_attribute
           where attrelid = to_regclass('public.user_preferences')
             and attname = 'time_zone'
             and not attisdropped)
        ) is not null)::integer
    ),
    3,
    0
  union all
  select
    '20260705000000',
    3,
    (
      (to_regclass('public.comment_translator_creator_waitlist_registrations') is not null)::integer
      + ((select count(*) = 10 from information_schema.columns
          where table_schema = 'public'
            and table_name = 'comment_translator_creator_waitlist_registrations'))::integer
      + ((select count(*) = 5 from pg_constraint
          where conrelid = to_regclass('public.comment_translator_creator_waitlist_registrations')
            and contype = 'c'))::integer
      + coalesce((select relrowsecurity from pg_class
          where oid = to_regclass('public.comment_translator_creator_waitlist_registrations')), false)::integer
      + ((select count(*) = 1 from pg_policies
          where schemaname = 'public'
            and tablename = 'comment_translator_creator_waitlist_registrations'
            and cmd = 'ALL'
            and roles = array['service_role']::name[]))::integer
      + ((to_regclass('public.comment_translator_creator_waitlist_owner_campaign_key') is not null
          and to_regclass('public.comment_translator_creator_waitlist_campaign_registered_idx') is not null))::integer
    ),
    6,
    (
      (to_regclass('public.comment_translator_creator_waitlist_registrations') is not null
        and (
          has_table_privilege('anon', 'public.comment_translator_creator_waitlist_registrations', 'SELECT,INSERT,UPDATE,DELETE')
          or has_table_privilege('authenticated', 'public.comment_translator_creator_waitlist_registrations', 'SELECT,INSERT,UPDATE,DELETE')
        ))::integer
    )
  union all
  select
    '20260706073204',
    4,
    (
      not exists (
        select 1
        from (values ('r'::"char"), ('S'::"char"), ('f'::"char")) kinds(objtype)
        cross join lateral (
          select
            coalesce(default_acl.defaclacl, acldefault(kinds.objtype, owner_role.oid)) as acl
          from pg_roles owner_role
          left join pg_default_acl default_acl
            on default_acl.defaclrole = owner_role.oid
           and default_acl.defaclnamespace = (select oid from pg_namespace where nspname = 'public')
           and default_acl.defaclobjtype = kinds.objtype
          where owner_role.rolname = 'postgres'
        ) defaults
        cross join lateral aclexplode(defaults.acl) exploded
        left join pg_roles grantee_role on grantee_role.oid = exploded.grantee
        where
          (exploded.grantee = 0 or grantee_role.rolname in ('anon', 'authenticated', 'service_role'))
          and (
            (kinds.objtype = 'r' and exploded.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE'))
            or (kinds.objtype = 'S' and exploded.privilege_type in ('USAGE', 'SELECT'))
            or (kinds.objtype = 'f' and exploded.privilege_type = 'EXECUTE')
          )
      )
    )::integer,
    1,
    0
),
classified as (
  select
    version,
    ordinal,
    case
      when conflict_count > 0 then 'conflicting'
      when satisfied_count = expected_count then 'equivalent-present'
      when satisfied_count = 0 then 'missing'
      when satisfied_count between 1 and expected_count - 1 then 'partial'
      else 'unverifiable'
    end::text as status
  from effect_checks
),
unknown_count as (
  select count(distinct remote.version)::integer as unknown_remote_migration_count
  from supabase_migrations.schema_migrations remote
  left join known_migrations known on known.version = remote.version::text
  where known.version is null
)
select
  string_agg(version || ':' || status, '|' order by ordinal)::text
    as prior_migration_state_matrix,
  count(*) filter (where status = 'equivalent-present')::integer
    as equivalent_present_count,
  count(*) filter (where status = 'missing')::integer as missing_count,
  count(*) filter (where status = 'partial')::integer as partial_count,
  count(*) filter (where status = 'conflicting')::integer as conflicting_count,
  count(*) filter (where status = 'unverifiable')::integer as unverifiable_count,
  unknown_count.unknown_remote_migration_count
from classified
cross join unknown_count
group by unknown_count.unknown_remote_migration_count;
