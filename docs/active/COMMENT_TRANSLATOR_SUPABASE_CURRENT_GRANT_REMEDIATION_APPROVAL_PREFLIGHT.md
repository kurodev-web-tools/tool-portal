# Comment Translator Supabase Current Grant Remediation Approval Preflight

Date: 2026-07-07

## Scope

This is the approval and execution-preflight packet for the Kuro Live Comment Translator free public beta integration line current-table grant drift. It follows the merged read-only triage that narrowed `remote_readonly_authenticated_write_grant_count=1` to a single sanitized drift label set.

This slice does not apply migrations, execute remote SQL mutations, change remote grants, change policies, mutate rows, deploy, run live provider/OAuth/Stripe flows, or flip a public gate.

Sanitization boundary: this document records only pass/fail/status/count/table/role/privilege labels, exact approval labels, and unchecked scope. It does not include raw stdout/stderr, raw SQL output, raw response bodies, project identifiers, account identity values, tokens, secrets, credential values, connection strings, headers, browser storage, owner ids, internal user ids, provider private identifiers, raw comments, raw account metadata, or private owner role values.

## Source Evidence

The latest merged read-only current-grant drift triage remains the authority for this preflight:

| Evidence | Status |
| --- | --- |
| `base_branch` | `codex/comment-translator-free-public-beta-integration` |
| `pr605_merge_status` | `merged` |
| `pr605_merge_commit_status` | `present` |
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
| `remote_grant_remediation_status` | `not-run` |
| `remote_mutation_status` | `not-run` |

Finding: the current-table drift is narrow. The only recorded current grant drift is `authenticated` having `TRUNCATE` on `public.usage_quotas`. No `anon` drift or server-only authenticated table drift was recorded.

## Decision Gate

| Decision | Status |
| --- | --- |
| `current_grant_remediation_decision_status` | `pending` |
| `current_grant_risk_acceptance_status` | `not-recorded` |
| `remote_current_grant_remediation_approval_status` | `absent` |
| `remote_current_grant_apply_preflight_status` | `not-run` |
| `remote_current_grant_remediation_status` | `not-run` |
| `remote_mutation_status` | `not-run` |
| `public_release_capable_status` | `no` |

There are only three acceptable next outcomes:

- current grant remediation is explicitly approved after same-process read-only preflight;
- the current grant risk is explicitly accepted by the release owner without remediation;
- the gate stays blocked.

## Reviewed Remediation Shape

The reviewed SQL shape for the current-grant remediation is limited to this current-table grant:

```sql
revoke truncate on table public.usage_quotas from authenticated;
```

This statement is not run in this PR. It must not be expanded into broad table grants, policy rewrites, row mutation, default-privileges remediation, owner-specific default-privileges blocks, migration apply, `db push`, repair, reset, deploy, public gate flip, live/provider execution, OAuth live flow, Google target lookup, Stripe/billing mutation, Product/Price creation, Checkout/Portal redirect, or webhook registration.

## Required Same-Process Pre-Apply Checks

Before any remote current grant mutation, the operator must run a read-only preflight in the same command process that will apply the reviewed SQL and record only sanitized labels/counts:

- `cli_status=local-cli-present`
- `link_status=supabase-link-metadata-present`
- `remote_current_grant_drift_query_status=pass`
- `remote_current_grant_drift_count=1`
- `remote_current_grant_drift_breakdown_count=1`
- `remote_usage_quotas_authenticated_write_drift_count=1`
- `remote_anon_grant_drift_breakdown_count=0`
- `remote_server_only_authenticated_grant_drift_breakdown_count=0`
- `grant_drift_table_label=public.usage_quotas`
- `grant_drift_role_label=authenticated`
- `grant_drift_privilege_type_label=TRUNCATE`
- `grant_drift_count=1`
- `remote_current_grant_drift_status=fail`
- `remote_default_privileges_status=fail`
- `remote_unexpected_default_grant_count=48`

