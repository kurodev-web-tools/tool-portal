# Comment Translator Supabase Default Privileges Remote Remediation Execution Preflight

Date: 2026-07-07

## Scope

This is the execution preflight and risk-acceptance decision record for the Kuro Live Comment Translator free public beta integration line. It narrows the already-recorded remote default-privileges failure into the exact choices that must be made before PL-G5 can treat the risk as resolved or explicitly accepted.

This slice does not apply migrations, execute remote SQL mutations, change current-table grants or policies, mutate rows, deploy, run live provider/OAuth/Stripe flows, or flip a public gate.

Sanitization boundary: this document records only pass/fail/status/count/table labels, role labels that are already part of the public Supabase/Postgres posture model, exact approval labels, and unchecked scope. It does not include raw stdout/stderr, raw response bodies, project identifiers, account identity values, tokens, secrets, credential values, connection strings, headers, browser storage, owner ids, internal user ids, provider private identifiers, raw comments, or raw account metadata.

## Current Sanitized Evidence

The latest merged remote read-only posture and remediation approval evidence remains the authority for this preflight:

| Evidence | Status |
| --- | --- |
| `remote_catalog_query_status` | `pass` |
| `remote_table_count` | `9` |
| `remote_expected_missing_count` | `0` |
| `remote_rls_status` | `pass` |
| `remote_grant_status` | `pass` |
| `remote_default_privileges_status` | `fail` |
| `remote_unexpected_default_grant_count` | `48` |
| `remote_default_acl_entry_count` | `6` |
| `remote_default_acl_owner_status` | `mixed-or-non-postgres` |
| `owner_specific_block_required_status` | `yes` |

The current remote posture is safe for the existing expected table/RLS/grant set, but future `public` object defaults still grant browser/service roles. Owner role names beyond the documented `postgres` role were not printed or persisted, so a blind `postgres`-only apply is not sufficient.

## Decision Gate

| Decision | Status |
| --- | --- |
| `remediation_decision_status` | `pending` |
| `risk_acceptance_status` | `not-recorded` |
| `remote_apply_approval_status` | `absent` |
| `remote_apply_preflight_status` | `not-run` |
| `remote_remediation_apply_status` | `not-run` |
| `remote_mutation_status` | `not-run` |
| `public_release_capable_status` | `no` |

There are only three acceptable next outcomes:

- remediation apply is explicitly approved after same-process read-only preflight;
- risk is explicitly accepted by the release owner without applying remediation;
- the gate stays blocked.

## Approved Remediation Shape

The reviewed base SQL shape remains the local guard migration:

```sql
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;
```

If the same-process read-only owner preflight still reports `remote_default_acl_owner_status=mixed-or-non-postgres`, the approved apply must also include equivalent operator-local owner-specific blocks without printing or persisting private owner role names:

```sql
alter default privileges for role <approved-owner-role> in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role <approved-owner-role> in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

alter default privileges for role <approved-owner-role> in schema public
  revoke execute on functions from anon, authenticated, service_role;

alter default privileges for role <approved-owner-role> in schema public
  revoke execute on functions from public;
```

Do not store the private owner role value in repo docs, PR bodies, task notes, raw logs, browser storage, or handoff payloads. If the owner-specific block cannot be reviewed locally without exposing private owner identity values, stop and keep the gate blocked.

## Required Same-Process Pre-Apply Checks

Before any remote mutation, the operator must run a read-only preflight in the same command process that will apply the reviewed SQL and record only sanitized labels/counts:

- `cli_status=local-cli-present`
- `link_status=supabase-link-metadata-present`
- `remote_catalog_query_status=pass`
- `remote_table_count=9`
- `remote_expected_missing_count=0`
- `remote_rls_status=pass`
- `remote_grant_status=pass`
- `remote_default_privileges_status=fail`
- `remote_unexpected_default_grant_count` remains greater than `0`
- `remote_default_acl_owner_status` is either `postgres-only` or `mixed-or-non-postgres`
- `owner_specific_block_required_status=yes` when owner status is `mixed-or-non-postgres`

If any check cannot run safely, emits raw output, requires printing credentials or project identity, or finds unexpected current-table/RLS/grant drift, do not apply. Record `remote_apply_preflight_status=blocked` and keep `remote_remediation_apply_status=not-run`.

## Exact Approval Labels

The remote remediation apply can run only after this exact same-thread approval is recorded:

`I approve remote Supabase default-privileges remediation against the currently linked project only. Scope is future public object default privileges only, using the reviewed SQL in docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_REMOTE_REMEDIATION_EXECUTION_PREFLIGHT.md and an operator-local owner-specific block only if the same-process sanitized owner preflight still reports mixed-or-non-postgres. Keep evidence sanitized to pass/fail/count/status labels only. Do not run db push, repair, reset, deploy/upload, public gate flip, live/provider/OAuth/Stripe actions, row mutation, current-table grant/policy rewrite, raw response capture, browser storage capture, credential exposure, or public access change.`

The risk can be accepted without remediation only after this exact same-thread release-owner decision is recorded:

`I explicitly accept the remote Supabase future default-privileges risk for the currently linked project. Do not run remediation apply. Keep remote_default_privileges_status=fail, record risk_acceptance_status=accepted, and continue PL-G5 decision only under this accepted risk label with sanitized evidence only.`

Any shorter approval, ambiguous "go ahead", or approval that omits the linked-project/current-future-default-only/sanitized-output/no-forbidden-actions boundaries is not enough for remote mutation.

## Required Post-Apply Verification

After an approved remote remediation apply, immediately run read-only verification and record only sanitized labels/counts:

- `remote_catalog_query_status=pass`
- `remote_table_count=9`
- `remote_expected_missing_count=0`
- `remote_rls_status=pass`
- `remote_grant_status=pass`
- `remote_default_privileges_status=pass`
- `remote_unexpected_default_grant_count=0`
- `remote_public_default_grant_count=0`
- `remote_mutation_scope_status=default-privileges-only`

If current expected tables, RLS, or explicit grants drift, stop as a blocker and do not proceed to PL-G5 acceptance.

## Risk Acceptance Effect

If the release owner accepts the risk instead of remediation, record:

- `risk_acceptance_status=accepted`
- `remote_remediation_apply_status=not-run`
- `remote_mutation_status=not-run`
- `remote_default_privileges_status=fail`
- `remote_unexpected_default_grant_count=48`
- `public_release_capable_status` remains `no` until the separate PL-G5 release-owner decision explicitly accepts this risk.

Risk acceptance does not flip the public gate, deploy, promote to `main`, mutate Supabase, or prove remote posture pass. It only changes the PL-G5 blocker from unresolved risk to accepted risk.

## Non-Actions

- Remote Supabase migration apply: not run.
- Remote Supabase row mutation, grant change for current tables, policy change, repair, reset, or `db push`: not run.
- Deploy/upload: not run.
- Public gate flip: not run.
- Live/provider execution, OAuth live flow, Google target lookup, Stripe/billing mutation, Product/Price creation, Checkout/Portal redirect, webhook registration: not run.
- Supabase default privileges guard migration or contract behavior: unchanged.

## References

- Supabase securing API guidance: https://supabase.com/docs/guides/api/securing-your-api
- Supabase RLS guidance: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase default Data API exposure changelog: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
