export const sqlForeignKeySourceBindings = [
  {
    version: "20260623000000",
    predicateOrdinal: 11,
    predicateId: "m05_key_02",
    constraintName: "comment_translator_real_comments_feed_snapsh_owner_user_id_fkey",
    sourceSchema: "public",
    sourceRelation: "comment_translator_real_comments_feed_snapshots",
    sourceColumn: "owner_user_id",
    referencedSchema: "auth",
    referencedRelation: "users",
    referencedColumn: "id",
    updateAction: "a",
    deleteAction: "c",
    matchType: "s"
  },
  {
    version: "20260705000000",
    predicateOrdinal: 13,
    predicateId: "m07_key_02",
    constraintName: "comment_translator_creator_waitlist_registra_owner_user_id_fkey",
    sourceSchema: "public",
    sourceRelation: "comment_translator_creator_waitlist_registrations",
    sourceColumn: "owner_user_id",
    referencedSchema: "auth",
    referencedRelation: "users",
    referencedColumn: "id",
    updateAction: "a",
    deleteAction: "c",
    matchType: "s"
  }
];

export const sqlDefaultAclStateCases = [
  { rowCount: 0, source: "acldefault", state: "readable" },
  { rowCount: 1, source: "defaclacl", state: "readable" },
  { rowCount: 2, source: null, state: "unverifiable" }
];

export const sqlDefaultAclObjectTypeCases = [
  { objectType: "r", domain: "canonical-evaluated", incrementsUnknownCount: false },
  { objectType: "S", domain: "canonical-evaluated", incrementsUnknownCount: false },
  { objectType: "f", domain: "canonical-evaluated", incrementsUnknownCount: false },
  { objectType: "T", domain: "known-out-of-domain", incrementsUnknownCount: false },
  { objectType: "n", domain: "known-out-of-domain", incrementsUnknownCount: false },
  { objectType: "L", domain: "known-out-of-domain", incrementsUnknownCount: false },
  { objectType: null, domain: "unknown-unverifiable", incrementsUnknownCount: true },
  { objectType: "x", domain: "synthetic-unknown-unverifiable", incrementsUnknownCount: true }
];

