# Comment Translator Supabase DB/Auth/RLS Security Audit

Date: 2026-07-06

## Scope

This is an audit-first slice for the Kuro Live Comment Translator free public beta integration line. It reviews local Supabase migrations, local Auth/RLS assumptions, trusted Supabase runtime boundaries, and privileged database objects. It does not apply migrations, change remote grants or policies, mutate rows, deploy, run live provider/OAuth/Stripe flows, or flip a public gate.

Sanitization boundary: this document records table names, role posture, policy shape, source file paths, pass/fail labels, and unchecked scope only. It does not include secret values, credential values, browser storage payloads, raw provider responses, raw comments, private provider identifiers, internal account id values, live target values, or key material.

## Supabase Baseline Used

- Supabase Data API exposure requires both database privileges and RLS posture to be intentional; explicit `GRANT` statements are separate from RLS policy checks. Reference: https://supabase.com/docs/guides/api/securing-your-api
- Tables in exposed schemas, especially `public`, need RLS enabled when browser clients can reach them. User-owned rows need ownership predicates such as `auth.uid() = user_id`; `TO authenticated` alone is not authorization. Reference: https://supabase.com/docs/guides/database/postgres/row-level-security
- Update policies for user-owned writes should include both `USING` and `WITH CHECK` so users cannot update or move rows outside their ownership boundary. Reference: https://supabase.com/docs/guides/database/postgres/row-level-security
- Views can bypass table RLS unless they are security-invoker views on supported Postgres versions or are protected by schema/grants. `SECURITY DEFINER` functions in exposed schemas are high-risk unless tightly justified and locked down. Reference: https://supabase.com/docs/guides/database/postgres/row-level-security
- User-editable metadata must not be used for authorization decisions; trusted authorization should use server-side account identity and policies. Reference: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase service-role or secret keys must never be browser-readable. Reference: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase is moving away from implicitly exposing newly created tables through the Data API; local migrations should keep explicit grants/revokes to avoid posture drift. Reference: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically

## Local Migration Inventory

Reviewed files:

- `supabase/migrations/20260527000000_account_preferences_foundation.sql`
- `supabase/migrations/20260601000000_youtube_oauth_credentials.sql`
- `supabase/migrations/20260615000000_comment_translator_sessions.sql`
- `supabase/migrations/20260615001000_comment_translator_usage_ledger_events.sql`
- `supabase/migrations/20260623000000_comment_translator_real_comments_feed_snapshots.sql`
- `supabase/migrations/20260624000000_account_display_timezone_preference.sql`
- `supabase/migrations/20260705000000_comment_translator_creator_waitlist_registrations.sql`

The local migration set creates 9 `public` tables. The timezone migration only alters `public.user_preferences`.

| Table | Intended access model | RLS | Grants/revokes | Policy posture | Audit decision |
| --- | --- | --- | --- | --- | --- |
| `public.user_profiles` | Browser user-owned via RLS | Enabled | `anon` revoked; `authenticated` select/insert/update | Owner select/insert/update with `auth.uid() = user_id`; update has `USING` and `WITH CHECK` | Accept local posture |
| `public.user_preferences` | Browser user-owned via RLS | Enabled | `anon` revoked; `authenticated` select/insert/update | Owner select/insert/update with `auth.uid() = user_id`; update has `USING` and `WITH CHECK` | Accept local posture |
| `public.tool_preferences` | Browser user-owned via RLS | Enabled | `anon` revoked; `authenticated` select/insert/update | Owner select/insert/update with `auth.uid() = user_id`; update has `USING` and `WITH CHECK` | Accept local posture |
| `public.usage_quotas` | Browser user-owned read-only; trusted-server writes only | Enabled | `anon` revoked; `authenticated` select only | Owner select with `auth.uid() = user_id`; no authenticated write grants | Accept local posture |
| `public.youtube_oauth_credentials` | Trusted server only | Enabled | `anon` and `authenticated` revoked; trusted server role granted | Trusted server role policy for all operations | Accept local posture; keep browser output opaque/sanitized only |
| `public.comment_translator_sessions` | Trusted server only | Enabled | `anon` and `authenticated` revoked; trusted server role granted | Trusted server role policy for all operations | Accept local posture |
| `public.comment_translator_usage_ledger_events` | Trusted server only | Enabled | `anon` and `authenticated` revoked; trusted server role granted | Trusted server role policy for all operations | Accept local posture |
| `public.comment_translator_real_comments_feed_snapshots` | Trusted server only | Enabled | `anon` and `authenticated` revoked; trusted server role granted | Trusted server role policy for all operations plus browser-safe JSON marker checks | Accept local posture |
| `public.comment_translator_creator_waitlist_registrations` | Trusted server/admin-only | Enabled | `anon` and `authenticated` revoked; trusted server role granted | Trusted server role policy for all operations | Accept local posture |

