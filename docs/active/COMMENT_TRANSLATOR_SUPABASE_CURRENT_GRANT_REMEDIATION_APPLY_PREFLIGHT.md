# Comment Translator Supabase Current Grant Remediation Apply Preflight

Date: 2026-07-07

## Scope

This is the approved apply evidence record for the Kuro Live Comment Translator free public beta integration line current-table grant drift. It follows the merged current grant remediation approval preflight packet, the later same-thread exact approval, and the same-process preflight/apply/post-check execution.

This slice applies only the reviewed current-table grant remediation. It does not apply migrations, change default privileges, change policies, mutate rows, deploy, run live provider/OAuth/Stripe flows, or flip a public gate.

Sanitization boundary: this document records only pass/fail/status/count/table/role/privilege labels and unchecked scope. It does not include raw stdout/stderr, raw SQL output, raw response bodies, project identifiers, account identity values, tokens, secrets, credential values, connection strings, headers, browser storage, owner ids, internal user ids, provider private identifiers, raw comments, raw account metadata, or private owner role values.

## Base And Approval State

| Evidence | Status |
| --- | --- |
| `base_branch` | `codex/comment-translator-free-public-beta-integration` |
| `pr607_merge_status` | `merged` |
| `pr607_merge_commit_status` | `present` |
| `approval_packet_status` | `present` |
| `same_thread_exact_approval_status` | `present` |
| `same_thread_risk_acceptance_status` | `absent` |
| `remote_current_grant_remediation_approval_status` | `present` |

The exact approval text from `docs/active/COMMENT_TRANSLATOR_SUPABASE_CURRENT_GRANT_REMEDIATION_APPROVAL_PREFLIGHT.md` was provided in this thread before the remote mutation. The execution stayed inside the approved current-grant-only scope.

## Same-Process Pre-Apply Evidence

The approved apply orchestrator first executed sanitized read-only checks. The runner emits only labels/counts and does not print or persist raw CLI output.

| Evidence | Status |
| --- | --- |
| `cli_status` | `local-cli-present` |
| `link_status` | `supabase-link-metadata-present` |
| `pre_remote_current_grant_drift_query_status` | `pass` |
| `pre_remote_current_grant_drift_count` | `1` |
| `pre_remote_current_grant_drift_breakdown_count` | `1` |
| `pre_remote_usage_quotas_authenticated_write_drift_count` | `1` |
| `pre_remote_anon_grant_drift_breakdown_count` | `0` |
| `pre_remote_server_only_authenticated_grant_drift_breakdown_count` | `0` |
| `pre_grant_drift_table_label` | `public.usage_quotas` |
| `pre_grant_drift_role_label` | `authenticated` |
| `pre_grant_drift_privilege_type_label` | `TRUNCATE` |
| `pre_grant_drift_count` | `1` |
| `pre_remote_current_grant_drift_status` | `fail` |
| `pre_remote_catalog_query_status` | `pass` |
| `pre_remote_grant_status` | `fail` |
| `pre_remote_default_acl_owner_status` | `mixed-or-non-postgres` |
| `pre_remote_unexpected_default_grant_count` | `48` |
| `pre_remote_default_privileges_status` | `fail` |
| `pre_owner_specific_block_required_status` | `yes` |
| `remote_current_grant_preapply_expected_drift_status` | `pass` |
| `remote_current_grant_apply_preflight_status` | `pass` |

Finding: the remote current-table grant drift was still the expected narrow drift before apply. The default-privileges blocker also remained unchanged and separate.

## Apply Scope

The only remote mutation executed was the reviewed current grant remediation:

```sql
revoke truncate on table public.usage_quotas from authenticated;
```

No other grant, default privilege, policy, row, migration, deployment, live/provider, OAuth, Stripe, or public gate action was run.

## Post-Apply Read-Only Verification

| Decision | Status |
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
| `remote_catalog_query_status` | `pass` |
| `remote_grant_status` | `pass` |
| `remote_default_acl_owner_status` | `mixed-or-non-postgres` |
| `remote_unexpected_default_grant_count` | `48` |
| `remote_default_privileges_status` | `fail` |
| `owner_specific_block_required_status` | `yes` |
| `remote_current_grant_postapply_verification_status` | `pass` |
| `remote_current_grant_remediation_status` | `pass` |
| `remote_mutation_scope_status` | `current-grant-truncate-only` |
| `remote_mutation_status` | `applied` |
| `public_release_capable_status` | `no` |

Finding: the current grant drift is remediated. Public release remains blocked because remote default privileges still fail with owner-specific private role handling unresolved.

## Non-Actions

- Remote current grant remediation: applied only for current `authenticated` `TRUNCATE` on `public.usage_quotas`.
- Remote default privileges remediation/apply: not run.
- Remote Supabase migration apply, `db push`, repair, or reset: not run.
- Remote Supabase row mutation or policy change: not run.
- Deploy/upload: not run.
- Public gate flip: not run.
- Live/provider execution, OAuth live flow, Google target lookup, Stripe/billing mutation, Product/Price creation, Checkout/Portal redirect, webhook registration: not run.

## Verification

Passed local checks in this branch:

- `COMMENT_TRANSLATOR_SUPABASE_CURRENT_GRANT_REMEDIATION_APPROVAL=<exact approval text from approval doc> node scripts/comment-translator-supabase-current-grant-remediation-apply-approved.mjs`
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
