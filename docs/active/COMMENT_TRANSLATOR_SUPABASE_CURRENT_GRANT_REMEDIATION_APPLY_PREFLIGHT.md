# Comment Translator Supabase Current Grant Remediation Apply Preflight

Date: 2026-07-07

## Scope

This is the read-only apply-preflight evidence record for the Kuro Live Comment Translator free public beta integration line current-table grant drift. It follows the merged current grant remediation approval preflight packet and attempts only the safe read-only pre-apply check.

This slice does not apply migrations, execute remote SQL mutations, change remote grants, change policies, mutate rows, deploy, run live provider/OAuth/Stripe flows, or flip a public gate.

Sanitization boundary: this document records only pass/fail/status/count/table/role/privilege labels and unchecked scope. It does not include raw stdout/stderr, raw SQL output, raw response bodies, project identifiers, account identity values, tokens, secrets, credential values, connection strings, headers, browser storage, owner ids, internal user ids, provider private identifiers, raw comments, raw account metadata, or private owner role values.

## Base And Approval State

| Evidence | Status |
| --- | --- |
| `base_branch` | `codex/comment-translator-free-public-beta-integration` |
| `pr606_merge_status` | `merged` |
| `pr606_merge_commit_status` | `present` |
| `approval_packet_status` | `present` |
| `same_thread_exact_approval_status` | `absent` |
| `same_thread_risk_acceptance_status` | `absent` |
| `remote_current_grant_remediation_approval_status` | `absent` |

The exact approval text from `docs/active/COMMENT_TRANSLATOR_SUPABASE_CURRENT_GRANT_REMEDIATION_APPROVAL_PREFLIGHT.md` was not provided in this thread. Therefore this slice stops before remote mutation even though the read-only drift shape remains the expected one.

## Read-Only Preflight Evidence

The read-only preflight was executed through the sanitized current grant drift runner. The runner emits only labels/counts and does not print or persist raw CLI output.

| Evidence | Status |
| --- | --- |
| `remote_current_grant_drift_query_status` | `pass` |
| `remote_current_grant_drift_count` | `1` |
| `remote_current_grant_drift_breakdown_count` | `1` |
| `remote_usage_quotas_authenticated_write_drift_count` | `1` |
| `remote_anon_grant_drift_breakdown_count` | `0` |
| `remote_server_only_authenticated_grant_drift_breakdown_count` | `0` |
| `grant_drift_table_label` | `public.usage_quotas` |
| `grant_drift_role_label` | `authenticated` |
| `grant_drift_privilege_type_label` | `TRUNCATE` |
| `grant_drift_count` | `1` |
| `remote_current_grant_drift_status` | `fail` |
| `remote_current_grant_preapply_expected_drift_status` | `pass` |

Finding: the remote current-table grant drift is still the expected narrow drift, but apply approval is absent.

## Decision

| Decision | Status |
| --- | --- |
| `remote_current_grant_apply_preflight_status` | `blocked-approval-absent` |
| `remote_current_grant_remediation_status` | `not-run` |
| `remote_mutation_status` | `not-run` |
| `public_release_capable_status` | `no` |

The reviewed remediation SQL was not run:

```sql
revoke truncate on table public.usage_quotas from authenticated;
```

The next safe step is for the release owner to either paste the exact same-thread approval text from `docs/active/COMMENT_TRANSLATOR_SUPABASE_CURRENT_GRANT_REMEDIATION_APPROVAL_PREFLIGHT.md`, paste the exact risk-acceptance text from that document, or keep the gate blocked.

## Non-Actions

- Remote current grant remediation: not run.
- Remote default privileges remediation/apply: not run.
- Remote Supabase migration apply, `db push`, repair, or reset: not run.
- Remote Supabase row mutation or policy change: not run.
- Deploy/upload: not run.
- Public gate flip: not run.
- Live/provider execution, OAuth live flow, Google target lookup, Stripe/billing mutation, Product/Price creation, Checkout/Portal redirect, webhook registration: not run.

## Verification

Passed local checks in this branch:

- `node scripts/comment-translator-supabase-current-grant-remediation-apply-preflight-readonly.mjs`
- `node scripts/comment-translator-supabase-current-grant-remediation-apply-preflight-contract.mjs`
- `node scripts/comment-translator-supabase-current-grant-remediation-approval-preflight-contract.mjs`
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
