// allow: SIZE_OK — pure declarative fixed manifest and truth-table oracle data.
export const expectedApprovalId =
  "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-1";

export const manifests = [
  {
    version: "20260623000000",
    relationState: "canonical",
    length: 27,
    categories: [
      ["relation", 0, 1], ["columns", 1, 9], ["keys", 9, 11],
      ["constraints", 11, 15], ["rls", 15, 16], ["grants", 16, 19],
      ["policy", 19, 20], ["indexes", 20, 22], ["comments", 22, 27]
    ]
  },
  {
    version: "20260624000000",
    relationState: "canonical",
    length: 4,
    categories: [
      ["relation", 0, 1], ["columns", 1, 2],
      ["constraints", 2, 3], ["comments", 3, 4]
    ]
  },
  {
    version: "20260705000000",
    relationState: "canonical",
    length: 31,
    categories: [
      ["relation", 0, 1], ["columns", 1, 11], ["keys", 11, 13],
      ["constraints", 13, 18], ["rls", 18, 19], ["grants", 19, 22],
      ["policy", 22, 23], ["indexes", 23, 25], ["comments", 25, 31]
    ]
  },
  {
    version: "20260706073204",
    relationState: "not-applicable",
    length: 22,
    categories: [["canonical_default_privileges", 0, 22]]
  }
];

export const versions = manifests.map(({ version }) => version);
export const sqlKeys = [
  "strict_source_equivalence_matrix",
  "canonical_effect_equivalent_count",
  "absent_count",
  "partial_count",
  "conflicting_count",
  "unverifiable_count",
  "unknown_remote_migration_count"
];
export const classificationCountKeys = [
  "canonical_effect_equivalent_count",
  "absent_count",
  "partial_count",
  "conflicting_count",
  "unverifiable_count"
];
export const gateFields = [
  ["approval-gate", "approval_gate_status"],
  ["base-ref", "reviewed_base_status"],
  ["candidate-identity", "candidate_identity_status"],
  ["target-identity", "target_binding_status"],
  ["cli-version", "cli_version_status"],
  ["linked-metadata", "linked_metadata_status"],
  ["linked-target", "linked_target_status"],
  ["local-contract", "local_contract_status"]
];
export const gateAbortMappings = [
  ["approval-gate", "triggered-approval-gate"],
  ["base-ref", "triggered-base-ref-mismatch"],
  ["candidate-identity", "triggered-candidate-identity-mismatch"],
  ["target-identity", "triggered-target-identity-mismatch"],
  ["cli-version", "triggered-cli-version-mismatch"],
  ["linked-metadata", "triggered-linked-metadata-mismatch"],
  ["linked-target", "triggered-linked-target-mismatch"],
  ["local-contract", "triggered-local-contract-failed"]
];
export const completeResultKeys = [
  "approval_id",
  ...gateFields.map(([, field]) => field),
  "strict_source_equivalence_matrix",
  ...classificationCountKeys,
  "unknown_remote_migration_count",
  "default_privileges_security_goal_status",
  "remote_read_attempt_count",
  "remote_mutation_attempt_count",
  "migration_repair_attempt_count",
  "migration_apply_attempt_count",
  "execution_status",
  "sanitized_output_review_status",
  "abort_status",
  "unchecked_scope_status"
];
export const blockedResultKeys = completeResultKeys.filter(
  (key) =>
    key !== "strict_source_equivalence_matrix"
    && !classificationCountKeys.includes(key)
    && key !== "unknown_remote_migration_count"
);

export const rawSentinel = "private-raw-strict-source-equivalence-sentinel";
export const allPassTransientMatrix = [
  "20260623000000:canonical:clear:ppppppppppppppppppppppppppp",
  "20260624000000:canonical:clear:pppp",
  "20260705000000:canonical:clear:ppppppppppppppppppppppppppppppp",
  "20260706073204:not-applicable:clear:pppppppppppppppppppppp"
].join("|");
export const allPassParts = manifests.map((manifest) => ({
  version: manifest.version,
  relationState: manifest.relationState,
  conflictState: "clear",
  vector: "p".repeat(manifest.length)
}));
export const allPassStatuses = versions.map(
  () => "canonical-effect-equivalent"
);