If any check cannot run safely, emits raw output, requires printing credentials or project identity, finds additional current-table drift, or cannot keep evidence sanitized, do not apply. Record `remote_current_grant_apply_preflight_status=blocked` and keep `remote_current_grant_remediation_status=not-run`.

## Exact Approval Labels

The remote current grant remediation can run only after this exact same-thread approval is recorded:

`I approve remote Supabase current-grant remediation against the currently linked project only. Scope is revoking TRUNCATE on public.usage_quotas from authenticated only, using the reviewed SQL in docs/active/COMMENT_TRANSLATOR_SUPABASE_CURRENT_GRANT_REMEDIATION_APPROVAL_PREFLIGHT.md. Keep evidence sanitized to pass/fail/count/status/table/role/privilege labels only. Do not run db push, repair, reset, deploy/upload, public gate flip, live/provider/OAuth/Stripe actions, row mutation, policy rewrite, default-privileges remediation/apply, owner-specific default-privileges block, raw response capture, browser storage capture, credential exposure, or public access change.`

The current grant risk can be accepted without remediation only after this exact same-thread release-owner decision is recorded:

`I explicitly accept the remote Supabase current-grant drift for the currently linked project. Do not run current grant remediation. Keep remote_current_grant_drift_status=fail, record current_grant_risk_acceptance_status=accepted, and continue PL-G5 only under this accepted risk label with sanitized evidence only.`

Any shorter approval, ambiguous "go ahead", or approval that omits the linked-project/current-grant-only/sanitized-output/no-forbidden-actions boundaries is not enough for remote mutation.

## Required Post-Apply Verification

After an approved remote current grant remediation apply, immediately run read-only verification and record only sanitized labels/counts:

- `remote_current_grant_drift_query_status=pass`
- `remote_current_grant_drift_count=0`
- `remote_current_grant_drift_breakdown_count=0`
- `remote_usage_quotas_authenticated_write_drift_count=0`
- `remote_anon_grant_drift_breakdown_count=0`
- `remote_server_only_authenticated_grant_drift_breakdown_count=0`
- `grant_drift_table_label=none`
- `grant_drift_role_label=none`
- `grant_drift_privilege_type_label=none`
- `grant_drift_count=0`
- `remote_current_grant_drift_status=pass`
- `remote_mutation_scope_status=current-grant-truncate-only`

Default privileges remain a separate blocker until a separate approval-gated remediation or risk-acceptance decision records `remote_default_privileges_status=pass` or an accepted risk label. A current grant remediation pass does not flip the public gate.

## Risk Acceptance Effect

If the release owner accepts the current grant risk instead of remediation, record:

- `current_grant_risk_acceptance_status=accepted`
- `remote_current_grant_remediation_status=not-run`
- `remote_mutation_status=not-run`
- `remote_current_grant_drift_status=fail`
- `remote_current_grant_drift_count=1`
- `public_release_capable_status` remains `no` until the separate PL-G5 release-owner decision explicitly accepts all remaining Supabase risks.

Risk acceptance does not flip the public gate, deploy, promote to `main`, mutate Supabase, or prove remote posture pass. It only changes this current-grant blocker from unresolved risk to accepted risk.

## Non-Actions

- Remote current grant remediation: not run.
- Remote default privileges remediation/apply: not run.
- Remote Supabase migration apply, `db push`, repair, or reset: not run.
- Remote Supabase row mutation or policy change: not run.
- Deploy/upload: not run.
- Public gate flip: not run.
- Live/provider execution, OAuth live flow, Google target lookup, Stripe/billing mutation, Product/Price creation, Checkout/Portal redirect, webhook registration: not run.

## References

- Supabase securing API guidance: https://supabase.com/docs/guides/api/securing-your-api
- Current grant drift triage: `docs/active/COMMENT_TRANSLATOR_SUPABASE_CURRENT_GRANT_DRIFT_READONLY_TRIAGE.md`
- Default privileges execution preflight: `docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMOTE_REMEDIATION_EXECUTION_PREFLIGHT.md`
