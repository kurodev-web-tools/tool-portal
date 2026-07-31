-- SIZE_OK: one immutable read-only statement with 84 source-bound predicate rows.
-- CTE index: manifests/normalizations -> catalog observations -> predicates/vectors -> classification -> seven outputs.
-- Rationale: the execution boundary cannot be split; named CTEs are the internal decomposition.
-- Regression safety: the static validator and fixed CTE fingerprints own structural regression checks.
with known_migrations(version, migration_ordinal) as (
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
candidate_manifest(
  version,
  candidate_ordinal,
  expected_relation_state,
  expected_predicate_count
) as (
  values
    ('20260623000000', 1, 'canonical', 27),
    ('20260624000000', 2, 'canonical', 4),
    ('20260705000000', 3, 'canonical', 31),
    ('20260706073204', 4, 'not-applicable', 22)
),
predicate_manifest(version, predicate_ordinal, predicate_id) as (
  values
    ('20260623000000', 1, 'm05_relation_01'),
    ('20260623000000', 2, 'm05_column_01'),
    ('20260623000000', 3, 'm05_column_02'),
    ('20260623000000', 4, 'm05_column_03'),
    ('20260623000000', 5, 'm05_column_04'),
    ('20260623000000', 6, 'm05_column_05'),
    ('20260623000000', 7, 'm05_column_06'),
    ('20260623000000', 8, 'm05_column_07'),
    ('20260623000000', 9, 'm05_column_08'),
    ('20260623000000', 10, 'm05_key_01'),
    ('20260623000000', 11, 'm05_key_02'),
    ('20260623000000', 12, 'm05_constraint_01'),
    ('20260623000000', 13, 'm05_constraint_02'),
    ('20260623000000', 14, 'm05_constraint_03'),
    ('20260623000000', 15, 'm05_constraint_04'),
    ('20260623000000', 16, 'm05_rls_01'),
    ('20260623000000', 17, 'm05_grant_01'),
    ('20260623000000', 18, 'm05_grant_02'),
    ('20260623000000', 19, 'm05_grant_03'),
    ('20260623000000', 20, 'm05_policy_01'),
    ('20260623000000', 21, 'm05_index_01'),
    ('20260623000000', 22, 'm05_index_02'),
    ('20260623000000', 23, 'm05_comment_01'),
    ('20260623000000', 24, 'm05_comment_02'),
    ('20260623000000', 25, 'm05_comment_03'),
    ('20260623000000', 26, 'm05_comment_04'),
    ('20260623000000', 27, 'm05_comment_05'),
    ('20260624000000', 1, 'm06_relation_01'),
    ('20260624000000', 2, 'm06_column_01'),
    ('20260624000000', 3, 'm06_constraint_01'),
    ('20260624000000', 4, 'm06_comment_01'),
    ('20260705000000', 1, 'm07_relation_01'),
    ('20260705000000', 2, 'm07_column_01'),
    ('20260705000000', 3, 'm07_column_02'),
    ('20260705000000', 4, 'm07_column_03'),
    ('20260705000000', 5, 'm07_column_04'),
    ('20260705000000', 6, 'm07_column_05'),
    ('20260705000000', 7, 'm07_column_06'),
    ('20260705000000', 8, 'm07_column_07'),
    ('20260705000000', 9, 'm07_column_08'),
    ('20260705000000', 10, 'm07_column_09'),
    ('20260705000000', 11, 'm07_column_10'),
    ('20260705000000', 12, 'm07_key_01'),
    ('20260705000000', 13, 'm07_key_02'),
    ('20260705000000', 14, 'm07_constraint_01'),
    ('20260705000000', 15, 'm07_constraint_02'),
    ('20260705000000', 16, 'm07_constraint_03'),
    ('20260705000000', 17, 'm07_constraint_04'),
    ('20260705000000', 18, 'm07_constraint_05'),
    ('20260705000000', 19, 'm07_rls_01'),
    ('20260705000000', 20, 'm07_grant_01'),
    ('20260705000000', 21, 'm07_grant_02'),
    ('20260705000000', 22, 'm07_grant_03'),
    ('20260705000000', 23, 'm07_policy_01'),
    ('20260705000000', 24, 'm07_index_01'),
    ('20260705000000', 25, 'm07_index_02'),
    ('20260705000000', 26, 'm07_comment_01'),
    ('20260705000000', 27, 'm07_comment_02'),
    ('20260705000000', 28, 'm07_comment_03'),
    ('20260705000000', 29, 'm07_comment_04'),
    ('20260705000000', 30, 'm07_comment_05'),
    ('20260705000000', 31, 'm07_comment_06'),
    ('20260706073204', 1, 'm08_table_acl_01'),
    ('20260706073204', 2, 'm08_table_acl_02'),
    ('20260706073204', 3, 'm08_table_acl_03'),
    ('20260706073204', 4, 'm08_table_acl_04'),
    ('20260706073204', 5, 'm08_table_acl_05'),
    ('20260706073204', 6, 'm08_table_acl_06'),
    ('20260706073204', 7, 'm08_table_acl_07'),
    ('20260706073204', 8, 'm08_table_acl_08'),
    ('20260706073204', 9, 'm08_table_acl_09'),
    ('20260706073204', 10, 'm08_table_acl_10'),
    ('20260706073204', 11, 'm08_table_acl_11'),
    ('20260706073204', 12, 'm08_table_acl_12'),
    ('20260706073204', 13, 'm08_sequence_acl_01'),
    ('20260706073204', 14, 'm08_sequence_acl_02'),
    ('20260706073204', 15, 'm08_sequence_acl_03'),
    ('20260706073204', 16, 'm08_sequence_acl_04'),
    ('20260706073204', 17, 'm08_sequence_acl_05'),
    ('20260706073204', 18, 'm08_sequence_acl_06'),
    ('20260706073204', 19, 'm08_function_acl_01'),
    ('20260706073204', 20, 'm08_function_acl_02'),
    ('20260706073204', 21, 'm08_function_acl_03'),
    ('20260706073204', 22, 'm08_function_acl_04')
),
expected_normalizations(
  version,
  predicate_id,
  normalization_slot,
  normalizer,
  expected_rendering
) as (
  values
    ('20260623000000', 'm05_column_01', 'column_default', 'pg_get_expr', 'gen_random_uuid()'),
    ('20260623000000', 'm05_column_05', 'column_default', 'pg_get_expr', '0'),
    ('20260623000000', 'm05_column_07', 'column_default', 'pg_get_expr', 'now()'),
    ('20260623000000', 'm05_column_08', 'column_default', 'pg_get_expr', 'now()'),
    ('20260705000000', 'm07_column_01', 'column_default', 'pg_get_expr', 'gen_random_uuid()'),
    ('20260705000000', 'm07_column_05', 'column_default', 'pg_get_expr', '''creator_closed_beta_2026''::text'),
    ('20260705000000', 'm07_column_06', 'column_default', 'pg_get_expr', '''registered''::text'),
    ('20260705000000', 'm07_column_07', 'column_default', 'pg_get_expr', '''first_month_discount''::text'),
    ('20260705000000', 'm07_column_08', 'column_default', 'pg_get_expr', 'now()'),
    ('20260705000000', 'm07_column_09', 'column_default', 'pg_get_expr', 'now()'),
    ('20260705000000', 'm07_column_10', 'column_default', 'pg_get_expr', 'now()'),
    ('20260623000000', 'm05_key_01', 'constraint_definition', 'pg_get_constraintdef', 'PRIMARY KEY (id)'),
    ('20260623000000', 'm05_key_02', 'constraint_definition', 'pg_get_constraintdef', 'FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
    ('20260623000000', 'm05_constraint_01', 'constraint_definition', 'pg_get_constraintdef', 'CHECK ((length(TRIM(BOTH FROM session_reference_id)) > 0))'),
    ('20260623000000', 'm05_constraint_02', 'constraint_definition', 'pg_get_constraintdef', 'CHECK ((display_row_count >= 0))'),
    ('20260623000000', 'm05_constraint_03', 'constraint_definition', 'pg_get_constraintdef', 'CHECK (((feed_snapshot ->> ''source''::text) = ''server-owned-live-session-state''::text))'),
    ('20260623000000', 'm05_constraint_04', 'constraint_definition', 'pg_get_constraintdef', 'CHECK ((((feed_snapshot ->> ''rawProviderPayload''::text) = ''not-returned-by-design''::text) AND ((feed_snapshot ->> ''rawComments''::text) = ''not-returned-by-design''::text) AND ((feed_snapshot ->> ''providerTargetMetadata''::text) = ''forbidden''::text) AND ((feed_snapshot ->> ''serverOnlyCursor''::text) = ''not-returned-by-design''::text) AND ((feed_snapshot ->> ''browserStorage''::text) = ''unchanged''::text) AND ((feed_snapshot ->> ''handoffPayload''::text) = ''unchanged''::text)))'),
    ('20260624000000', 'm06_constraint_01', 'constraint_definition', 'pg_get_constraintdef', 'CHECK (((time_zone IS NULL) OR (time_zone = ''UTC''::text) OR (time_zone ~ ''^[A-Za-z_]+(/[A-Za-z0-9_+.-]+)+$''::text)))'),
    ('20260705000000', 'm07_key_01', 'constraint_definition', 'pg_get_constraintdef', 'PRIMARY KEY (id)'),
    ('20260705000000', 'm07_key_02', 'constraint_definition', 'pg_get_constraintdef', 'FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
    ('20260705000000', 'm07_constraint_01', 'constraint_definition', 'pg_get_constraintdef', 'CHECK ((status = ANY (ARRAY[''registered''::text, ''invited''::text, ''discount_eligible''::text, ''discount_used''::text, ''cancelled''::text])))'),
    ('20260705000000', 'm07_constraint_02', 'constraint_definition', 'pg_get_constraintdef', 'CHECK ((length(TRIM(BOTH FROM campaign)) > 0))'),
    ('20260705000000', 'm07_constraint_03', 'constraint_definition', 'pg_get_constraintdef', 'CHECK ((discount_intent = ''first_month_discount''::text))'),
    ('20260705000000', 'm07_constraint_04', 'constraint_definition', 'pg_get_constraintdef', 'CHECK (((account_email IS NULL) OR (length(account_email) <= 320)))'),
    ('20260705000000', 'm07_constraint_05', 'constraint_definition', 'pg_get_constraintdef', 'CHECK (((account_display_name IS NULL) OR (length(account_display_name) <= 160)))'),
    ('20260623000000', 'm05_policy_01', 'policy_using', 'pg_get_expr', 'true'),
    ('20260623000000', 'm05_policy_01', 'policy_check', 'pg_get_expr', 'true'),
    ('20260705000000', 'm07_policy_01', 'policy_using', 'pg_get_expr', 'true'),
    ('20260705000000', 'm07_policy_01', 'policy_check', 'pg_get_expr', 'true'),
    ('20260623000000', 'm05_index_01', 'index_definition', 'pg_get_indexdef', 'CREATE UNIQUE INDEX comment_translator_real_comments_feed_snapshots_session_key ON public.comment_translator_real_comments_feed_snapshots USING btree (session_reference_id)'),
    ('20260623000000', 'm05_index_02', 'index_definition', 'pg_get_indexdef', 'CREATE INDEX comment_translator_real_comments_feed_snapshots_owner_session_i ON public.comment_translator_real_comments_feed_snapshots USING btree (owner_user_id, session_reference_id)'),
    ('20260705000000', 'm07_index_01', 'index_definition', 'pg_get_indexdef', 'CREATE UNIQUE INDEX comment_translator_creator_waitlist_owner_campaign_key ON public.comment_translator_creator_waitlist_registrations USING btree (owner_user_id, campaign)'),
    ('20260705000000', 'm07_index_02', 'index_definition', 'pg_get_indexdef', 'CREATE INDEX comment_translator_creator_waitlist_campaign_registered_idx ON public.comment_translator_creator_waitlist_registrations USING btree (campaign, registered_at DESC)')
),
expected_relations(
  version,
  schema_name,
  relation_name,
  expected_relation_kind
) as (
  values
    (
      '20260623000000',
      'public',
      'comment_translator_real_comments_feed_snapshots',
      'r'
    ),
    ('20260624000000', 'public', 'user_preferences', 'r'),
    (
      '20260705000000',
      'public',
      'comment_translator_creator_waitlist_registrations',
      'r'
    )
),
relation_matches as (
  select
    expected.version,
    expected.schema_name,
    expected.relation_name,
    expected.expected_relation_kind,
    count(namespace.oid)::integer as namespace_count,
    count(relation.oid)::integer as relation_count,
    min(relation.oid::bigint)::oid as relation_oid
  from expected_relations expected
  left join pg_namespace namespace
    on namespace.nspname = expected.schema_name
  left join pg_class relation
    on relation.relnamespace = namespace.oid
   and relation.relname = expected.relation_name
  group by
    expected.version,
    expected.schema_name,
    expected.relation_name,
    expected.expected_relation_kind
),
relation_observations as (
  select
    matches.*,
    relation.relkind as observed_relation_kind,
    relation.relrowsecurity as row_level_security_enabled,
    relation.relowner as relation_owner,
    relation.relacl as relation_acl
  from relation_matches matches
  left join pg_class relation on relation.oid = matches.relation_oid
),
relation_states as (
  select
    observation.*,
    case
      when observation.namespace_count <> 1
        or observation.relation_count > 1
        then 'unverifiable'
      when observation.relation_count = 0 then 'absent'
      when observation.observed_relation_kind is null then 'unverifiable'
      when observation.observed_relation_kind::text
        = observation.expected_relation_kind
        then 'canonical'
      else 'incompatible'
    end::text as relation_state
  from relation_observations observation
),
expected_columns(
  version,
  predicate_ordinal,
  predicate_id,
  column_ordinal,
  column_name,
  expected_format_type,
  expected_not_null,
  expected_has_default,
  expected_identity,
  expected_generated
) as (
  values
    ('20260623000000', 2, 'm05_column_01', 1, 'id', 'uuid', true, true, '', ''),
    ('20260623000000', 3, 'm05_column_02', 2, 'owner_user_id', 'uuid', true, false, '', ''),
    ('20260623000000', 4, 'm05_column_03', 3, 'session_reference_id', 'text', true, false, '', ''),
    ('20260623000000', 5, 'm05_column_04', 4, 'feed_snapshot', 'jsonb', true, false, '', ''),
    ('20260623000000', 6, 'm05_column_05', 5, 'display_row_count', 'integer', true, true, '', ''),
    ('20260623000000', 7, 'm05_column_06', 6, 'recorded_at', 'timestamp with time zone', true, false, '', ''),
    ('20260623000000', 8, 'm05_column_07', 7, 'created_at', 'timestamp with time zone', true, true, '', ''),
    ('20260623000000', 9, 'm05_column_08', 8, 'updated_at', 'timestamp with time zone', true, true, '', ''),
    ('20260624000000', 2, 'm06_column_01', 7, 'time_zone', 'text', false, false, '', ''),
    ('20260705000000', 2, 'm07_column_01', 1, 'id', 'uuid', true, true, '', ''),
    ('20260705000000', 3, 'm07_column_02', 2, 'owner_user_id', 'uuid', true, false, '', ''),
    ('20260705000000', 4, 'm07_column_03', 3, 'account_email', 'text', false, false, '', ''),
    ('20260705000000', 5, 'm07_column_04', 4, 'account_display_name', 'text', false, false, '', ''),
    ('20260705000000', 6, 'm07_column_05', 5, 'campaign', 'text', true, true, '', ''),
    ('20260705000000', 7, 'm07_column_06', 6, 'status', 'text', true, true, '', ''),
    ('20260705000000', 8, 'm07_column_07', 7, 'discount_intent', 'text', true, true, '', ''),
    ('20260705000000', 9, 'm07_column_08', 8, 'registered_at', 'timestamp with time zone', true, true, '', ''),
    ('20260705000000', 10, 'm07_column_09', 9, 'created_at', 'timestamp with time zone', true, true, '', ''),
    ('20260705000000', 11, 'm07_column_10', 10, 'updated_at', 'timestamp with time zone', true, true, '', '')
),
column_observations as (
  select
    expected.*,
    default_normalization.expected_rendering
      as expected_default_expression,
    relation.relation_state,
    attribute.attnum as observed_column_ordinal,
    attribute.attname as observed_column_name,
    format_type(attribute.atttypid, attribute.atttypmod)
      as observed_format_type,
    attribute.attnotnull as observed_not_null,
    attribute.attidentity::text as observed_identity,
    attribute.attgenerated::text as observed_generated,
    column_default.oid is not null as observed_has_default,
    pg_get_expr(column_default.adbin, column_default.adrelid, false)
      as observed_default_expression
  from expected_columns expected
  join relation_states relation on relation.version = expected.version
  left join expected_normalizations default_normalization
    on default_normalization.version = expected.version
   and default_normalization.predicate_id = expected.predicate_id
   and default_normalization.normalization_slot = 'column_default'
   and default_normalization.normalizer = 'pg_get_expr'
  left join pg_attribute attribute
    on attribute.attrelid = relation.relation_oid
   and attribute.attname = expected.column_name
   and attribute.attnum > 0
   and not attribute.attisdropped
  left join pg_attrdef column_default
    on column_default.adrelid = attribute.attrelid
   and column_default.adnum = attribute.attnum
),
column_results as (
  select
    observation.*,
    case
      when observation.relation_state = 'unverifiable' then 'u'
      when observation.relation_state in ('absent', 'incompatible') then 'f'
      when observation.observed_column_ordinal is null then 'f'
      when observation.observed_format_type is null
        or observation.observed_not_null is null
        or observation.observed_identity is null
        or observation.observed_generated is null
        or (
          observation.expected_has_default
          and (
            observation.expected_default_expression is null
            or (
              observation.observed_has_default
              and observation.observed_default_expression is null
            )
          )
        )
        then 'u'
      when observation.observed_column_ordinal
          = observation.column_ordinal
        and observation.observed_column_name = observation.column_name
        and observation.observed_format_type
          = observation.expected_format_type
        and observation.observed_not_null
          = observation.expected_not_null
        and observation.observed_has_default
          = observation.expected_has_default
        and (
          not observation.expected_has_default
          or observation.observed_default_expression
            = observation.expected_default_expression
        )
        and observation.observed_identity = observation.expected_identity
        and observation.observed_generated = observation.expected_generated
        then 'p'
      else 'f'
    end::text as predicate_result
  from column_observations observation
),
column_predicates as (
  select
    result.version,
    result.predicate_ordinal,
    result.predicate_result,
    (
      result.observed_column_ordinal is not null
      and result.predicate_result = 'f'
    ) as is_conflict
  from column_results result
),
expected_keys(
  version,
  predicate_ordinal,
  predicate_id,
  constraint_name,
  constraint_type,
  source_schema_name,
  source_relation_name,
  source_column_name,
  referenced_schema_name,
  referenced_relation_name,
  referenced_column_name,
  expected_update_action,
  expected_delete_action,
  expected_match_type
) as (
  values
    (
      '20260623000000',
      10,
      'm05_key_01',
      'comment_translator_real_comments_feed_snapshots_pkey',
      'p',
      'public',
      'comment_translator_real_comments_feed_snapshots',
      'id',
      null,
      null,
      null,
      null,
      null,
      null
    ),
    (
      '20260623000000',
      11,
      'm05_key_02',
      'comment_translator_real_comments_feed_snapsh_owner_user_id_fkey',
      'f',
      'public',
      'comment_translator_real_comments_feed_snapshots',
      'owner_user_id',
      'auth',
      'users',
      'id',
      'a',
      'c',
      's'
    ),
    (
      '20260705000000',
      12,
      'm07_key_01',
      'comment_translator_creator_waitlist_registrations_pkey',
      'p',
      'public',
      'comment_translator_creator_waitlist_registrations',
      'id',
      null,
      null,
      null,
      null,
      null,
      null
    ),
    (
      '20260705000000',
      13,
      'm07_key_02',
      'comment_translator_creator_waitlist_registra_owner_user_id_fkey',
      'f',
      'public',
      'comment_translator_creator_waitlist_registrations',
      'owner_user_id',
      'auth',
      'users',
      'id',
      'a',
      'c',
      's'
    )
),
key_observations as (
  select
    expected.*,
    definition_normalization.expected_rendering
      as expected_definition,
    relation.relation_state,
    constraint_match.constraint_count,
    constraint_record.oid as constraint_oid,
    constraint_record.contype::text as observed_constraint_type,
    array_length(constraint_record.conkey, 1)
      as observed_local_key_count,
    source_namespace.nspname as observed_source_schema_name,
    source_relation.relname as observed_source_relation_name,
    source_key_attribute.attname as observed_source_column_name,
    constraint_record.confrelid as observed_remote_relation_oid,
    array_length(constraint_record.confkey, 1)
      as observed_remote_key_count,
    referenced_namespace.nspname as observed_referenced_schema_name,
    referenced_relation.relname as observed_referenced_relation_name,
    referenced_key_attribute.attname
      as observed_referenced_column_name,
    constraint_record.confupdtype::text as observed_update_action,
    constraint_record.confdeltype::text as observed_delete_action,
    constraint_record.confmatchtype::text as observed_match_type,
    constraint_record.condeferrable as observed_deferrable,
    constraint_record.condeferred as observed_deferred,
    constraint_record.convalidated as observed_validated,
    pg_get_constraintdef(constraint_record.oid, false)
      as observed_definition
  from expected_keys expected
  join relation_states relation on relation.version = expected.version
  left join expected_normalizations definition_normalization
    on definition_normalization.version = expected.version
   and definition_normalization.predicate_id = expected.predicate_id
   and definition_normalization.normalization_slot
      = 'constraint_definition'
   and definition_normalization.normalizer = 'pg_get_constraintdef'
  left join lateral (
    select
      count(constraint_candidate.oid)::integer as constraint_count,
      min(constraint_candidate.oid::bigint)::oid as constraint_oid
    from pg_constraint constraint_candidate
    where constraint_candidate.conrelid = relation.relation_oid
      and constraint_candidate.conname = expected.constraint_name
  ) constraint_match on true
  left join pg_constraint constraint_record
    on constraint_record.oid = constraint_match.constraint_oid
  left join pg_class source_relation
    on source_relation.oid = constraint_record.conrelid
  left join pg_namespace source_namespace
    on source_namespace.oid = source_relation.relnamespace
  left join pg_attribute source_key_attribute
    on source_key_attribute.attrelid = constraint_record.conrelid
   and source_key_attribute.attnum = constraint_record.conkey[1]
   and source_key_attribute.attnum > 0
   and not source_key_attribute.attisdropped
  left join pg_class referenced_relation
    on referenced_relation.oid = constraint_record.confrelid
  left join pg_namespace referenced_namespace
    on referenced_namespace.oid = referenced_relation.relnamespace
  left join pg_attribute referenced_key_attribute
    on referenced_key_attribute.attrelid = constraint_record.confrelid
   and referenced_key_attribute.attnum = constraint_record.confkey[1]
   and referenced_key_attribute.attnum > 0
   and not referenced_key_attribute.attisdropped
),
key_results as (
  select
    observation.*,
    case
      when observation.relation_state = 'unverifiable' then 'u'
      when observation.relation_state in ('absent', 'incompatible') then 'f'
      when observation.constraint_count is null
        or observation.constraint_count > 1
        then 'u'
      when observation.constraint_count = 0 then 'f'
      when observation.constraint_oid is null
        or observation.expected_definition is null
        or observation.observed_definition is null
        or observation.observed_constraint_type is null
        or observation.observed_local_key_count is null
        or observation.observed_deferrable is null
        or observation.observed_deferred is null
        or observation.observed_validated is null
        then 'u'
      when observation.observed_local_key_count <> 1 then 'f'
      when observation.observed_source_schema_name is null
        or observation.observed_source_relation_name is null
        or observation.observed_source_column_name is null
        then 'u'
      when observation.observed_constraint_type = 'f'
        and (
          observation.observed_remote_key_count is null
          or observation.observed_referenced_schema_name is null
          or observation.observed_referenced_relation_name is null
          or observation.observed_referenced_column_name is null
          or observation.observed_update_action is null
          or observation.observed_delete_action is null
          or observation.observed_match_type is null
        )
        then 'u'
      when observation.observed_constraint_type
          = observation.constraint_type
        and observation.observed_definition = observation.expected_definition
        and observation.observed_source_schema_name
          = observation.source_schema_name
        and observation.observed_source_relation_name
          = observation.source_relation_name
        and observation.observed_source_column_name
          = observation.source_column_name
        and not observation.observed_deferrable
        and not observation.observed_deferred
        and observation.observed_validated
        and (
          (
            observation.constraint_type = 'p'
            and observation.observed_remote_relation_oid = 0
            and observation.observed_remote_key_count is null
          )
          or (
            observation.constraint_type = 'f'
            and observation.observed_remote_key_count = 1
            and observation.observed_referenced_schema_name
              = observation.referenced_schema_name
            and observation.observed_referenced_relation_name
              = observation.referenced_relation_name
            and observation.observed_referenced_column_name
              = observation.referenced_column_name
            and observation.observed_update_action
              = observation.expected_update_action
            and observation.observed_delete_action
              = observation.expected_delete_action
            and observation.observed_match_type
              = observation.expected_match_type
          )
        )
        then 'p'
      else 'f'
    end::text as predicate_result
  from key_observations observation
),
key_predicates as (
  select
    result.version,
    result.predicate_ordinal,
    result.predicate_result,
    (
      result.constraint_oid is not null
      and result.predicate_result = 'f'
    ) as is_conflict
  from key_results result
),
expected_checks(
  version,
  predicate_ordinal,
  predicate_id,
  constraint_name
) as (
  values
    (
      '20260623000000',
      12,
      'm05_constraint_01',
      'comment_translator_real_comments_feed_reference_nonempty'
    ),
    (
      '20260623000000',
      13,
      'm05_constraint_02',
      'comment_translator_real_comments_feed_display_count_nonnegative'
    ),
    (
      '20260623000000',
      14,
      'm05_constraint_03',
      'comment_translator_real_comments_feed_safe_source'
    ),
    (
      '20260623000000',
      15,
      'm05_constraint_04',
      'comment_translator_real_comments_feed_safe_payload_markers'
    ),
    (
      '20260624000000',
      3,
      'm06_constraint_01',
      'user_preferences_time_zone_format'
    ),
    (
      '20260705000000',
      14,
      'm07_constraint_01',
      'comment_translator_creator_waitlist_registrations_status_check'
    ),
    (
      '20260705000000',
      15,
      'm07_constraint_02',
      'comment_translator_creator_waitlist_campaign_nonempty'
    ),
    (
      '20260705000000',
      16,
      'm07_constraint_03',
      'comment_translator_creator_waitlist_discount_intent_check'
    ),
    (
      '20260705000000',
      17,
      'm07_constraint_04',
      'comment_translator_creator_waitlist_account_email_length'
    ),
    (
      '20260705000000',
      18,
      'm07_constraint_05',
      'comment_translator_creator_waitlist_display_name_length'
    )
),
check_observations as (
  select
    expected.*,
    definition_normalization.expected_rendering
      as expected_definition,
    relation.relation_state,
    constraint_record.oid as constraint_oid,
    constraint_record.contype::text as observed_constraint_type,
    constraint_record.convalidated as observed_validated,
    constraint_record.connoinherit as observed_no_inherit,
    pg_get_constraintdef(constraint_record.oid, false)
      as observed_definition
  from expected_checks expected
  join relation_states relation on relation.version = expected.version
  left join expected_normalizations definition_normalization
    on definition_normalization.version = expected.version
   and definition_normalization.predicate_id = expected.predicate_id
   and definition_normalization.normalization_slot
      = 'constraint_definition'
   and definition_normalization.normalizer = 'pg_get_constraintdef'
  left join pg_constraint constraint_record
    on constraint_record.conrelid = relation.relation_oid
   and constraint_record.conname = expected.constraint_name
),
check_results as (
  select
    observation.*,
    case
      when observation.relation_state = 'unverifiable' then 'u'
      when observation.relation_state in ('absent', 'incompatible') then 'f'
      when observation.constraint_oid is null then 'f'
      when observation.expected_definition is null
        or observation.observed_constraint_type is null
        or observation.observed_validated is null
        or observation.observed_no_inherit is null
        or observation.observed_definition is null
        then 'u'
      when observation.observed_constraint_type = 'c'
        and observation.observed_validated
        and not observation.observed_no_inherit
        and observation.observed_definition = observation.expected_definition
        then 'p'
      else 'f'
    end::text as predicate_result
  from check_observations observation
),
check_predicates as (
  select
    result.version,
    result.predicate_ordinal,
    result.predicate_result,
    (
      result.constraint_oid is not null
      and result.predicate_result = 'f'
    ) as is_conflict
  from check_results result
),
expected_rls(version, predicate_ordinal) as (
  values
    ('20260623000000', 16),
    ('20260705000000', 19)
),
rls_predicates as (
  select
    expected.version,
    expected.predicate_ordinal,
    case
      when relation.relation_state = 'unverifiable' then 'u'
      when relation.relation_state in ('absent', 'incompatible') then 'f'
      when relation.row_level_security_enabled is null then 'u'
      when relation.row_level_security_enabled then 'p'
      else 'f'
    end::text as predicate_result,
    false as is_conflict
  from expected_rls expected
  join relation_states relation on relation.version = expected.version
),
canonical_role_matches as (
  select
    expected.role_name,
    count(role_record.oid)::integer as role_count,
    min(role_record.oid::bigint)::oid as role_oid
  from (
    values ('anon'), ('authenticated'), ('service_role')
  ) expected(role_name)
  left join pg_roles role_record on role_record.rolname = expected.role_name
  group by expected.role_name
),
table_acl_states as (
  select
    relation.version,
    relation.relation_state,
    case
      when relation.relation_state = 'canonical'
        and relation.relation_owner is not null
        then coalesce(
          relation.relation_acl,
          acldefault('r'::"char", relation.relation_owner)
        )
      else null
    end as effective_acl
  from relation_states relation
  where relation.version in ('20260623000000', '20260705000000')
),
table_acl_entries as (
  select
    state.version,
    case
      when exploded.grantee = 0 then 'PUBLIC'
      else grantee_role.rolname
    end::text as grantee_name,
    exploded.privilege_type,
    exploded.is_grantable
  from table_acl_states state
  cross join lateral aclexplode(state.effective_acl) exploded
  left join pg_roles grantee_role on grantee_role.oid = exploded.grantee
),
expected_service_privileges(privilege_type) as (
  values
    ('DELETE'),
    ('INSERT'),
    ('REFERENCES'),
    ('SELECT'),
    ('TRIGGER'),
    ('TRUNCATE'),
    ('UPDATE')
),
expected_grants(
  version,
  predicate_ordinal,
  grantee_name,
  expected_mode
) as (
  values
    ('20260623000000', 17, 'anon', 'deny-all'),
    ('20260623000000', 18, 'authenticated', 'deny-all'),
    ('20260623000000', 19, 'service_role', 'canonical-all'),
    ('20260705000000', 20, 'anon', 'deny-all'),
    ('20260705000000', 21, 'authenticated', 'deny-all'),
    ('20260705000000', 22, 'service_role', 'canonical-all')
),
grant_observations as (
  select
    expected.*,
    state.relation_state,
    state.effective_acl,
    role_match.role_count,
    (
      select count(*)::integer
      from table_acl_entries entry
      where entry.version = expected.version
        and entry.grantee_name = expected.grantee_name
    ) as grantee_privilege_count,
    (
      select count(*)::integer
      from table_acl_entries entry
      where entry.version = expected.version
        and entry.grantee_name = expected.grantee_name
        and not entry.is_grantable
        and entry.privilege_type in (
          select privilege_type from expected_service_privileges
        )
    ) as canonical_service_privilege_count,
    (
      select count(*)::integer
      from table_acl_entries entry
      where entry.version = expected.version
        and entry.grantee_name = expected.grantee_name
        and (
          entry.is_grantable
          or entry.privilege_type not in (
            select privilege_type from expected_service_privileges
          )
        )
    ) as unexpected_service_privilege_count
  from expected_grants expected
  join table_acl_states state on state.version = expected.version
  left join canonical_role_matches role_match
    on role_match.role_name = expected.grantee_name
),
grant_results as (
  select
    observation.*,
    case
      when observation.relation_state = 'unverifiable' then 'u'
      when observation.relation_state in ('absent', 'incompatible') then 'f'
      when observation.effective_acl is null
        or observation.role_count <> 1
        then 'u'
      when observation.expected_mode = 'deny-all'
        and observation.grantee_privilege_count = 0
        then 'p'
      when observation.expected_mode = 'canonical-all'
        and observation.grantee_privilege_count = (
          select count(*) from expected_service_privileges
        )
        and observation.canonical_service_privilege_count = (
          select count(*) from expected_service_privileges
        )
        and observation.unexpected_service_privilege_count = 0
        then 'p'
      else 'f'
    end::text as predicate_result
  from grant_observations observation
),
grant_predicates as (
  select
    result.version,
    result.predicate_ordinal,
    result.predicate_result,
    (
      (
        result.expected_mode = 'deny-all'
        and result.grantee_privilege_count > 0
      )
      or (
        result.expected_mode = 'canonical-all'
        and result.unexpected_service_privilege_count > 0
      )
    ) as is_conflict
  from grant_results result
),
expected_policies(
  version,
  predicate_ordinal,
  predicate_id,
  policy_name,
  expected_command
) as (
  values
    (
      '20260623000000',
      20,
      'm05_policy_01',
      'comment_translator_real_comments_feed_snapshots_service_role_al',
      '*'
    ),
    (
      '20260705000000',
      23,
      'm07_policy_01',
      'comment_translator_creator_waitlist_service_role_all',
      '*'
    )
),
policy_observations as (
  select
    expected.*,
    using_normalization.expected_rendering
      as expected_using_expression,
    check_normalization.expected_rendering
      as expected_check_expression,
    relation.relation_state,
    service_role.role_count as service_role_count,
    service_role.role_oid as service_role_oid,
    policy_record.oid as policy_oid,
    policy_record.polcmd::text as observed_command,
    policy_record.polpermissive as observed_permissive,
    policy_record.polroles as observed_roles,
    pg_get_expr(policy_record.polqual, policy_record.polrelid, false)
      as observed_using_expression,
    pg_get_expr(policy_record.polwithcheck, policy_record.polrelid, false)
      as observed_check_expression
  from expected_policies expected
  join relation_states relation on relation.version = expected.version
  left join expected_normalizations using_normalization
    on using_normalization.version = expected.version
   and using_normalization.predicate_id = expected.predicate_id
   and using_normalization.normalization_slot = 'policy_using'
   and using_normalization.normalizer = 'pg_get_expr'
  left join expected_normalizations check_normalization
    on check_normalization.version = expected.version
   and check_normalization.predicate_id = expected.predicate_id
   and check_normalization.normalization_slot = 'policy_check'
   and check_normalization.normalizer = 'pg_get_expr'
  left join canonical_role_matches service_role
    on service_role.role_name = 'service_role'
  left join pg_policy policy_record
    on policy_record.polrelid = relation.relation_oid
   and policy_record.polname = expected.policy_name
),
policy_results as (
  select
    observation.*,
    case
      when observation.relation_state = 'unverifiable' then 'u'
      when observation.relation_state in ('absent', 'incompatible') then 'f'
      when observation.service_role_count <> 1 then 'u'
      when observation.policy_oid is null then 'f'
      when observation.expected_using_expression is null
        or observation.expected_check_expression is null
        or observation.observed_command is null
        or observation.observed_permissive is null
        or observation.observed_roles is null
        or observation.observed_using_expression is null
        or observation.observed_check_expression is null
        then 'u'
      when observation.observed_command = observation.expected_command
        and observation.observed_permissive
        and observation.observed_roles
          = array[observation.service_role_oid]::oid[]
        and observation.observed_using_expression
          = observation.expected_using_expression
        and observation.observed_check_expression
          = observation.expected_check_expression
        then 'p'
      else 'f'
    end::text as predicate_result
  from policy_observations observation
),
policy_predicates as (
  select
    result.version,
    result.predicate_ordinal,
    result.predicate_result,
    (
      result.policy_oid is not null
      and result.predicate_result = 'f'
    ) as is_conflict
  from policy_results result
),
expected_indexes(
  version,
  predicate_ordinal,
  predicate_id,
  index_name,
  expected_unique,
  expected_key_count,
  expected_index_keys,
  expected_index_options
) as (
  values
    (
      '20260623000000',
      21,
      'm05_index_01',
      'comment_translator_real_comments_feed_snapshots_session_key',
      true,
      1,
      '3',
      '0'
    ),
    (
      '20260623000000',
      22,
      'm05_index_02',
      'comment_translator_real_comments_feed_snapshots_owner_session_i',
      false,
      2,
      '2 3',
      '0 0'
    ),
    (
      '20260705000000',
      24,
      'm07_index_01',
      'comment_translator_creator_waitlist_owner_campaign_key',
      true,
      2,
      '2 5',
      '0 0'
    ),
    (
      '20260705000000',
      25,
      'm07_index_02',
      'comment_translator_creator_waitlist_campaign_registered_idx',
      false,
      2,
      '5 8',
      '0 3'
    )
),
index_observations as (
  select
    expected.*,
    definition_normalization.expected_rendering
      as expected_definition,
    relation.relation_state,
    index_relation.oid as index_oid,
    index_relation.relkind::text as observed_index_kind,
    index_metadata.indrelid as observed_table_oid,
    index_metadata.indisunique as observed_unique,
    index_metadata.indisprimary as observed_primary,
    index_metadata.indisvalid as observed_valid,
    index_metadata.indisready as observed_ready,
    index_metadata.indislive as observed_live,
    index_metadata.indnkeyatts as observed_key_count,
    index_metadata.indnatts as observed_attribute_count,
    index_metadata.indkey::text as observed_index_keys,
    index_metadata.indoption::text as observed_index_options,
    index_metadata.indexprs as observed_expressions,
    index_metadata.indpred as observed_predicate,
    case
      when index_relation.relkind::text = 'i'
        and index_metadata.indexrelid is not null
        then pg_get_indexdef(index_relation.oid, 0, false)
      else null
    end as observed_definition
  from expected_indexes expected
  join relation_states relation on relation.version = expected.version
  left join expected_normalizations definition_normalization
    on definition_normalization.version = expected.version
   and definition_normalization.predicate_id = expected.predicate_id
   and definition_normalization.normalization_slot = 'index_definition'
   and definition_normalization.normalizer = 'pg_get_indexdef'
  left join pg_namespace index_namespace
    on index_namespace.nspname = 'public'
  left join pg_class index_relation
    on index_relation.relnamespace = index_namespace.oid
   and index_relation.relname = expected.index_name
  left join pg_index index_metadata
    on index_metadata.indexrelid = index_relation.oid
),
index_results as (
  select
    observation.*,
    case
      when observation.relation_state = 'unverifiable' then 'u'
      when observation.relation_state in ('absent', 'incompatible') then 'f'
      when observation.index_oid is null then 'f'
      when observation.observed_index_kind is null then 'u'
      when observation.observed_index_kind <> 'i' then 'f'
      when observation.observed_table_oid is null then 'f'
      when observation.expected_definition is null
        or observation.observed_unique is null
        or observation.observed_primary is null
        or observation.observed_valid is null
        or observation.observed_ready is null
        or observation.observed_live is null
        or observation.observed_key_count is null
        or observation.observed_attribute_count is null
        or observation.observed_index_keys is null
        or observation.observed_index_options is null
        or observation.observed_definition is null
        then 'u'
      when observation.observed_index_kind = 'i'
        and observation.observed_table_oid = (
          select relation_oid
          from relation_states matching_relation
          where matching_relation.version = observation.version
        )
        and observation.observed_unique = observation.expected_unique
        and not observation.observed_primary
        and observation.observed_valid
        and observation.observed_ready
        and observation.observed_live
        and observation.observed_key_count = observation.expected_key_count
        and observation.observed_attribute_count
          = observation.expected_key_count
        and observation.observed_index_keys = observation.expected_index_keys
        and observation.observed_index_options
          = observation.expected_index_options
        and observation.observed_expressions is null
        and observation.observed_predicate is null
        and observation.observed_definition = observation.expected_definition
        then 'p'
      else 'f'
    end::text as predicate_result
  from index_observations observation
),
index_predicates as (
  select
    result.version,
    result.predicate_ordinal,
    result.predicate_result,
    (
      result.index_oid is not null
      and result.predicate_result = 'f'
    ) as is_conflict
  from index_results result
),
expected_comments(
  version,
  predicate_ordinal,
  object_subid,
  expected_comment
) as (
  values
    (
      '20260623000000',
      24,
      0,
      'Server-owned Kuro Live Comment Translator safe feed snapshots scoped to an active session. Service-role only.'
    ),
    (
      '20260623000000',
      25,
      2,
      'Server-only owner binding for authorization. The value is never browser-readable.'
    ),
    (
      '20260623000000',
      26,
      3,
      'Opaque Comment Translator session reference used to bind safe feed rows to the active session.'
    ),
    (
      '20260623000000',
      27,
      4,
      'Browser-safe feed JSON only; no raw provider payloads, raw comments, provider target metadata, liveChatId, cursor, or author channel material.'
    ),
    (
      '20260624000000',
      4,
      7,
      'Shared display timezone preference, stored as an IANA timezone name such as Asia/Tokyo. Display-only; quota and rate-limit authority remains UTC-based.'
    ),
    (
      '20260705000000',
      27,
      0,
      'Server-owned Creator closed beta pre-registration rows. Service-role only; public UI receives sanitized registration state.'
    ),
    (
      '20260705000000',
      28,
      2,
      'Trusted server ownership reference used for duplicate prevention and account cleanup. This value is never public-browser-readable.'
    ),
    (
      '20260705000000',
      29,
      3,
      'Admin-only account email captured from Supabase Auth at registration time when available.'
    ),
    (
      '20260705000000',
      30,
      4,
      'Admin-only display name captured from existing account metadata when available.'
    ),
    (
      '20260705000000',
      31,
      7,
      'Future Stripe eligibility intent only. This migration does not create coupons, promotion codes, Checkout, Portal, or webhooks.'
    )
),
comment_observations as (
  select
    expected.*,
    relation.relation_state,
    description.description as observed_comment
  from expected_comments expected
  join relation_states relation on relation.version = expected.version
  left join pg_description description
    on description.objoid = relation.relation_oid
   and description.classoid = 'pg_class'::regclass
   and description.objsubid = expected.object_subid
),
comment_results as (
  select
    observation.*,
    case
      when observation.relation_state = 'unverifiable' then 'u'
      when observation.relation_state in ('absent', 'incompatible') then 'f'
      when observation.observed_comment is null then 'f'
      when observation.observed_comment = observation.expected_comment then 'p'
      else 'f'
    end::text as predicate_result
  from comment_observations observation
),
comment_predicates as (
  select
    result.version,
    result.predicate_ordinal,
    result.predicate_result,
    (
      result.observed_comment is not null
      and result.predicate_result = 'f'
    ) as is_conflict
  from comment_results result
),
expected_comment_coverage(
  version,
  predicate_ordinal,
  expected_comment_count
) as (
  values
    ('20260623000000', 23, 4),
    ('20260705000000', 26, 5)
),
comment_coverage_predicates as (
  select
    coverage.version,
    coverage.predicate_ordinal,
    case
      when relation.relation_state = 'unverifiable' then 'u'
      when relation.relation_state in ('absent', 'incompatible') then 'f'
      when count(comment.observed_comment)::integer
        = coverage.expected_comment_count
        then 'p'
      else 'f'
    end::text as predicate_result,
    false as is_conflict
  from expected_comment_coverage coverage
  join relation_states relation on relation.version = coverage.version
  left join comment_observations comment
    on comment.version = coverage.version
  group by
    coverage.version,
    coverage.predicate_ordinal,
    coverage.expected_comment_count,
    relation.relation_state
),
expected_default_acl(
  version,
  predicate_ordinal,
  object_type,
  grantee_name,
  privilege_type
) as (
  values
    ('20260706073204', 1, 'r', 'anon', 'SELECT'),
    ('20260706073204', 2, 'r', 'anon', 'INSERT'),
    ('20260706073204', 3, 'r', 'anon', 'UPDATE'),
    ('20260706073204', 4, 'r', 'anon', 'DELETE'),
    ('20260706073204', 5, 'r', 'authenticated', 'SELECT'),
    ('20260706073204', 6, 'r', 'authenticated', 'INSERT'),
    ('20260706073204', 7, 'r', 'authenticated', 'UPDATE'),
    ('20260706073204', 8, 'r', 'authenticated', 'DELETE'),
    ('20260706073204', 9, 'r', 'service_role', 'SELECT'),
    ('20260706073204', 10, 'r', 'service_role', 'INSERT'),
    ('20260706073204', 11, 'r', 'service_role', 'UPDATE'),
    ('20260706073204', 12, 'r', 'service_role', 'DELETE'),
    ('20260706073204', 13, 'S', 'anon', 'USAGE'),
    ('20260706073204', 14, 'S', 'anon', 'SELECT'),
    ('20260706073204', 15, 'S', 'authenticated', 'USAGE'),
    ('20260706073204', 16, 'S', 'authenticated', 'SELECT'),
    ('20260706073204', 17, 'S', 'service_role', 'USAGE'),
    ('20260706073204', 18, 'S', 'service_role', 'SELECT'),
    ('20260706073204', 19, 'f', 'anon', 'EXECUTE'),
    ('20260706073204', 20, 'f', 'authenticated', 'EXECUTE'),
    ('20260706073204', 21, 'f', 'service_role', 'EXECUTE'),
    ('20260706073204', 22, 'f', 'PUBLIC', 'EXECUTE')
),
default_acl_identity as (
  select
    (
      select count(*)::integer
      from pg_roles owner_role
      where owner_role.rolname = 'postgres'
    ) as owner_count,
    (
      select min(owner_role.oid::bigint)::oid
      from pg_roles owner_role
      where owner_role.rolname = 'postgres'
    ) as owner_oid,
    (
      select count(*)::integer
      from pg_namespace namespace
      where namespace.nspname = 'public'
    ) as namespace_count,
    (
      select min(namespace.oid::bigint)::oid
      from pg_namespace namespace
      where namespace.nspname = 'public'
    ) as namespace_oid
),
default_acl_domain_observations as (
  select
    identity_state.*,
    count(observed_default_acl.oid) filter (
      where observed_default_acl.oid is not null
        and (
          observed_default_acl.defaclobjtype is null
          or observed_default_acl.defaclobjtype::text
            not in ('r', 'S', 'f', 'T', 'n', 'L')
        )
    )::integer as unknown_object_type_count
  from default_acl_identity identity_state
  left join pg_default_acl observed_default_acl
    on observed_default_acl.defaclrole = identity_state.owner_oid
   and observed_default_acl.defaclnamespace
      = identity_state.namespace_oid
  group by
    identity_state.owner_count,
    identity_state.owner_oid,
    identity_state.namespace_count,
    identity_state.namespace_oid
),
default_acl_classes(object_type) as (
  values ('r'), ('S'), ('f')
),
default_acl_row_counts as (
  select
    object_class.object_type,
    domain_observation.owner_count,
    domain_observation.owner_oid,
    domain_observation.namespace_count,
    domain_observation.namespace_oid,
    domain_observation.unknown_object_type_count,
    count(default_acl.oid)::integer as default_acl_row_count,
    min(default_acl.oid::bigint)::oid as default_acl_oid
  from default_acl_classes object_class
  cross join default_acl_domain_observations domain_observation
  left join pg_default_acl default_acl
    on default_acl.defaclrole = domain_observation.owner_oid
   and default_acl.defaclnamespace = domain_observation.namespace_oid
   and default_acl.defaclobjtype::text = object_class.object_type
  group by
    object_class.object_type,
    domain_observation.owner_count,
    domain_observation.owner_oid,
    domain_observation.namespace_count,
    domain_observation.namespace_oid,
    domain_observation.unknown_object_type_count
),
default_acl_states as (
  select
    row_count.*,
    case
      when row_count.default_acl_row_count = 1 then selected.defaclacl
      when row_count.default_acl_row_count = 0
        and row_count.owner_count = 1
        and row_count.namespace_count = 1
        then acldefault(
          row_count.object_type::"char",
          row_count.owner_oid
        )
      else null
    end as effective_acl
  from default_acl_row_counts row_count
  left join pg_default_acl selected
    on selected.oid = row_count.default_acl_oid
),
default_acl_readability as (
  select
    state.*,
    case
      when state.owner_count <> 1
        or state.namespace_count <> 1
        or state.unknown_object_type_count > 0
        or state.object_type not in ('r', 'S', 'f')
        or state.default_acl_row_count > 1
        or state.effective_acl is null
        then 'unverifiable'
      else 'readable'
    end::text as acl_state
  from default_acl_states state
),
default_acl_entries as (
  select
    state.object_type,
    case
      when exploded.grantee = 0 then 'PUBLIC'
      else grantee_role.rolname
    end::text as grantee_name,
    exploded.privilege_type
  from default_acl_readability state
  cross join lateral aclexplode(state.effective_acl) exploded
  left join pg_roles grantee_role on grantee_role.oid = exploded.grantee
),
default_acl_predicates as (
  select
    expected.version,
    expected.predicate_ordinal,
    case
      when state.acl_state <> 'readable' then 'u'
      when expected.grantee_name <> 'PUBLIC'
        and role_match.role_count <> 1
        then 'u'
      when exists (
        select 1
        from default_acl_entries entry
        where entry.object_type = expected.object_type
          and entry.grantee_name = expected.grantee_name
          and entry.privilege_type = expected.privilege_type
      )
        then 'f'
      else 'p'
    end::text as predicate_result,
    false as is_conflict
  from expected_default_acl expected
  join default_acl_readability state
    on state.object_type = expected.object_type
  left join canonical_role_matches role_match
    on role_match.role_name = expected.grantee_name
),
relation_predicates as (
  select
    relation.version,
    1 as predicate_ordinal,
    case relation.relation_state
      when 'canonical' then 'p'
      when 'absent' then 'f'
      when 'incompatible' then 'f'
      else 'u'
    end::text as predicate_result,
    false as is_conflict
  from relation_states relation
),
raw_predicate_evaluations as (
  select * from relation_predicates
  union all
  select * from column_predicates
  union all
  select * from key_predicates
  union all
  select * from check_predicates
  union all
  select * from rls_predicates
  union all
  select * from grant_predicates
  union all
  select * from policy_predicates
  union all
  select * from index_predicates
  union all
  select * from comment_coverage_predicates
  union all
  select * from comment_predicates
  union all
  select * from default_acl_predicates
),
predicate_evaluations as (
  select
    manifest.version,
    manifest.predicate_ordinal,
    manifest.predicate_id,
    case
      when count(evaluation.version) = 1
        and min(evaluation.predicate_result) in ('p', 'f', 'u')
        then min(evaluation.predicate_result)
      else 'u'
    end::text as predicate_result,
    case
      when count(evaluation.version) = 1
        then coalesce(bool_or(evaluation.is_conflict), false)
      else false
    end as is_conflict
  from predicate_manifest manifest
  left join raw_predicate_evaluations evaluation
    on evaluation.version = manifest.version
   and evaluation.predicate_ordinal = manifest.predicate_ordinal
  group by
    manifest.version,
    manifest.predicate_ordinal,
    manifest.predicate_id
),
table_security_conflicts as (
  select
    state.version,
    coalesce(
      bool_or(entry.grantee_name in ('PUBLIC', 'anon', 'authenticated')),
      false
    ) as has_conflict
  from table_acl_states state
  left join table_acl_entries entry on entry.version = state.version
  group by state.version
),
policy_browser_conflicts as (
  select
    relation.version,
    coalesce(
      bool_or(
        policy_record.oid is not null
        and (
          0::oid = any(policy_record.polroles)
          or exists (
            select 1
            from canonical_role_matches browser_role
            where browser_role.role_name in ('anon', 'authenticated')
              and browser_role.role_count = 1
              and browser_role.role_oid = any(policy_record.polroles)
          )
        )
      ),
      false
    ) as has_conflict,
    coalesce(
      bool_or(
        policy_record.oid is not null
        and policy_record.polroles is null
      ),
      false
    ) as is_unverifiable
  from relation_states relation
  left join pg_policy policy_record
    on policy_record.polrelid = relation.relation_oid
  where relation.version in ('20260623000000', '20260705000000')
  group by relation.version
),
predicate_vectors as (
  select
    candidate.version,
    candidate.candidate_ordinal,
    candidate.expected_relation_state,
    candidate.expected_predicate_count,
    case
      when count(evaluation.predicate_id)
          <> candidate.expected_predicate_count
        or count(distinct evaluation.predicate_id)
          <> candidate.expected_predicate_count
        then repeat('u', candidate.expected_predicate_count)
      else string_agg(
        evaluation.predicate_result,
        ''
        order by evaluation.predicate_ordinal
      )
    end::text as predicate_vector,
    coalesce(bool_or(evaluation.is_conflict), false) as predicate_conflict
  from candidate_manifest candidate
  left join predicate_evaluations evaluation
    on evaluation.version = candidate.version
  group by
    candidate.version,
    candidate.candidate_ordinal,
    candidate.expected_relation_state,
    candidate.expected_predicate_count
),
version_states as (
  select
    vector.*,
    case
      when vector.expected_relation_state = 'not-applicable'
        then 'not-applicable'
      else coalesce(relation.relation_state, 'unverifiable')
    end::text as relation_state,
    coalesce(table_conflict.has_conflict, false)
      or coalesce(policy_conflict.has_conflict, false)
      as additional_conflict,
    coalesce(policy_conflict.is_unverifiable, false)
      as additional_unverifiable
  from predicate_vectors vector
  left join relation_states relation on relation.version = vector.version
  left join table_security_conflicts table_conflict
    on table_conflict.version = vector.version
  left join policy_browser_conflicts policy_conflict
    on policy_conflict.version = vector.version
),
version_matrix as (
  select
    state.*,
    case
      when state.relation_state = 'unverifiable'
        or position('u' in state.predicate_vector) > 0
        or state.additional_unverifiable
        then 'unverifiable'
      when state.relation_state = 'incompatible'
        or state.predicate_conflict
        or state.additional_conflict
        then 'conflict'
      else 'clear'
    end::text as conflict_state
  from version_states state
),
classified as (
  select
    matrix.version,
    matrix.candidate_ordinal,
    matrix.relation_state,
    matrix.conflict_state,
    matrix.predicate_vector,
    case
      when matrix.relation_state = 'unverifiable'
        or matrix.conflict_state = 'unverifiable'
        or position('u' in matrix.predicate_vector) > 0
        then 'unverifiable'
      when matrix.conflict_state = 'conflict'
        or matrix.relation_state = 'incompatible'
        then 'conflicting'
      when matrix.relation_state = 'absent'
        and position('p' in substring(matrix.predicate_vector from 2)) > 0
        then 'conflicting'
      when matrix.relation_state = 'absent' then 'absent'
      when matrix.relation_state = 'not-applicable'
        and matrix.predicate_vector
          = repeat('f', matrix.expected_predicate_count)
        then 'absent'
      when matrix.relation_state = 'not-applicable'
        and matrix.predicate_vector
          = repeat('p', matrix.expected_predicate_count)
        then 'canonical-effect-equivalent'
      when matrix.relation_state = 'not-applicable' then 'partial'
      when matrix.relation_state = 'canonical'
        and matrix.predicate_vector
          = repeat('p', matrix.expected_predicate_count)
        then 'canonical-effect-equivalent'
      when matrix.relation_state = 'canonical' then 'partial'
      else 'unverifiable'
    end::text as status
  from version_matrix matrix
),
unknown_count as (
  select
    count(distinct remote.version)::integer
      as unknown_remote_migration_count
  from supabase_migrations.schema_migrations remote
  left join known_migrations known on known.version = remote.version::text
  where known.version is null
)
select
  string_agg(
    version || ':' || relation_state || ':' || conflict_state || ':' || predicate_vector,
    '|' order by candidate_ordinal
  )::text as strict_source_equivalence_matrix,
  count(*) filter (
    where status = 'canonical-effect-equivalent'
  )::integer as canonical_effect_equivalent_count,
  count(*) filter (where status = 'absent')::integer as absent_count,
  count(*) filter (where status = 'partial')::integer as partial_count,
  count(*) filter (where status = 'conflicting')::integer as conflicting_count,
  count(*) filter (where status = 'unverifiable')::integer as unverifiable_count,
  unknown_count.unknown_remote_migration_count::integer
    as unknown_remote_migration_count
from classified
cross join unknown_count
group by unknown_count.unknown_remote_migration_count;