const relationAllPassCategoryStatuses = [
  "pass", "pass", "pass", "pass", "pass", "pass", "pass", "pass", "pass"
];
const relationAllFailCategoryStatuses = [
  "fail", "fail", "fail", "fail", "fail", "fail", "fail", "fail", "fail"
];
const relationPassDependentFailCategoryStatuses = [
  "pass", "fail", "fail", "fail", "fail", "fail", "fail", "fail", "fail"
];
const defaultAclPassCategoryStatuses = ["pass"];
const defaultAclFailCategoryStatuses = ["fail"];
const fourPredicateNonUniformCategoryStatuses = [
  "pass", "fail", "pass", "fail"
];
const thirtyOnePredicateNonUniformCategoryStatuses = [
  "pass", "fail", "pass", "fail", "pass", "fail", "pass", "fail", "pass"
];
const thirtyOnePredicateNonUniformVector = [
  "p", "pppppppppf", "pp", "ppppf", "p", "ppf", "p", "pf", "pppppp"
].join("");

export const classificationFixtures = [
  {
    name: "canonical relation with all applicable predicates passing",
    version: versions[0],
    relationState: "canonical",
    conflictState: "clear",
    vector: "p".repeat(27),
    expectedStatus: "canonical-effect-equivalent",
    expectedCategoryStatuses: relationAllPassCategoryStatuses
  },
  {
    name: "absent relation with all dependent predicates failing",
    version: versions[0],
    relationState: "absent",
    conflictState: "clear",
    vector: "f".repeat(27),
    expectedStatus: "absent",
    expectedCategoryStatuses: relationAllFailCategoryStatuses
  },
  {
    name: "absent relation with a dependent predicate passing",
    version: versions[0],
    relationState: "absent",
    conflictState: "clear",
    vector: `fp${"f".repeat(25)}`,
    expectedStatus: "conflicting",
    expectedCategoryStatuses: relationAllFailCategoryStatuses
  },
  {
    name: "incompatible relation",
    version: versions[0],
    relationState: "incompatible",
    conflictState: "clear",
    vector: "p".repeat(27),
    expectedStatus: "conflicting",
    expectedCategoryStatuses: relationAllPassCategoryStatuses
  },
  {
    name: "closed conflict detector",
    version: versions[0],
    relationState: "canonical",
    conflictState: "conflict",
    vector: "p".repeat(27),
    expectedStatus: "conflicting",
    expectedCategoryStatuses: relationAllPassCategoryStatuses
  },
  {
    name: "predicate vector containing unverifiable",
    version: versions[0],
    relationState: "canonical",
    conflictState: "clear",
    vector: `pu${"p".repeat(25)}`,
    expectedStatus: "unverifiable"
  },
  {
    name: "unverifiable relation state",
    version: versions[0],
    relationState: "unverifiable",
    conflictState: "clear",
    vector: "p".repeat(27),
    expectedStatus: "unverifiable"
  },
  {
    name: "unverifiable conflict detector",
    version: versions[0],
    relationState: "canonical",
    conflictState: "unverifiable",
    vector: "p".repeat(27),
    expectedStatus: "unverifiable"
  },
  {
    name: "canonical relation with a passing and failing predicate mixture",
    version: versions[0],
    relationState: "canonical",
    conflictState: "clear",
    vector: `pp${"f".repeat(25)}`,
    expectedStatus: "partial",
    expectedCategoryStatuses: relationPassDependentFailCategoryStatuses
  },
  {
    name: "canonical relation with every dependent predicate failing",
    version: versions[0],
    relationState: "canonical",
    conflictState: "clear",
    vector: `p${"f".repeat(26)}`,
    expectedStatus: "partial",
    expectedCategoryStatuses: relationPassDependentFailCategoryStatuses
  },
  {
    name: "four-predicate migration with alternating category slices",
    version: versions[1],
    relationState: "canonical",
    conflictState: "clear",
    vector: "pfpf",
    expectedStatus: "partial",
    expectedCategoryStatuses: fourPredicateNonUniformCategoryStatuses
  },
  {
    name: "thirty-one-predicate migration with non-uniform category slices",
    version: versions[2],
    relationState: "canonical",
    conflictState: "clear",
    vector: thirtyOnePredicateNonUniformVector,
    expectedStatus: "partial",
    expectedCategoryStatuses: thirtyOnePredicateNonUniformCategoryStatuses
  },
  {
    name: "default ACL with all predicates failing",
    version: versions[3],
    relationState: "not-applicable",
    conflictState: "clear",
    vector: "f".repeat(22),
    expectedStatus: "absent",
    expectedCategoryStatuses: defaultAclFailCategoryStatuses
  },
  {
    name: "default ACL with passing and failing predicates",
    version: versions[3],
    relationState: "not-applicable",
    conflictState: "clear",
    vector: `p${"f".repeat(21)}`,
    expectedStatus: "partial",
    expectedCategoryStatuses: defaultAclFailCategoryStatuses
  },
  {
    name: "default ACL with all predicates passing",
    version: versions[3],
    relationState: "not-applicable",
    conflictState: "clear",
    vector: "p".repeat(22),
    expectedStatus: "canonical-effect-equivalent",
    expectedCategoryStatuses: defaultAclPassCategoryStatuses
  },
  {
    name: "unverifiable outranks conflicting and partial",
    version: versions[0],
    relationState: "canonical",
    conflictState: "conflict",
    vector: `pu${"f".repeat(25)}`,
    expectedStatus: "unverifiable"
  },
  {
    name: "conflicting outranks partial",
    version: versions[0],
    relationState: "canonical",
    conflictState: "conflict",
    vector: `pp${"f".repeat(25)}`,
    expectedStatus: "conflicting",
    expectedCategoryStatuses: relationPassDependentFailCategoryStatuses
  }
];

