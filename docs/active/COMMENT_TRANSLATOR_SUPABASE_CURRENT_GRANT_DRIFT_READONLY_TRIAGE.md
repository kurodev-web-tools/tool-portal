# Comment Translator Supabase Current Grant Drift Read-Only Triage

Date: 2026-07-07

## Scope

This is the read-only current-grant drift triage record for the Kuro Live Comment Translator free public beta integration line. It now reflects the post-remediation current grant posture after the approved current-grant-only apply.

This slice does not apply migrations, execute remote SQL mutations, change current-table grants or policies, mutate rows, deploy, run live provider/OAuth/Stripe flows, or flip a public gate.

Sanitization boundary: this document records only pass/fail/status/count/table/role/privilege labels and unchecked scope. It does not include raw stdout/stderr, raw SQL output, raw response bodies, project identifiers, account identity values, tokens, secrets, credential values, connection strings, headers, browser storage, owner ids, internal user ids, provider private identifiers, raw comments, raw account metadata, or private owner role values.

## Base And Method

| Evidence | Status |
| --- | --- |
| `base_branch` | `codex/comment-translator-free-public-beta-integration` |
| `pr607_merge_status` | `merged` |
| `pr607_merge_commit_status` | `present` |
| `cli_status` | `local-cli-present` |
| `link_status` | `supabase-link-metadata-present` |
| `remote_query_method` | `linked-db-query-argument` |
| `remote_query_mode` | `read-only` |

The linked query was executed through the pinned Supabase CLI entrypoint. The runner emits only sanitized labels/counts and does not print or persist raw CLI output.

## Sanitized Drift Evidence

| Evidence | Status |
| --- | --- |
| `remote_current_grant_drift_query_status` | `pass` |
| `remote_current_grant_drift_count` | `0` |
| `remote_current_grant_drift_breakdown_count` | `0` |
| `remote_usage_quotas_authenticated_write_drift_count` | `0` |
| `remote_anon_grant_drift_breakdown_count` | `0` |
| `remote_server_only_authenticated_grant_drift_breakdown_count` | `0` |
| `grant_drift_table_label` | `none` |
| `grant_drift_role_label` | `none` |
| `grant_drift_privilege_type_label` | `none` |
| `grant_drift_count` | `0` |
| `remote_current_grant_drift_status` | `pass` |
| `remote_grant_remediation_status` | `not-run` |
| `remote_mutation_status` | `not-run` |

Finding: the prior current-table privilege drift is no longer present. `anon`, server-only authenticated, and `usage_quotas` authenticated write/truncate drift counts are all `0`.

## Decision

The current grant drift is remediated. The default-privileges remediation/apply remains a separate approval-gated blocker; this triage does not approve or run that path.

## Non-Actions

- Remote current grant remediation in this read-only triage command: not run.
- Remote default privileges remediation/apply: not run.
- Remote Supabase migration apply, `db push`, repair, or reset: not run.
- Remote Supabase row mutation, policy change, or default-privileges grant change: not run.
- Deploy/upload: not run.
- Public gate flip: not run.
- Live/provider execution, OAuth live flow, Google target lookup, Stripe/billing mutation, Product/Price creation, Checkout/Portal redirect, webhook registration: not run.

## Verification

Passed local checks in this branch:

- `node scripts/comment-translator-supabase-current-grant-drift-readonly-triage.mjs`
- `node scripts/comment-translator-supabase-current-grant-drift-readonly-triage-contract.mjs`
- `node scripts/comment-translator-supabase-default-privileges-remediation-execution-preflight-contract.mjs`
- `node scripts/comment-translator-supabase-default-privileges-remote-remediation-approval-contract.mjs`
- `node scripts/comment-translator-supabase-default-privileges-guard-contract.mjs`
- `node scripts/comment-translator-supabase-remote-readonly-posture-check-contract.mjs`
- `node scripts/comment-translator-supabase-db-auth-rls-security-audit-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `git diff --check`
- changed-files high-confidence secret scan (`changed_files=4`, `secret_scan_matches=0`)

`npm run build` was skipped because no runtime TS/TSX changed; this slice changes docs, deterministic scripts, and `task.md` only. UI/browser width QA was skipped because no rendered UI, CSS, route, layout, copy, or client behavior changed.
