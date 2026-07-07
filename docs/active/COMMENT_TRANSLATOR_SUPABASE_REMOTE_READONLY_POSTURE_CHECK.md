# Comment Translator Supabase Remote Read-Only Posture Check

Date: 2026-07-06

## Scope

This is the remote read-only posture check slice for the Kuro Live Comment Translator free public beta integration line. It records whether a safe Supabase CLI, link, or MCP route is available for metadata/advisor reads. It does not apply migrations, change grants or policies, mutate rows, deploy, run live provider/OAuth/Stripe flows, or flip a public gate.

Sanitization boundary: this document records only pass/fail/status/count/table labels and unchecked scope. It does not include raw stdout/stderr, raw response bodies, project identifiers, account identity values, tokens, secrets, service-role values, connection strings, headers, browser storage, owner ids, internal user ids, provider private identifiers, raw comments, or raw account metadata.

## Local Expected Posture Anchor

The local expected posture remains the existing Supabase DB/Auth/RLS audit plus the default privileges guard:

- `public_table_count`: `9`
- `local_rls_status`: `pass`
- `local_grant_status`: `pass`
- `local_privileged_object_status`: `pass`
- `default_privileges_guard_status`: `local-proposal-present`
- `remote_migration_apply_status`: `not-run`

Existing public schema table names already recorded in the local audit:

- `public.user_profiles`
- `public.user_preferences`
- `public.tool_preferences`
- `public.usage_quotas`
- `public.youtube_oauth_credentials`
- `public.comment_translator_sessions`
- `public.comment_translator_usage_ledger_events`
- `public.comment_translator_real_comments_feed_snapshots`
- `public.comment_translator_creator_waitlist_registrations`

## Remote Read-Only Readiness

Current sanitized readiness labels from this worktree:

| Check | Status | Decision |
| --- | --- | --- |
| `cli_status` | `local-cli-present` | Supabase CLI is available through the pinned dev dependency. |
| `cli_version_status` | `present` | Version was checked without recording the raw version string. |
| `link_status` | `supabase-link-metadata-present` | Link metadata exists; the project identifier was not printed or persisted in this evidence. |
| `mcp_status` | `not-used` | MCP was not invoked because the CLI linked path was available. |
| `remote_readonly_check_status` | `partial` | Linked read-only advisor checks ran; table/RLS/grant catalog values were not safely extractable through the CLI query/dump path in this process. |

Remote posture evidence:

| Evidence | Status |
| --- | --- |
| `remote_table_count` | `not-read` |
| `remote_rls_status` | `not-read` |
| `remote_grant_status` | `not-read` |
| `remote_default_privileges_status` | `not-read` |
| `remote_advisor_status` | `pass` |
| `remote_advisor_issue_count` | `3` |
| `remote_advisor_warn_count` | `3` |
| `remote_advisor_error_count` | `0` |
| `remote_drift_status` | `partial-unchecked` |

Additional sanitized CLI observations:

- `linked_query_probe_status`: `pass`
- `linked_query_result_shape`: `array-row`
- `remote_schema_dump_status`: `fail`
- `remote_catalog_status`: `not-read-cli-output-unavailable`

The linked query probe proved the remote linked read path can execute a SELECT. However, the CLI query output did not expose usable row values for catalog aggregation in this process, and `db dump --linked --schema public` did not complete without emitting raw diagnostic output. To preserve the no-raw-output boundary, table/RLS/grant/default-privilege posture remains unchecked.

## Safe Retry Criteria

A later remote read-only retry can run only when all of these are true in the same command process:

- Supabase CLI or MCP read-only access is available.
- The target can be selected without printing or persisting project identifiers, credentials, connection strings, headers, or raw response bodies.
- The command path emits only sanitized pass/fail/status/count/table labels.
- The operation is limited to metadata/advisor reads.

If these criteria are not all true, keep the unresolved catalog portion blocked and do not force remote inspection.

## Non-Actions

- Remote Supabase migration apply: not run.
- Remote Supabase row mutation, grant change, policy change, repair, reset, or `db push`: not run.
- Deploy/upload: not run.
- Public gate flip: not run.
- Live/provider execution, OAuth live flow, Google target lookup, Stripe/billing mutation, Product/Price creation, Checkout/Portal redirect, webhook registration: not run.
- Supabase default privileges guard migration or contract behavior: unchanged.
- Supabase CLI dev dependency pin: added as a local development dependency only.

## Verification

Required contract:

- `node scripts/comment-translator-supabase-remote-readonly-posture-check-contract.mjs`

This contract checks that the evidence remains sanitized, the local expected posture is anchored to the existing 9-table audit and default privileges guard, the remote posture is explicitly blocked rather than overclaimed, and no remote mutation/apply/public-gate/provider/OAuth/Stripe action is recorded as run.