## Policy And Grant Findings

- No local table in `public` is missing `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- No local table grants direct table access to `anon`.
- No local policy was found that relies on `TO authenticated` alone for a user-owned table.
- User-owned write policies for `user_profiles`, `user_preferences`, and `tool_preferences` include both `USING` and `WITH CHECK`.
- `usage_quotas` is browser-readable only through owner-select RLS. Authenticated insert/update/delete grants are not present.
- Trusted-server tables revoke `anon` and `authenticated`, grant the trusted server role, and define trusted-server all-operation policies.
- No public read-only table was found.
- No migration policy uses user-editable metadata as an authorization input.
- Local migrations do not define `ALTER DEFAULT PRIVILEGES`. This is not a current-table exposure, but it is a medium follow-up before adding more `public` tables because future Supabase default privilege behavior changes can make implicit assumptions easier to miss.

## Privileged Object Findings

The local migration set does not create views, functions, triggers, `SECURITY DEFINER` functions, exposed extra schemas, or storage policies. That means no local privileged database object was found that could bypass RLS or become callable by `PUBLIC`, `anon`, or `authenticated`.

Follow-up guard: any future migration that adds a view/function/trigger/storage policy should be reviewed before merge. Views should prefer security-invoker behavior when supported or be protected by schema/grants. Definer functions should not be public-callable unless explicitly justified and locked down.

## Runtime And Client Boundary Findings

- `lib/supabase/browser.ts` uses the publishable Supabase config with `createBrowserClient`; it does not reference trusted server env names.
- `lib/supabase/server.ts` uses the publishable Supabase config with `createServerClient` for cookie/session work; it does not use trusted server credentials.
- Trusted Supabase durable stores are server-only modules and use Supabase clients with session persistence and auto refresh disabled:
  - `lib/comment-translator-youtube-token-store-supabase-adapter.ts`
  - `lib/comment-translator-durable-session-store.ts`
  - `lib/comment-translator-durable-usage-counter-store.ts`
  - `lib/comment-translator-real-comments-feed-durable-store.ts`
  - `lib/comment-translator-creator-waitlist-durable-store.ts`
- Route/server-action caller authorization uses `auth.getUser()` before binding work to the server-side account identity.
- Trusted store reads and writes for sessions, usage, feed snapshots, waitlist rows, and credential status are scoped through server-derived ownership/session inputs where browser callers are involved.
- Browser-readable Comment Translator outputs are designed around sanitized session/feed/usage/status metadata. Token values, ciphertext, decrypt capability, provider target metadata, raw provider payloads, and raw comments remain outside client output by local contract.
- `credentialReferenceId` and `session_reference_id` are intentionally browser-readable opaque references in current design. They must remain non-reversible, non-provider identifiers, and unsuitable for authorization on their own.

## Audit Findings

### P0: No Local Current-Table RLS Disablement Found

The local migration set does not show an exposed `public` table with missing RLS, `anon` grants, or authenticated role-only ownership policy. No immediate local DB migration repair was applied in this audit PR.

### P1 High: Internal Account Id Is Still Present In Client Props

`AccountSessionState` includes `user.id`, and at least one client component consumes it as part of a client-side key. This is not a DB RLS bypass by itself because server actions/routes still derive authorization server-side, but it violates the intended browser-output minimization rule for internal account identifiers.

Recommended next PR: introduce a browser-safe account session view model that omits internal account ids from client props. Keep internal account id access server-only for admin allowlist hashing, private tester gates, credential ownership, durable session/usage/feed ownership, and waitlist duplicate prevention.

### P1 Medium: Future Public-Table Default Privilege Guard

Guard status: local migration proposal added in `supabase/migrations/20260706073204_supabase_default_privileges_guard.sql` and covered by `node scripts/comment-translator-supabase-default-privileges-guard-contract.mjs`.

Current tables have explicit grants/revokes and remain unchanged. The guard revokes future default table, sequence, and function privileges in `public` for the documented Supabase `postgres` owner role so newly created public tables are not implicitly reachable by `anon` or `authenticated`. It also revokes future default `service_role` privileges so trusted-server access for new tables must remain explicit in the table migration.

Boundary: this is a reviewable local migration proposal only. Remote apply remains explicitly approval-gated. Existing public tables keep their current explicit grants and RLS policies. If a remote project creates migration objects with a different owner role, the approved remote apply plan must add the equivalent `ALTER DEFAULT PRIVILEGES FOR ROLE <owner>` block before relying on the guard.

### P1 Medium: Remote Read-Only Posture Unchecked

Local CLI/link metadata was unavailable in this worktree, so deployed metadata, deployed grants, deployed RLS state, advisor results, and remote drift were not inspected.

Safe remote preflight when approved and available:

1. Confirm Supabase CLI or MCP read-only access and target project label without printing credentials.
2. Run metadata/advisor reads only.
3. Report only pass/fail/count/table-name/status labels.
4. Do not apply migrations, change grants/policies, mutate rows, deploy, or run live/provider/OAuth/Stripe actions.

## Verification Added

Added deterministic local contract:

`node scripts/comment-translator-supabase-db-auth-rls-security-audit-contract.mjs`

It checks:

- expected local migration files exist;
- exactly 9 expected public tables are present in local migrations;
- expected public tables have RLS enabled;
- user-owned tables have owner predicates and update `USING` plus `WITH CHECK`;
- server-only tables revoke browser roles and grant trusted server role only;
- no local views/functions/triggers/definer functions/storage policies are created;
- browser/server Supabase helpers keep trusted credentials out of browser/server-session helper clients;
- trusted durable Supabase stores are server-only and disable Supabase session persistence;
- the audit document and `task.md` record the internal-account-id and remote-read-only residual risks.

Added deterministic local guard contract:

`node scripts/comment-translator-supabase-default-privileges-guard-contract.mjs`

It checks:

- the default privileges guard migration exists;
- future public table, sequence, and function default privileges are revoked for `anon`, `authenticated`, and `service_role`;
- future function execute default privileges are revoked from `PUBLIC`;
- the guard migration does not create tables, alter existing table RLS, create policies, grant browser roles, or bulk expose public tables;
- the local public table inventory remains the existing 9 tables;
- the audit document and `task.md` record the local-proposal, remote-owner, remote-apply, and non-action boundaries.

## Verification Results

Passed:

- `node scripts/comment-translator-supabase-default-privileges-guard-contract.mjs`
- `node scripts/comment-translator-supabase-db-auth-rls-security-audit-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `git diff --check`
- changed-files high-confidence secret scan: `changed_files=4`, `secret_scan_matches=0`

Skipped:

- `npm run build`: runtime TS/TSX was unchanged; this guard slice changes SQL, docs, and a deterministic contract only.
- UI/browser width QA: no rendered UI, CSS, route, layout, or client behavior changed.

Remote read-only preflight labels:

- `global-supabase-missing`
- `local-npx-supabase-missing`
- `supabase-link-metadata-missing`

Attempted but not used as final verifiers because they require older `task.md` handoff markers unrelated to this audit slice:

- `node scripts/supabase-auth-first-slice-contract.mjs`
- `node scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs`
- `node scripts/comment-translator-durable-session-schema-adapter-contract.mjs`
- `node scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs`
- `node scripts/comment-translator-creator-waitlist-admin-contract.mjs`

## Non-Actions

- Remote Supabase migration apply: not run.
- Remote Supabase row mutation/grant/policy change: not run.
- Deploy/upload: not run.
- Public gate flip: not run.
- Live provider execution, OAuth live flow, Google target lookup, Stripe/billing mutation, Checkout/Portal redirect, webhook registration: not run.