export const strictSourceEquivalenceSqlPath =
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof.sql";

export const knownMigrationVersions = [
  "20260527000000",
  "20260601000000",
  "20260615000000",
  "20260615001000",
  "20260623000000",
  "20260624000000",
  "20260705000000",
  "20260706073204",
  "20260722000000",
  "20260722001000",
  "20260722002000",
  "20260722003000",
  "20260723000000",
  "20260723001000",
  "20260723002000",
  "20260723003000",
  "20260730000000"
];

const numberedPredicateIds = (prefix, count) =>
  Array.from(
    { length: count },
    (_, index) => `${prefix}_${String(index + 1).padStart(2, "0")}`
  );

export const sqlPredicateIdsByVersion = [
  {
    version: versions[0],
    ids: [
      "m05_relation_01",
      ...numberedPredicateIds("m05_column", 8),
      ...numberedPredicateIds("m05_key", 2),
      ...numberedPredicateIds("m05_constraint", 4),
      "m05_rls_01",
      ...numberedPredicateIds("m05_grant", 3),
      "m05_policy_01",
      ...numberedPredicateIds("m05_index", 2),
      ...numberedPredicateIds("m05_comment", 5)
    ]
  },
  {
    version: versions[1],
    ids: [
      "m06_relation_01",
      "m06_column_01",
      "m06_constraint_01",
      "m06_comment_01"
    ]
  },
  {
    version: versions[2],
    ids: [
      "m07_relation_01",
      ...numberedPredicateIds("m07_column", 10),
      ...numberedPredicateIds("m07_key", 2),
      ...numberedPredicateIds("m07_constraint", 5),
      "m07_rls_01",
      ...numberedPredicateIds("m07_grant", 3),
      "m07_policy_01",
      ...numberedPredicateIds("m07_index", 2),
      ...numberedPredicateIds("m07_comment", 6)
    ]
  },
  {
    version: versions[3],
    ids: [
      ...numberedPredicateIds("m08_table_acl", 12),
      ...numberedPredicateIds("m08_sequence_acl", 6),
      ...numberedPredicateIds("m08_function_acl", 4)
    ]
  }
];