export const sqlNormalizationBindings = [
  { version: "20260623000000", predicateId: "m05_column_01", slot: "column_default", normalizer: "pg_get_expr", rendering: "gen_random_uuid()" },
  { version: "20260623000000", predicateId: "m05_column_05", slot: "column_default", normalizer: "pg_get_expr", rendering: "0" },
  { version: "20260623000000", predicateId: "m05_column_07", slot: "column_default", normalizer: "pg_get_expr", rendering: "now()" },
  { version: "20260623000000", predicateId: "m05_column_08", slot: "column_default", normalizer: "pg_get_expr", rendering: "now()" },
  { version: "20260705000000", predicateId: "m07_column_01", slot: "column_default", normalizer: "pg_get_expr", rendering: "gen_random_uuid()" },
  { version: "20260705000000", predicateId: "m07_column_05", slot: "column_default", normalizer: "pg_get_expr", rendering: "'creator_closed_beta_2026'::text" },
  { version: "20260705000000", predicateId: "m07_column_06", slot: "column_default", normalizer: "pg_get_expr", rendering: "'registered'::text" },
  { version: "20260705000000", predicateId: "m07_column_07", slot: "column_default", normalizer: "pg_get_expr", rendering: "'first_month_discount'::text" },
  { version: "20260705000000", predicateId: "m07_column_08", slot: "column_default", normalizer: "pg_get_expr", rendering: "now()" },
  { version: "20260705000000", predicateId: "m07_column_09", slot: "column_default", normalizer: "pg_get_expr", rendering: "now()" },
  { version: "20260705000000", predicateId: "m07_column_10", slot: "column_default", normalizer: "pg_get_expr", rendering: "now()" },
  { version: "20260623000000", predicateId: "m05_key_01", slot: "constraint_definition", normalizer: "pg_get_constraintdef", rendering: "PRIMARY KEY (id)" },
  { version: "20260623000000", predicateId: "m05_key_02", slot: "constraint_definition", normalizer: "pg_get_constraintdef", rendering: "FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE" },
  { version: "20260623000000", predicateId: "m05_constraint_01", slot: "constraint_definition", normalizer: "pg_get_constraintdef", rendering: "CHECK ((length(TRIM(BOTH FROM session_reference_id)) > 0))" },
  { version: "20260623000000", predicateId: "m05_constraint_02", slot: "constraint_definition", normalizer: "pg_get_constraintdef", rendering: "CHECK ((display_row_count >= 0))" },
  { version: "20260623000000", predicateId: "m05_constraint_03", slot: "constraint_definition", normalizer: "pg_get_constraintdef", rendering: "CHECK (((feed_snapshot ->> 'source'::text) = 'server-owned-live-session-state'::text))" },
  { version: "20260623000000", predicateId: "m05_constraint_04", slot: "constraint_definition", normalizer: "pg_get_constraintdef", rendering: "CHECK ((((feed_snapshot ->> 'rawProviderPayload'::text) = 'not-returned-by-design'::text) AND ((feed_snapshot ->> 'rawComments'::text) = 'not-returned-by-design'::text) AND ((feed_snapshot ->> 'providerTargetMetadata'::text) = 'forbidden'::text) AND ((feed_snapshot ->> 'serverOnlyCursor'::text) = 'not-returned-by-design'::text) AND ((feed_snapshot ->> 'browserStorage'::text) = 'unchanged'::text) AND ((feed_snapshot ->> 'handoffPayload'::text) = 'unchanged'::text)))" },
  { version: "20260624000000", predicateId: "m06_constraint_01", slot: "constraint_definition", normalizer: "pg_get_constraintdef", rendering: "CHECK (((time_zone IS NULL) OR (time_zone = 'UTC'::text) OR (time_zone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+.-]+)+$'::text)))" },
  { version: "20260705000000", predicateId: "m07_key_01", slot: "constraint_definition", normalizer: "pg_get_constraintdef", rendering: "PRIMARY KEY (id)" },
  { version: "20260705000000", predicateId: "m07_key_02", slot: "constraint_definition", normalizer: "pg_get_constraintdef", rendering: "FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE" },
  { version: "20260705000000", predicateId: "m07_constraint_01", slot: "constraint_definition", normalizer: "pg_get_constraintdef", rendering: "CHECK ((status = ANY (ARRAY['registered'::text, 'invited'::text, 'discount_eligible'::text, 'discount_used'::text, 'cancelled'::text])))" },
  { version: "20260705000000", predicateId: "m07_constraint_02", slot: "constraint_definition", normalizer: "pg_get_constraintdef", rendering: "CHECK ((length(TRIM(BOTH FROM campaign)) > 0))" },
  { version: "20260705000000", predicateId: "m07_constraint_03", slot: "constraint_definition", normalizer: "pg_get_constraintdef", rendering: "CHECK ((discount_intent = 'first_month_discount'::text))" },
  { version: "20260705000000", predicateId: "m07_constraint_04", slot: "constraint_definition", normalizer: "pg_get_constraintdef", rendering: "CHECK (((account_email IS NULL) OR (length(account_email) <= 320)))" },
  { version: "20260705000000", predicateId: "m07_constraint_05", slot: "constraint_definition", normalizer: "pg_get_constraintdef", rendering: "CHECK (((account_display_name IS NULL) OR (length(account_display_name) <= 160)))" },
  { version: "20260623000000", predicateId: "m05_policy_01", slot: "policy_using", normalizer: "pg_get_expr", rendering: "true" },
  { version: "20260623000000", predicateId: "m05_policy_01", slot: "policy_check", normalizer: "pg_get_expr", rendering: "true" },
  { version: "20260705000000", predicateId: "m07_policy_01", slot: "policy_using", normalizer: "pg_get_expr", rendering: "true" },
  { version: "20260705000000", predicateId: "m07_policy_01", slot: "policy_check", normalizer: "pg_get_expr", rendering: "true" },
  { version: "20260623000000", predicateId: "m05_index_01", slot: "index_definition", normalizer: "pg_get_indexdef", rendering: "CREATE UNIQUE INDEX comment_translator_real_comments_feed_snapshots_session_key ON public.comment_translator_real_comments_feed_snapshots USING btree (session_reference_id)" },
  { version: "20260623000000", predicateId: "m05_index_02", slot: "index_definition", normalizer: "pg_get_indexdef", rendering: "CREATE INDEX comment_translator_real_comments_feed_snapshots_owner_session_i ON public.comment_translator_real_comments_feed_snapshots USING btree (owner_user_id, session_reference_id)" },
  { version: "20260705000000", predicateId: "m07_index_01", slot: "index_definition", normalizer: "pg_get_indexdef", rendering: "CREATE UNIQUE INDEX comment_translator_creator_waitlist_owner_campaign_key ON public.comment_translator_creator_waitlist_registrations USING btree (owner_user_id, campaign)" },
  { version: "20260705000000", predicateId: "m07_index_02", slot: "index_definition", normalizer: "pg_get_indexdef", rendering: "CREATE INDEX comment_translator_creator_waitlist_campaign_registered_idx ON public.comment_translator_creator_waitlist_registrations USING btree (campaign, registered_at DESC)" }
];
