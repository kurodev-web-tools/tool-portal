# Comment Translator Supabase Default Privileges Owner-Specific Remediation Preflight

Date: 2026-07-07

## Scope

This is the owner-specific remediation preflight for the Kuro Live Comment Translator free public beta integration line after the current-table grant drift remediation was applied and rechecked.

This slice runs only sanitized read-only catalog/default-privileges checks against the currently linked Supabase project. It does not apply migrations, run default-privileges remediation, change current grants or policies, mutate rows, deploy, run live provider/OAuth/Stripe flows, or flip a public gate.

Sanitization boundary: this document records only pass/fail/status/count/table labels and public posture role labels. It does not include raw stdout/stderr, raw SQL output, raw response bodies, project identifiers, account identity values, tokens, secrets, credential values, connection strings, headers, browser storage, owner ids, internal user ids, provider private identifiers, raw comments, raw account metadata, or private owner role values.

## Same-Process Read-Only Evidence

The owner-specific preflight wrapper ran the existing read-only default privileges apply preflight and recorded only sanitized labels/counts:

| Evidence | Status |
| --- | --- |
| `cli_status` | `local-cli-present` |
| `cli_version_status` | `present` |
| `link_status` | `supabase-link-metadata-present` |
| `mcp_status` | `not-used` |
| `remote_catalog_query_status` | `pass` |
| `remote_table_count` | `9` |
| `remote_expected_table_count` | `9` |
| `remote_expected_missing_count` | `0` |
| `remote_rls_disabled_count` | `0` |
| `remote_rls_status` | `pass` |
| `remote_anon_grant_count` | `0` |
| `remote_server_only_authenticated_grant_count` | `0` |
| `remote_readonly_authenticated_write_grant_count` | `0` |
| `remote_browser_owned_expected_grant_count` | `9` |
| `remote_browser_readonly_expected_grant_count` | `1` |
| `remote_grant_status` | `pass` |
| `remote_default_acl_query_status` | `pass` |
| `remote_default_acl_entry_count` | `6` |
| `remote_default_acl_postgres_owner_entry_count` | `3` |
| `remote_default_acl_other_owner_entry_count` | `3` |
| `remote_default_acl_owner_status` | `mixed-or-non-postgres` |
| `remote_browser_or_service_default_grant_count` | `48` |
| `remote_public_default_grant_count` | `0` |
| `remote_unexpected_default_grant_count` | `48` |
| `remote_default_privileges_status` | `fail` |
| `owner_specific_block_required_status` | `yes` |
| `owner_specific_private_value_exposure_status` | `not-exposed` |
| `owner_specific_block_review_status` | `blocked-private-owner-value-not-reviewed` |
| `owner_specific_block_apply_status` | `not-run` |
| `same_thread_exact_approval_status` | `absent` |
| `same_thread_risk_acceptance_status` | `absent` |
| `remote_apply_preflight_status` | `blocked-owner-specific-review-required` |
| `remote_default_privileges_owner_specific_preflight_status` | `blocked-private-owner-value-not-reviewed` |
| `remote_apply_approval_status` | `absent` |
| `remote_remediation_apply_status` | `not-run` |
| `remote_mutation_status` | `not-run` |
| `public_release_capable_status` | `no` |

Finding: the expected remote table set, RLS posture, and current grant posture remain intact. Remote future default privileges still fail, and owner status remains `mixed-or-non-postgres`. No owner role names beyond the documented `postgres` role were printed or persisted.

## Decision

The owner-specific block cannot be reviewed in this PR without handling private owner role values. Because the exact default-privileges apply approval text from `docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMOTE_REMEDIATION_EXECUTION_PREFLIGHT.md` is absent in this thread, and no explicit risk acceptance was recorded, the only safe outcome is to keep remediation blocked:

- `remote_default_privileges_owner_specific_preflight_status=blocked-private-owner-value-not-reviewed`
- `remote_apply_approval_status=absent`
- `remote_remediation_apply_status=not-run`
- `remote_mutation_status=not-run`
- `public_release_capable_status=no`

## Non-Actions

- Remote default privileges remediation/apply: not run.
- Owner-specific default-privileges block: not run.
- Remote Supabase migration apply, `db push`, repair, or reset: not run.
- Remote Supabase row mutation, current grant change, or policy change: not run.
- Deploy/upload: not run.
- Public gate flip: not run.
- Live/provider execution, OAuth live flow, Google target lookup, Stripe/billing mutation, Product/Price creation, Checkout/Portal redirect, webhook registration: not run.
- Supabase default privileges guard migration or contract behavior: unchanged.

## Verification

Required local checks for this slice:

- `node scripts/comment-translator-supabase-default-privileges-owner-specific-preflight-readonly.mjs`
- `node scripts/comment-translator-supabase-default-privileges-owner-specific-remediation-preflight-contract.mjs`
- Existing Supabase posture/default-privileges/current-grant contracts.
- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `git diff --check`
- changed-files high-confidence secret scan with pass/fail/count only.

`npm run build` is only required if runtime TS/TSX changes. UI/browser width QA is not required unless rendered UI changes.
