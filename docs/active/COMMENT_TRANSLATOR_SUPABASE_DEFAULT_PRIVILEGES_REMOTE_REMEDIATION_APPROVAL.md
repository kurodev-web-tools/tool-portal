# Comment Translator Supabase Default Privileges Remote Remediation Approval

Date: 2026-07-07

## Scope

This is an approval packet for the Kuro Live Comment Translator free public beta integration line. It converts the remote read-only default-privileges failure into an exact, approval-gated remediation plan.

This slice does not apply migrations, execute remote SQL mutations, change grants or policies, mutate rows, deploy, run live provider/OAuth/Stripe flows, or flip a public gate.

Sanitization boundary: this document records only pass/fail/status/count/table labels, role labels that are already part of the public Supabase/Postgres posture model, and unchecked scope. It does not include raw stdout/stderr, raw response bodies, project identifiers, account identity values, tokens, secrets, credential values, connection strings, headers, browser storage, owner ids, internal user ids, provider private identifiers, raw comments, or raw account metadata.

## Current Remote Evidence

Source evidence remains the merged remote read-only posture check:

- `remote_catalog_query_status`: `pass`
- `remote_table_count`: `9`
- `remote_expected_missing_count`: `0`
- `remote_rls_status`: `pass`
- `remote_grant_status`: `pass`
- `remote_default_privileges_status`: `fail`
- `remote_unexpected_default_grant_count`: `48`
- `remote_advisor_status`: `pass`
- `remote_advisor_issue_count`: `3`
- `remote_advisor_warn_count`: `3`
- `remote_advisor_error_count`: `0`

Additional sanitized owner-count preflight for `public` default ACL entries:

| Evidence | Status |
| --- | --- |
| `remote_owner_count_query_status` | `pass` |
| `remote_default_acl_entry_count` | `6` |
| `remote_default_acl_postgres_owner_entry_count` | `3` |
| `remote_default_acl_other_owner_entry_count` | `3` |
| `remote_default_acl_owner_status` | `mixed-or-non-postgres` |

Owner role names beyond the documented `postgres` role were not printed or persisted. This means the existing local `postgres` default-privileges guard is necessary but not enough to approve a remote remediation blindly. The approved remediation must either confirm that the non-`postgres` entries are irrelevant, or include an equivalent owner-specific default-privileges block reviewed without recording private owner identity values in public evidence.

## Remediation Decision

| Decision | Status |
| --- | --- |
| `remote_remediation_required_status` | `yes` |
| `remote_remediation_apply_status` | `not-run` |
| `remote_mutation_status` | `not-run` |
| `owner_specific_block_required_status` | `yes` |
| `risk_acceptance_status` | `not-recorded` |
| `public_release_capable_status` | `no` |

The local guard migration remains:

- `supabase/migrations/20260706073204_supabase_default_privileges_guard.sql`

It revokes future `public` table, sequence, and function default privileges for `anon`, `authenticated`, and `service_role` from objects created by `postgres`, and revokes future function execute defaults from `PUBLIC`. Existing public tables keep their explicit grants and RLS posture.

## Approval-Gated Remediation Plan

Before any remote mutation, the operator must record same-thread explicit approval for this exact scope:

- target: linked Supabase project only, without printing project identifiers;
- action: default-privileges remediation for future `public` objects only;
- allowed SQL shape: the existing local guard migration plus an equivalent approved owner-specific `ALTER DEFAULT PRIVILEGES FOR ROLE <approved-owner-role> IN SCHEMA public` block if the sanitized owner preflight remains `mixed-or-non-postgres`;
- forbidden actions: `db push`, repair, reset, deploy, row mutation, current-table grant/policy rewrite, public gate flip, live/provider execution, OAuth live flow, Google target lookup, Stripe/billing mutation, Product/Price creation, Checkout/Portal redirect, webhook registration, raw response capture, browser storage capture, credential exposure.

The apply step must not run from this PR. If approved later, execute only the reviewed default-privileges SQL and then immediately run a read-only verification that records sanitized labels/counts only.

## Required Post-Apply Verification

After an approved remote remediation, the follow-up evidence must include:

- `remote_catalog_query_status=pass`
- `remote_table_count=9`
- `remote_expected_missing_count=0`
- `remote_rls_status=pass`
- `remote_grant_status=pass`
- `remote_default_privileges_status=pass`
- `remote_unexpected_default_grant_count=0`
- `remote_public_default_grant_count=0`
- `remote_mutation_scope_status=default-privileges-only`

It must also record that current expected tables, RLS, and explicit grants remain unchanged, or stop as a blocker if any current-table drift appears.

## References

- Supabase securing API guidance: https://supabase.com/docs/guides/api/securing-your-api
- Supabase RLS guidance: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase default Data API exposure changelog: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