export const sqlAllowedCatalogSources = [
  "pg_namespace",
  "pg_class",
  "pg_attribute",
  "pg_attrdef",
  "pg_constraint",
  "pg_policy",
  "pg_index",
  "pg_description",
  "pg_roles",
  "pg_default_acl",
  "supabase_migrations.schema_migrations"
];

export const sqlMutationVerbs = [
  "insert",
  "update",
  "delete",
  "merge",
  "alter",
  "create",
  "drop",
  "grant",
  "revoke",
  "truncate",
  "call",
  "do"
];

export const sqlCanonicalTruncatedIdentifiers = [
  "comment_translator_real_comments_feed_snapsh_owner_user_id_fkey",
  "comment_translator_creator_waitlist_registra_owner_user_id_fkey",
  "comment_translator_real_comments_feed_snapshots_service_role_al",
  "comment_translator_real_comments_feed_snapshots_owner_session_i"
];

export const sqlForbiddenOverlengthIdentifiers = [
  "comment_translator_real_comments_feed_snapshots_owner_user_id_fkey",
  "comment_translator_creator_waitlist_registrations_owner_user_id_fkey",
  "comment_translator_real_comments_feed_snapshots_service_role_all",
  "comment_translator_real_comments_feed_snapshots_owner_session_idx"
];

export const sqlFixedCatalogRenderings = [
  "gen_random_uuid()",
  "0",
  "now()",
  "'creator_closed_beta_2026'::text",
  "'registered'::text",
  "'first_month_discount'::text",
  "PRIMARY KEY (id)",
  "FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE",
  "CHECK ((length(TRIM(BOTH FROM session_reference_id)) > 0))",
  "CHECK ((display_row_count >= 0))",
  "CHECK (((feed_snapshot ->> 'source'::text) = 'server-owned-live-session-state'::text))",
  "CHECK ((((feed_snapshot ->> 'rawProviderPayload'::text) = 'not-returned-by-design'::text) AND ((feed_snapshot ->> 'rawComments'::text) = 'not-returned-by-design'::text) AND ((feed_snapshot ->> 'providerTargetMetadata'::text) = 'forbidden'::text) AND ((feed_snapshot ->> 'serverOnlyCursor'::text) = 'not-returned-by-design'::text) AND ((feed_snapshot ->> 'browserStorage'::text) = 'unchanged'::text) AND ((feed_snapshot ->> 'handoffPayload'::text) = 'unchanged'::text)))",
  "CHECK (((time_zone IS NULL) OR (time_zone = 'UTC'::text) OR (time_zone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+.-]+)+$'::text)))",
  "CHECK ((status = ANY (ARRAY['registered'::text, 'invited'::text, 'discount_eligible'::text, 'discount_used'::text, 'cancelled'::text])))",
  "CHECK ((length(TRIM(BOTH FROM campaign)) > 0))",
  "CHECK ((discount_intent = 'first_month_discount'::text))",
  "CHECK (((account_email IS NULL) OR (length(account_email) <= 320)))",
  "CHECK (((account_display_name IS NULL) OR (length(account_display_name) <= 160)))",
  "CREATE UNIQUE INDEX comment_translator_real_comments_feed_snapshots_session_key ON public.comment_translator_real_comments_feed_snapshots USING btree (session_reference_id)",
  "CREATE INDEX comment_translator_real_comments_feed_snapshots_owner_session_i ON public.comment_translator_real_comments_feed_snapshots USING btree (owner_user_id, session_reference_id)",
  "CREATE UNIQUE INDEX comment_translator_creator_waitlist_owner_campaign_key ON public.comment_translator_creator_waitlist_registrations USING btree (owner_user_id, campaign)",
  "CREATE INDEX comment_translator_creator_waitlist_campaign_registered_idx ON public.comment_translator_creator_waitlist_registrations USING btree (campaign, registered_at DESC)",
  "true"
];
