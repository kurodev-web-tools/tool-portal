# Creator C1 Containerless Billing-State Read Design

## Review Context

- Review target: Creator C1 production billing-state **read** redesign only.
- Reviewed repository base: `dfa15d76dbfc68e9c8288abe23d2d35c20aa002e`, the latest fetched tip of `origin/codex/comment-translator-free-public-beta-integration` on 2026-07-30.
- Current authority:
  - `docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md`
  - `docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md`
  - `docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_CP1_EXTERNAL_EVIDENCE_RECONCILIATION_PREFLIGHT.md`
  - PR #715 durable read wiring, PR #716 activation/read proof, and PR #717 retry authority/diffs
  - C1 billing/store/session/RLS/migration source at the reviewed base
- Review audience: 5.6sol pro security/architecture review.
- This document is design authority only. It does not authorize implementation, migration creation or apply, remote inspection, deployment, activation, Checkout, Stripe, public paid launch, commit, push, or PR creation.
- No secret, token, cookie, raw row, account/project identifier, owner identifier, billing reference, Stripe reference, signed-evidence payload, hash, or partial private value was requested, displayed, or stored while producing this design.

## Decision Summary

Adopt an **authenticated fixed-projection RPC backed by owner-scoped RLS**. The owner-binding architecture is fixed below; its data operation, proof, and activation approvals remain unresolved:

1. A signed-in caller uses the existing Supabase Auth session JWT.
2. A per-request server Supabase client explicitly selects the `comment_translator_api` schema and invokes one zero-argument RPC using only the project URL/publishable client credential and that caller JWT.
3. The RPC derives the caller solely from `auth.uid()`, reads at most the caller's one billing-state row, validates the existing signed-evidence-derived state internally, and returns exactly:
   - `result_status = available | missing | unavailable`
   - `billing_state = paid-active | paid-inactive | null`
4. The RPC never returns an authority table row, owner/billing/Customer/Price/Subscription/reference identifier, timestamp, signed-evidence field or payload, reason containing private material, or arbitrary JSON.
5. The authority table remains unavailable to `anon` and `authenticated`. Only the fixed RPC receives `EXECUTE` for `authenticated`.
6. The primary fixed-RPC-only design uses a tightly constrained `SECURITY DEFINER` function owned by a dedicated `NOLOGIN NOBYPASSRLS` reader role, an empty fixed `search_path`, fully qualified relations, `FORCE ROW LEVEL SECURITY`, and an `auth.uid()` owner policy. The table remains owned by a different role.
7. `PUBLIC`, `anon`, and unrelated roles receive no RPC execution or table access. `service_role` is not used by the read request.
8. `available/paid-active` is the only projection that unlocks Paid. Every other outcome keeps Free available and fails closed.
9. The RPC lives in the dedicated exposed `comment_translator_api` schema. The new binding relation and any new helper remain in unexposed `comment_translator_private`; the existing signed-evidence authority relation remains at `public.comment_translator_paid_entitlements` and is protected by explicit grants plus forced RLS rather than relocated.
10. Owner authorization uses one fixed unexposed relation, `comment_translator_private.paid_entitlement_owner_bindings`, rather than adding `owner_user_id` to the signed-evidence authority table.

This replaces only the current production **read** topology:

```text
current
authenticated app gate
  -> Worker service_role material
  -> Container Durable Object
  -> parent/child process
  -> authority row read
  -> fixed billing projection

recommended target
authenticated app gate
  -> per-request caller JWT client
  -> fixed RPC
  -> auth.uid() owner RLS
  -> authority row validation inside Postgres
  -> fixed billing projection
```

The existing signed Stripe webhook evidence remains the sole billing-state mutation authority. Checkout, webhook verification, mutation, Product/Price/Customer/Subscription/Portal behavior, and public paid launch are not redesigned here.

## Unresolved Decisions

The architecture choices stated here are fixed. The following approval owners, proof inputs, and operational values still block implementation or activation; a reviewer must not invent them:

1. **Owner-binding rollout approval (architecture resolved)**
   - The current `comment_translator_paid_entitlements` row is keyed by a private billing reference and has no `owner_user_id`.
   - The fixed design selects a separate unexposed `comment_translator_private.paid_entitlement_owner_bindings` relation. The signed-evidence authority table does not gain an authenticated owner column.
   - The binding relation contains one immutable `owner_user_id uuid` primary key and one immutable, non-null, unique private billing reference. It has no cascading foreign key or automatic delete/reassignment path to `auth.users`.
   - Every existing Auth user is backfilled through a separately approved migration operation using the repository's reviewed billing-reference derivation rule without outputting either input or derived value. Count-only proof must establish `eligible Auth users = bound Auth users`, zero Auth users without a binding, and zero authority rows without exactly one binding.
   - Future Auth users receive the binding from a reviewed database-local Auth-user creation trigger in the same transaction as user creation. Trigger failure aborts binding creation; billing intent remains blocked.
   - The existing repository billing-reference derivation rule is retained for compatibility. This design does not authorize displaying, exporting, storing in evidence, or externally hashing an actual owner identifier.
   - Runtime read classification first looks up the caller's binding by `auth.uid()`. Missing caller binding is `unavailable/null`, because successful backfill/forward provisioning is a cutover invariant. A binding with no authority row is `missing/null`.
   - The backfill source, cardinality proof, conflict handling, and zero-private-output evidence require separate approval. This design does not authorize deriving, hashing, exporting, or displaying private identifiers.
   - Backfill alone is insufficient. The Auth-user trigger must be proven before any future billing intent is allowed.
   - The database must enforce one owner to one billing reference and one billing reference to one owner. Both sides are unique, non-null after binding, and immutable through ordinary update paths.
   - Key-column `UPDATE` and binding `DELETE` are rejected by privilege and database invariant; the signed-evidence writer receives read-only binding access and cannot mutate it.
   - Duplicate or conflicting inserts use no `ON CONFLICT DO UPDATE`, never adopt an existing value silently, and abort the transaction.
   - The signed-evidence writer may create/update an authority row only when its billing reference joins exactly one binding. Unbound reference evidence is rejected before authority-row creation or activation.
   - Account deletion leaves the binding tombstoned by retention rather than automatically deleting, recycling, or reassigning it. Re-registration creates a new Auth identity and cannot inherit the old binding. Any future revocation/rebind policy is separately designed and approved.
   - Backfill and forward-trigger proof are implementation-planning blockers; zero missing Auth-user bindings, zero unbound authority rows, and zero conflicts are read-cutover blockers.

2. **Final removal of `service_role` from the application Worker**
   - The recommended read path does not need `service_role`.
   - The current trusted signed-webhook store writer also uses the service-role store factory. If that writer shares the same deployed Worker, removing the secret from the Worker requires a separately reviewed mutation-plane relocation or least-privilege write design.
   - This read design does not move or weaken the signed-webhook mutation authority. Until the mutation plane is resolved, the verified claim is “service_role removed from C1 read execution,” not “service_role absent from the whole Worker.”

3. **Data API exposure approval**
   - The architecture fixes the RPC schema as dedicated `comment_translator_api`; `public` is not the production fallback.
   - Adding or removing that schema from the project's exposed-schema configuration is a remote configuration operation and needs separate approval.
   - Implementation and activation remain blocked until current exposure state, configuration owner, apply order, schema-cache behavior, and rollback authority are approved.

4. **Request deadline**
   - The caller needs one fixed, reviewed deadline and no automatic retry.
   - The exact duration must be selected from current production latency evidence; it is not invented in this design.

5. **Strict session revocation check**
   - Baseline requires a freshly validated per-request Supabase session and `auth.uid()`.
   - A stricter `session_id` to `auth.sessions` existence check may reduce the residual window after session revocation, but it adds privileged Auth-schema coupling and must be validated against current Supabase support before adoption.

## Review Checklist

- [ ] The result has exactly two fields and only the allowed value combinations.
- [ ] Raw authority rows and every private/reference/evidence field remain unreachable to `anon` and `authenticated`.
- [ ] `auth.uid()` is the only owner identity used by the read authorization decision.
- [ ] No `user_metadata` or caller-supplied owner/reference parameter participates in authorization.
- [ ] The function owner is `NOLOGIN NOBYPASSRLS`, is not the table owner, and receives only the required read privileges.
- [ ] `FORCE ROW LEVEL SECURITY`, the owner policy, explicit GRANT/REVOKE statements, and the fixed `search_path` are present in one reviewed migration unit.
- [ ] `PUBLIC EXECUTE`, `anon EXECUTE`, and direct authenticated table access are absent.
- [ ] Missing, malformed, unsigned, inactive, unreadable, error, and timeout behavior is fail closed and keeps Free available.
- [ ] Existing signed webhook mutation ordering, stale/replay rejection, and inactive-on-timestamp-tie behavior remain unchanged.
- [ ] Every existing Auth user is backfilled, forward owner binding covers every new Auth user, and both paths have separate explicit approval, one-to-one immutable constraints, and sanitized count-only proof.
- [ ] The dedicated API schema has a trusted owner, minimum `USAGE`, no untrusted `CREATE`, safe default routine privileges, and schema-specific client resolution.
- [ ] Runtime roles have no membership, inheritance, `SET ROLE`, or `ADMIN OPTION` path into the API-schema owner or reader role.
- [ ] Unbound/conflicting authority rows are cutover blockers, not caller-visible runtime classifications.
- [ ] Data API exposed-schema state and the 2026 explicit-grant change are covered by preflight and rollback.
- [ ] Free-only safety rollback is always available; Container rollback is claimed only after a separate production one-read proof.
- [ ] A read-only identifier-free project-health monitor, named pause/restore owners, an approval-gated restore/smoke runbook, monitoring cadence, recovery objective, and plan-upgrade decision criterion are approved.
- [ ] No Checkout, Stripe SDK, Product, Price, Customer, Subscription, Portal, webhook mutation, deploy, activation, or public-launch action is included.

## Goals

- Make the production C1 billing-state read operable on Supabase Free plan without Cloudflare Containers, Durable Objects, or child-process execution.
- Bind every read to the authenticated Supabase user and the user's own billing state.
- Remove `service_role` from the read data plane.
- Preserve the existing fixed sanitized projection and fail-closed Free behavior.
- Preserve the signed billing evidence authority without duplicating or weakening it.
- Minimize Data API exposure and make every grant reviewable in migration source.

## Non-Goals

- Designing or invoking Stripe Checkout, Customer creation, Product/Price configuration, Customer Portal, or subscription mutation.
- Changing Stripe webhook signature verification or accepted event rules.
- Replacing the signed-webhook evidence authority.
- Designing the final mutation-plane relocation needed for whole-Worker `service_role` removal.
- Implementing migrations, application code, config, bindings, dependencies, manifests, lockfiles, remote operations, deployment, activation, or public paid launch.
- Returning period end, subscription status, entitlement details, billing references, or provider identifiers to the read caller.

## Current State And Constraints

### Current authority row

`public.comment_translator_paid_entitlements` currently contains private billing and Stripe references, subscription status, billing state, signed-evidence source/reference/timestamps, and current period end. It is RLS-enabled, revoked from `anon` and `authenticated`, granted to `service_role`, and written through a `SECURITY DEFINER` RPC restricted to `service_role`.

The table constraints already establish:

- billing state is `paid-active` or `paid-inactive`;
- the database constraint is permissive enough to store `paid-active` for source status `active` or `trialing`;
- active rows require Customer, Subscription, and period-end references;
- evidence source is fixed to `signed-stripe-webhook`;
- stale evidence is ignored and inactive wins an equal evidence timestamp.

The reviewed repository behavior is narrower than that table constraint: the current signed-evidence writer produces `paid-active` only for source status `active` with a future period, and the current Container read maps `trialing` to `paid-inactive` even if a stored row says `paid-active`. The new RPC preserves that existing read-activation policy; it does not introduce a new trial downgrade. Migration/implementation review must re-verify both behaviors at its exact base.

The redesign treats signed webhook evidence as subscription-fact authority and the existing active-only read rule as Creator C1 Paid-activation authority. It adds read authorization metadata; it does not treat the authenticated caller, browser, or Worker as billing evidence.

### Current PR #715-#717 state

- PR #715 connected the Worker to one Container/Durable Object/process read and retained parent/child Buffer zero-fill, observed-exit requirements, single-use attempt state, repeat suppression, and fixed result projection.
- PR #716 added a sanitized one-read proof route, but remote deployment/binding/Container presence was not proven.
- PR #717 separated local Wrangler availability from the remote control-plane blocker; the first remote control-plane read remained unavailable, so activation and production reads stayed at zero.
- The canonical current topology is therefore repository-wired but not production-proven.

### Existing browser-safe mapping

The current billing runtime maps:

- `paid-active` to Paid;
- `missing` to Free;
- `paid-inactive` and `unavailable` to Free with a paid-inactive posture.

This mapping is retained. The redesign must not make Free unavailable when the paid authority is inactive or unreadable.

## Options And Trade-Offs

| Option | Authorization | Exposed data surface | Secret posture | Operational fit | Decision |
| --- | --- | --- | --- | --- | --- |
| A. Direct table `SELECT` with owner RLS | `authenticated` table grant plus `auth.uid()` policy | Table and selectable columns become a client contract; schema/grant drift can widen it | No read `service_role` | Simple and Free-plan compatible | Reject as primary |
| B. Worker direct read with `service_role` | Worker gate only; `service_role` bypasses RLS | Server can read the full authority row | High-value bypass credential remains in read runtime | Simple but preserves current blast radius | Reject |
| C. Fixed RPC plus owner RLS | Caller JWT, fixed RPC grant, `auth.uid()` RLS, dedicated non-bypass definer | Exactly two fixed projection fields | No read `service_role` | Free-plan compatible; more migration and owner-binding work | Recommend |

### Option A: direct table SELECT

Advantages:

- Uses normal `SECURITY INVOKER` semantics.
- RLS ownership is straightforward.
- Has the least database function code.

Rejected risks:

- Granting `SELECT` to `authenticated` turns the relation and its column grants into a public client contract.
- A later column-grant or view change can expose timestamps, references, or evidence fields.
- The caller can issue arbitrary supported filters/selects rather than one fixed operation.
- Returning a table/view row conflicts with the required fixed RPC-only boundary.

This is acceptable only as an emergency fallback using a separate safe projection relation with no private fields. It is not the recommended design.

### Option B: Worker service-role direct read

Advantages:

- Removes Containers while preserving the current store client and parser.
- Needs no owner-column migration for the immediate read because the Worker derives the private billing reference.

Rejected risks:

- `service_role` bypasses RLS and can read unrelated tables if leaked or misused.
- Authorization remains entirely in application code rather than being enforced again by Postgres.
- A compromised read path can access raw billing/reference/evidence material.
- It does not achieve the requested Worker/browser secret posture.

### Option C: fixed RPC plus owner-scoped RLS

Advantages:

- Uses the caller's authenticated identity rather than a database-wide bypass credential.
- Keeps the authority table and its private columns ungranted.
- Makes the API response shape stable, minimal, and independently testable.
- Adds database enforcement beneath the existing application authorization gate.
- Uses one indexed owner read and a two-field response, which fits Free-plan constraints.

Costs:

- Requires a proven owner-binding migration.
- Requires careful function ownership and privilege design.
- Requires current exposed-schema and explicit-grant verification.
- Direct authenticated RPC calls remain possible outside the app UI, so the query must stay cheap, indexed, fixed, and safe without relying on the UI gate.

## Recommended Architecture

### Components

1. **Existing application authorization gate**
   - Loads the current account session per request.
   - Rejects signed-out, recovery-pending, unavailable, or unauthorized callers before RPC.
   - Retains existing closed-beta activation and owner-allowlist behavior until separately changed.

2. **Per-request Supabase user client**
   - Uses the current request's Supabase Auth session JWT.
   - Uses only the public project URL and publishable client credential.
   - Explicitly selects `comment_translator_api` for the RPC.
   - Is never shared across requests.
   - Does not log or export JWT/cookie material.

3. **Versioned fixed RPC**
   - Zero caller-supplied parameters.
   - Returns exactly one row with `result_status` and `billing_state`.
   - Lives in the dedicated exposed `comment_translator_api` schema.
   - Uses fully qualified relations and a fixed empty `search_path`.
   - Is callable only by `authenticated`.

4. **Dedicated API schema owner**
   - A trusted migration-controlled `NOLOGIN NOINHERIT` role owns only the `comment_translator_api` schema and retains the schema owner's inherent object-creation capability.
   - It does not own authority/binding relations and receives no authority-row privileges.
   - `PUBLIC`, `anon`, `authenticated`, `authenticator`, `service_role`, and the reader role have no schema `CREATE`.
   - No runtime or untrusted role is a member of, inherits from, has `ADMIN OPTION` over, or can `SET ROLE` to the schema owner.
   - The schema owner is not a member of any stronger role. Only the reviewed migration control plane may exercise owner capabilities.
   - The only routine-creator roles are the reviewed migration owner and schema owner; every other role lacks schema `CREATE`.
   - Function creation order is fixed: create/replace under the reviewed migration control plane, immediately set the empty `search_path`, transfer final function ownership to the reader, revoke broad execution, then grant the single authenticated execution path in the same transaction.

5. **Dedicated read-definer role**
   - `NOLOGIN`, `NOINHERIT`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, and `NOREPLICATION`.
   - `NOBYPASSRLS`.
   - Not the owner of the authority/binding table.
   - Receives only schema usage and the minimum columns/relations required by the read.
   - Owns the RPC so the caller does not need direct table privileges.
   - Has no inbound or outbound role memberships, no `ADMIN OPTION`, and no inheritance/`SET ROLE` path from `PUBLIC`, `anon`, `authenticated`, `authenticator`, `service_role`, or any runtime role.
   - Owns no unexpected schema, table, view, type, function, or sequence.

6. **Owner-binding relation**
   - Is fixed as unexposed `comment_translator_private.paid_entitlement_owner_bindings`.
   - Contains immutable `owner_user_id uuid primary key` and immutable unique non-null private billing reference columns.
   - Has RLS enabled and forced.
   - Allows the dedicated reader role to see only the binding satisfying `(select auth.uid()) = owner_user_id`.
   - Remains revoked from `anon` and `authenticated`; the signed-evidence writer can verify binding presence but cannot insert, update, delete, or reassign bindings.

7. **Existing signed-evidence authority relation**
   - Remains the current server-owned `public.comment_translator_paid_entitlements` relation and is not directly owner-readable.
   - Is not relocated into `comment_translator_private`; this read redesign does not move or rename mutation authority.
   - Is joined internally from the one caller-visible binding to at most one authority row.
   - Rejects new unbound evidence through the existing writer boundary before insert/activation.

8. **Existing signed-evidence mutation plane**
   - Continues to verify Stripe signatures and apply only supported, complete, newer evidence.
   - Continues to own Customer/Subscription/reference fields.
   - Cannot change or infer the owner binding through the public read RPC.

### Why `SECURITY DEFINER` is selected

Supabase recommends `SECURITY INVOKER` by default. It is not sufficient for the primary design because the invoking `authenticated` role would need underlying relation privileges, making direct table/view access part of the exposed surface.

The selected exception is a constrained `SECURITY DEFINER` function:

- owned by a dedicated non-login, non-bypass role rather than `postgres` or `service_role`;
- backed by forced RLS;
- without caller parameters;
- with an empty `search_path`;
- with fully qualified object names;
- with `PUBLIC EXECUTE` and `anon EXECUTE` revoked;
- with one explicit `authenticated EXECUTE` grant;
- returning a fixed non-private projection.

A `SECURITY DEFINER` function owned by `postgres`, `service_role`, the table owner without forced RLS, or any `BYPASSRLS` role is prohibited.

## Request And Data Flow

1. The browser requests the existing same-origin billing surface. No token, cookie, identifier, or billing reference is placed in the URL or response.
2. The server creates a fresh per-request Supabase client from the request session.
3. The server validates the session through the existing Auth path. Signed-out, recovery-pending, or unavailable auth returns the fixed unavailable posture without an RPC call.
4. The server explicitly selects `comment_translator_api` and invokes the zero-argument fixed RPC with the user's JWT.
5. PostgREST assigns the `authenticated` role only for a valid JWT.
6. The RPC checks that `auth.uid()` is non-null.
7. Forced RLS permits the dedicated reader role to read only the binding matching `auth.uid()`.
8. No caller binding is an invariant failure and returns `unavailable/null`; a caller binding with no joined authority row returns `missing/null`.
9. A pre-cutover global proof, not this caller RPC, establishes that no unbound/conflicting authority row exists. The RPC never scans all bindings or authority rows to classify another account.
10. The RPC validates the joined stored state internally:
   - signed evidence source is the fixed accepted source;
   - state/status combination is allowed;
   - active state has required internal references;
   - `paid-active` requires source subscription status `active` and a future period; `trialing` does not activate Paid;
   - required evidence timestamps/state are structurally readable.
11. The RPC returns one allowed projection.
12. The application validates the exact two-field response and maps it to the existing billing snapshot.
13. The response is `private, no-store`; no session-specific result is placed in shared cache, analytics payloads, browser storage, or logs.

## Authorization And Privileges

### Required policy shape

The later migration must express the equivalent of:

```sql
alter table <binding_relation> enable row level security;
alter table <binding_relation> force row level security;

create policy <fixed_binding_owner_read_policy>
on <binding_relation>
for select
to <dedicated_reader_role>
using ((select auth.uid()) = owner_user_id);

alter table <authority_relation> enable row level security;
alter table <authority_relation> force row level security;

create policy <fixed_authority_owner_read_policy>
on <authority_relation>
for select
to <dedicated_reader_role>
using (
  exists (
    select 1
    from <fully_qualified_binding_relation> as binding
    where binding.private_billing_reference =
      <fully_qualified_authority_relation>.private_billing_reference
      and binding.owner_user_id = (select auth.uid())
  )
);
```

This is illustrative design SQL, not an executable migration. The actual migration must use fully qualified fixed names and must prove that the authority policy can reach only the one binding already constrained to `auth.uid()`; it must not add an authenticated owner column to the signed-evidence authority relation.

### Required function privilege shape

The later migration must:

- create `comment_translator_api` under a dedicated trusted migration-controlled `NOLOGIN NOINHERIT` schema owner, while explicitly acknowledging that the owner retains inherent owner-level `CREATE`;
- revoke all schema privileges from `PUBLIC`, `anon`, `authenticated`, `service_role`, and the reader role before adding back minimum grants;
- grant schema `USAGE` only to `authenticated` and the dedicated reader role;
- keep schema `CREATE` unavailable to `PUBLIC`, `anon`, `authenticated`, `service_role`, and the reader role;
- enumerate the migration owner and API-schema owner as the only routine-creator roles and revoke their default routine `EXECUTE` privileges in `comment_translator_api` from `PUBLIC`, `anon`, `authenticated`, and `service_role`;
- reject any inbound/outbound role membership, inheritance chain, `ADMIN OPTION`, or runtime `SET ROLE` path involving the schema owner or reader role;
- revoke all direct authority/binding table privileges from `anon` and `authenticated`;
- revoke RPC execution from `PUBLIC`, `anon`, `service_role`, and any unrelated role;
- grant RPC execution only to `authenticated`;
- grant the dedicated reader only the minimum internal `SELECT` privilege;
- keep the existing service-only mutation RPC privileges unchanged unless a separate mutation design explicitly replaces them;
- create/replace the RPC, fix `search_path`, transfer final ownership to the reader, revoke broad execution, and add the one authenticated grant in that order within one transaction;
- include schema ownership/ACL/default privileges, role attributes/memberships, grants, RLS, policies, function creation, function owner, and comments in one reviewable migration unit.

The application call must be schema-specific, equivalent to selecting `comment_translator_api` before invoking the versioned RPC. A call that silently falls back to `public` is invalid.

### Prohibited authorization inputs

- `user_metadata` and `raw_user_meta_data`;
- email address;
- request/body/query owner identifier;
- request/body/query billing reference;
- browser-computed hash;
- Stripe metadata supplied by the read caller;
- UI visibility, route ownership, or client state alone.

`app_metadata` is also unnecessary for this owner check. The authoritative identity is `auth.uid()` plus the database-local immutable owner binding.

## Fixed Projection Contract

Only these combinations are valid:

| `result_status` | `billing_state` | Meaning | Application posture |
| --- | --- | --- | --- |
| `available` | `paid-active` | Owned, readable, signed-evidence-derived row is active and its period is still valid | Paid enabled |
| `available` | `paid-inactive` | Owned, readable, signed-evidence-derived row is valid but inactive or expired | Free remains available; Paid disabled |
| `missing` | `null` | Caller binding exists, but no joined authority row exists | Free |
| `unavailable` | `null` | Auth, caller binding invariant, row validity, permission, database, response, or deadline cannot establish a safe result | Free remains available; paid-inactive posture |

All other combinations are malformed and map to `unavailable/null`.

The RPC and its TypeScript consumer must reject extra fields, arrays with zero or multiple rows, arbitrary JSON, unexpected strings, identifiers, timestamps, and reason text from the database.

## Error Handling

| Condition | RPC/client classification | Result |
| --- | --- | --- |
| Valid active signed-evidence row with future period | `available/paid-active` | Paid |
| Valid trialing/past-due/unpaid/canceled/incomplete/incomplete-expired/paused or expired-active row | `available/paid-inactive` | Free, Paid disabled |
| Caller binding exists and no joined authority row exists | `missing/null` | Free |
| Caller binding is absent after cutover | `unavailable/null`; operational invariant failure | Free, paid-inactive posture |
| Any unbound/conflicting authority row found by pre-cutover proof | Block the entire cutover; no runtime classification | Existing production posture |
| Row source is unsigned/unaccepted | `unavailable/null` | Free, paid-inactive posture |
| Row is malformed or violates expected internal invariants | `unavailable/null` | Free, paid-inactive posture |
| Signed evidence is stale, replayed, or unreadable | Existing writer rejects/ignores it; read never upgrades | Prior valid state or fail closed |
| Signed-out/recovery-pending/auth unavailable | No RPC; `unavailable/null` | Free, paid-inactive posture |
| JWT rejected, expired, or owner unavailable | `unavailable/null` | Free, paid-inactive posture |
| Permission/exposed-schema mismatch | `unavailable/null` with sanitized operational class | Free, paid-inactive posture |
| Database/Data API error | `unavailable/null` | Free, paid-inactive posture |
| Fixed request deadline exceeded | Abort once, no automatic retry, `unavailable/null` | Free, paid-inactive posture |
| Extra/malformed RPC response | `unavailable/null` | Free, paid-inactive posture |

The RPC does not attempt to attribute an unbound authority row to a caller. Before cutover, migration proof requires zero missing Auth-user bindings plus global unbound-authority/conflict counts of zero. After cutover, the Auth-user binding trigger and writer constraint make a missing owner binding or new unbound authority row unrepresentable.

Errors must never trigger Checkout, Stripe SDK initialization, Customer/Portal operations, mutation, or public activation.

## JWT And Session Freshness

- Create a Supabase server client per request; never reuse one across users.
- Refresh/validate the current session through the existing Supabase SSR path before the billing RPC.
- Let PostgREST verify the JWT and use `auth.uid()` inside the database.
- Do not cache session-specific RPC responses.
- Do not authorize from `user_metadata`; Supabase documents it as user-editable.
- Do not authorize Paid from `app_metadata`; JWT claims can remain stale until refresh.
- Treat JWT expiry and refresh failure as `unavailable/null`.
- Supabase access tokens are short-lived, but session changes can become effective only after token refresh/expiry. If immediate revocation is required, separately review a strict `session_id` check against current `auth.sessions` support or an Auth-server validation step.
- Account deletion, session revocation, and recovery-pending behavior require explicit negative tests before activation.

## Data API Schema And Exposure

Supabase's 2026 Data API change makes object grants an explicit deployment concern separate from RLS:

- `GRANT` determines whether a role can reach a table/function.
- RLS determines which rows are visible after relation access is permitted.
- RLS does not protect function execution; function `EXECUTE` must be explicit.
- New project/object defaults are changing toward no automatic Data API exposure.
- Existing projects must not infer current exposure behavior from project age or migration source.

The production preflight must verify, using sanitized presence/status only:

1. the intended API schema is exposed;
2. the fixed RPC exists in that schema;
3. the schema owner is the reviewed trusted `NOLOGIN NOINHERIT` role and is treated as a privileged creator because PostgreSQL ownership inherently retains owner-level object-creation/control capability;
4. only the reviewed migration owner and API-schema owner can create routines in the API schema, and no unexpected routine or owned object exists;
5. `authenticated` has schema `USAGE` and exactly the intended RPC `EXECUTE`, but no schema `CREATE`;
6. `PUBLIC`, `anon`, `service_role`, and the reader role have no schema `CREATE`;
7. `pg_auth_members`, role attributes, inheritance, and grant-option state prove that no runtime role can become, inherit, administer, or `SET ROLE` to the API-schema owner or reader role, and neither privileged role reaches a stronger role;
8. default routine privileges for every possible creator role cannot auto-grant later function execution;
9. `PUBLIC` and `anon` cannot execute the RPC;
10. `comment_translator_private` is not exposed through the Data API, has no `USAGE`/`CREATE` grant to `PUBLIC`, `anon`, or `authenticated`, and contains the fixed binding relation plus only separately reviewed private helpers;
11. existing `public.comment_translator_paid_entitlements` remains in place but is not directly granted to `PUBLIC`, `anon`, or `authenticated`; the binding relation is likewise not directly granted, the reader role receives only the minimum relation privileges required under forced RLS, and the signed-evidence writer receives only the binding-existence access required by its reviewed write path;
12. RLS is enabled and forced;
13. the owner policy targets the dedicated reader role;
14. the function owner is the reviewed non-bypass role and owns no unrelated object;
15. the function's `prosecdef`, `proconfig`, fixed `search_path`, and fully qualified relation references match the reviewed design;
16. function creation, ownership transfer, `PUBLIC`/broad-role `EXECUTE` revocation, and the single `authenticated` grant occurred in the reviewed transactional order;
17. the schema-specific client call resolves the intended versioned RPC;
18. the schema cache recognizes the RPC after migration.

No raw catalog row, role identifier, project reference, function source, policy expression containing private material, or account metadata belongs in production proof output.

## Guarantees Changed By Removing Containers

### Guarantees lost from the current design

- Worker-owned input Buffer zero-fill after single-use stream transfer.
- Parent-owned and child-owned Buffer zero-fill.
- Single-use parent/child process construction and read counts.
- Success requiring observed parent and child zero exits.
- Process kill/exit containment for stop/error.
- Durable Object attempt-state suppression across Container invocation.
- Separation of read execution from the Worker V8 isolate by a process boundary.

These guarantees were about secret/reference material transferred to a privileged read process. They become unnecessary for the read path only if no service-role or private billing reference is constructed, transferred, or retained by the Worker/browser.

### Guarantees gained

- The read request carries only the caller's existing Auth session authority.
- A compromised read client cannot use a database-wide RLS-bypass credential.
- Postgres independently enforces owner scope beneath the application gate.
- The authority table remains ungranted and the callable surface is one fixed projection.
- There is no Container/DO/process lifecycle, image, exec, or privileged input stream to deploy and prove.
- Free-plan operation no longer depends on Cloudflare Containers paid/runtime availability.

### Residual risks

- A stolen still-valid user JWT can read that user's own fixed billing state until expiry/revocation takes effect.
- `SECURITY DEFINER` ownership/grant/search-path drift can widen access if migration review or later DDL is wrong.
- Owner-binding corruption could deny Paid or cross-bind an account; uniqueness, immutability, RLS, and backfill proof are mandatory.
- Direct authenticated callers can invoke the cheap RPC outside the UI and consume Free-plan database/API resources.
- Supabase/Data API/Auth outage, project pause, schema-cache lag, or quota exhaustion makes state unavailable.
- The application still must avoid shared caching and cross-request client reuse.
- Whole-Worker `service_role` removal remains unproven while a co-located mutation writer needs it.

## Migration Boundaries

### Phase 0: design review

- Review this document only.
- No migration file, SQL apply, config change, remote query, or deployment.

### Phase 1: local migration design

- Author one additive migration with the fixed private owner-binding relation, Auth-user forward trigger, dedicated private/API schemas and owners, reader role, forced RLS, owner policy, fixed RPC, writer binding guard, explicit schema/object/default-privilege grants/revokes, role-membership invariants, ownership, search path, and comments.
- Add pgTAP/catalog contracts and application projection contracts.
- Do not apply remotely.

### Phase 2: additive remote schema apply

- Requires exact migration hash/base, target-owner confirmation, rollback owner, sanitized output reviewer, and separate approval.
- Leave the current production billing posture unchanged and keep the new RPC non-authoritative. Retaining Container source/image is not evidence that the Container path is active or rollback-capable.
- Verify catalog/grant/policy/function structure only.

### Phase 3: owner-binding population

- Requires a separately approved private-data operation.
- Produce only reviewed counts/statuses: eligible Auth users, bound Auth users, missing Auth-user bindings, unbound authority rows, conflicts, and invalid rows.
- Backfill the fixed binding relation from the reviewed Auth-user population and repository-compatible reference derivation in one approved database-local operation.
- Abort on any ambiguity, duplicate owner/reference, unbound authority row, or need to display/export a private value.
- Require `eligible Auth users = bound Auth users`, `missing Auth-user binding = 0`, `unbound authority row = 0`, and `binding conflict = 0` before shadow proof or cutover. These are migration blockers, not runtime `missing` cases.
- Prove the Auth-user forward trigger before any new billing intent is allowed: same user-creation transaction, atomic one-to-one insert, immutable binding, duplicate/conflict rejection, and zero binding material in browser/output/logs.
- Prove the signed-evidence writer rejects new unbound references and cannot change an existing owner binding.
- Prove account deletion retains the old binding without automatic delete/recycle and re-registration receives a distinct binding without automatic reassignment.

### Phase 4: shadow proof

- Invoke the new RPC for one approved authenticated tester using the fixed reducer.
- Compare only fixed projection states and aggregate counts; never compare or export raw rows.
- Keep Checkout, Portal, webhook mutation, provider execution, and public paid launch closed.
- No automatic retry.

### Phase 5: read cutover

- Switch the C1 read consumer to the per-request JWT RPC.
- Approve at least the Container-independent Free-only safety rollback before cutover.
- Treat the retained Container path as an optional rollback only if exact deployed revision, binding, secret/runtime availability, and one production read have separately passed.
- Remove read-path access to `SUPABASE_SERVICE_ROLE_KEY`.
- Do not claim whole-Worker secret removal until the mutation-plane decision is complete and separately verified.

### Phase 6: cleanup

- Requires separate approval after production proof.
- Remove Container/DO/config/dependency/image references only after confirming rollback is no longer required and no other consumer exists.
- Cleanup must not be bundled with activation or public launch.

## Rollback Boundaries

### Rollback A: Free-only safety stop

This is the mandatory rollback and does not depend on Containers:

1. revoke `authenticated EXECUTE` on the new RPC;
2. disable the new read consumer under the approved application rollback;
3. map every paid billing read to `unavailable/null`;
4. keep Free available and Paid disabled;
5. verify zero new-schema calls and retain signed authority rows unchanged;
6. remove `comment_translator_api` from exposed schemas only under separate remote configuration approval after the consumer is stopped.

Do not drop the schema or objects as an inferred rollback.

### Rollback B: conditional Container restoration

Switching to the previous Container read is permitted only if, before cutover:

- the exact deployed Container revision is confirmed;
- the binding and Container/DO configuration are confirmed;
- required secret/runtime availability is confirmed without private output;
- one sanitized production Container read proof passes.

Without all four proofs, the Container path is retained source/evidence only and is not rollback authority.

- If owner binding is incomplete or ambiguous: do not delete or rewrite authority rows; disable the new read and retain fail-closed Free behavior.
- Do not bulk grant tables, restore broad default privileges, disable RLS, remove signed evidence, rewrite billing state, or infer a database cleanup.
- If the dedicated role or function ownership is wrong: revoke RPC execution first, then remediate under a new migration.
- Rollback produces only sanitized status/count evidence.

## Test Strategy

### Static migration/catalog tests

- RPC has zero arguments and exactly two output columns.
- RPC resolves only through the explicitly selected `comment_translator_api` schema.
- Schema owner is the reviewed trusted migration-controlled `NOLOGIN NOINHERIT` role and retains only its declared owner capabilities; untrusted/runtime roles lack schema `CREATE`.
- `authenticated` has schema `USAGE`, no schema `CREATE`, and only the intended RPC `EXECUTE`.
- Default routine privileges cannot expose later functions to `PUBLIC`, `anon`, `authenticated`, or `service_role`.
- `pg_auth_members` proves no inbound/outbound membership, inheritance, `ADMIN OPTION`, or runtime role-assumption path for the schema owner or reader role.
- Dedicated roles are not members of stronger roles, and the reader has no unexpected grant or owned object.
- The API schema contains exactly the reviewed RPC set and no unexpected routine.
- Catalog state proves the create/replace, search-path, final ownership transfer, revoke, and grant order reached the intended final owner/ACL.
- Function is `SECURITY DEFINER`, has the reviewed owner, and fixed empty `search_path`.
- Function owner is `NOLOGIN NOBYPASSRLS` and is not the authority table owner.
- Binding and authority relations both have RLS enabled and forced.
- The binding policy uses `auth.uid()` and the immutable owner column; the authority policy admits only the authority row joined through that caller-owned binding.
- `PUBLIC`/`anon` lack execute; `authenticated` has only RPC execute.
- `authenticated` lacks direct authority/binding relation access.
- Existing service-only mutation function grants and signed-evidence constraints remain unchanged.

### Database behavior tests

- owner A active row -> A receives `available/paid-active`;
- owner B cannot observe A's row and receives only B's own `missing` or state;
- valid inactive and expired states -> `available/paid-inactive`;
- binding exists with no authority row -> `missing/null`;
- missing caller binding after cutover -> `unavailable/null`;
- any global unbound/conflicting authority fixture blocks cutover and is never reduced to caller `missing`;
- malformed/unsigned/inconsistent fixtures -> `unavailable/null`;
- anonymous and invalid JWT calls cannot execute;
- response is exactly one row and two fields;
- table/view direct access is denied;
- stale/replayed mutation evidence remains ignored by the existing writer.
- existing-row backfill and forward binding both enforce one-to-one immutable owner/reference cardinality;
- a new signed-evidence row without a forward binding is rejected and cannot become readable/active;
- duplicate/conflicting forward binding, deletion, and re-registration cases remain fail closed without automatic reassignment.
- an Auth-user creation and binding insert succeed or fail in the same database transaction;
- source status `trialing` remains `available/paid-inactive`, matching the reviewed current writer/read policy even if the looser table constraint could represent `trialing/paid-active`.

### Application contract tests

- signed-out, recovery-pending, and auth-unavailable paths make zero RPC calls;
- paid-active is the only Paid-enabling input;
- missing maps to Free;
- paid-inactive/unavailable/error/timeout/malformed response maps to Free plus paid-inactive posture;
- extra fields, identifiers, timestamps, arrays, multiple rows, invalid combinations, and raw errors are rejected;
- one call, one deadline, zero automatic retry;
- no Checkout/Stripe/provider/mutation call occurs;
- response/cache/log/browser-storage boundary remains private and no-store.

### Negative security tests

- caller-supplied owner/reference parameters are impossible;
- `user_metadata` changes cannot influence the result;
- owner cross-read attempts remain indistinguishable from the caller's allowed fixed outcomes;
- function resolution cannot be redirected through `search_path`;
- an accidental broad grant is caught by the catalog contract;
- a `postgres`/`service_role`/table-owner function owner is rejected;
- RLS-disabled or non-forced state is rejected;
- a revoked/deleted/expired session cannot produce `paid-active` under the selected freshness policy.
- no runtime role can assume the schema-owner or reader role;
- no unexpected routine can be created or executed through the exposed API schema.

## Production Proof

A later production proof is approval-gated and must stop at the first blocker:

1. Confirm exact deployed application revision.
2. Confirm exact applied migration identity.
3. Confirm sanitized schema/function/grant/RLS/owner-role presence.
4. Confirm schema-specific client resolution, schema `USAGE`/`CREATE` ACL, routine default privileges, and Data API exposure state.
5. Confirm all-existing-Auth-user backfill and Auth-user forward-trigger readiness with count-only evidence, including equal eligible/bound counts, zero missing Auth-user bindings, zero unbound authority rows, and zero binding conflicts.
6. Confirm Free-only safety rollback is approved; classify Container rollback as ready only if its separate production proof passed.
7. Invoke one same-origin authenticated fixed reducer for one allowed tester.
8. Accept only the two-field projection and fixed call/count/status evidence.
9. Run an owner-isolation negative case without outputting either owner or row.
10. Run inactive/missing/unavailable cases using approved safe fixtures or pre-existing states.
11. Confirm Free remains usable in every non-active case.
12. Confirm zero Container/DO/process calls and zero read-path service-role use after cutover.
13. Confirm zero Checkout, Stripe SDK, Customer, Portal, webhook mutation, provider, deploy follow-up, CP2, or public-launch action.

Allowed evidence fields are limited to:

```text
reviewed_revision_status
reviewed_migration_status
rpc_presence_status
grant_policy_owner_status
role_membership_status
unexpected_routine_count
binding_backfill_status
missing_auth_user_binding_count
unbound_authority_count
binding_conflict_count
forward_trigger_status
request_count
result_status
billing_state
free_behavior_status
old_read_invocation_count
container_do_process_invocation_count
read_service_role_use_count
unexpected_field_count
error_class
timeout_status
free_only_rollback_status
container_rollback_proof_status
project_health_status
pass_fail_blocked
```

## Observability

- Emit only fixed operational classes such as `auth-unavailable`, `rpc-unavailable`, `rpc-permission`, `rpc-timeout`, `rpc-invalid-shape`, and `rpc-pass`.
- Record aggregate counts and latency buckets without user, session, owner, billing, project, account, or row dimensions.
- Never log request headers, cookies, JWTs, Supabase errors containing private details, RPC raw bodies, table rows, SQL text with values, or identifiers.
- Alert on unavailable-rate increase, invalid-shape occurrence, permission/schema-cache failures, and database-size/egress thresholds.
- Treat `missing` as a normal business state, not an infrastructure error.
- Keep mutation/webhook observability separate from read observability.
- Use a separate read-only Supabase control-plane health check for project availability. Its only retained state is `healthy`, `paused`, `unavailable`, or `unknown`; it must not include project/account identifiers, billing state, users, sessions, raw responses, or raw errors.
- The `supabase-project-operator` owns pause detection and an approval-gated restore action. The `repository-deployment-owner` owns revision, schema-cache, grant/RLS, and authenticated RPC smoke verification after service health returns.
- The first confirmed `paused` or externally `unavailable` state opens an incident and blocks Paid activation or reactivation immediately. Monitoring cadence and a time-based recovery objective must be explicitly approved before production activation; this design does not invent either value.

## Supabase Free Plan Constraints

Current official documentation checked on 2026-07-30 lists:

- 500 MB database size per Free project;
- 5 GB egress;
- 50,000 monthly active users;
- two Free projects across organizations owned/administered by the user;
- automatic pause risk for insufficient activity over a seven-day period;
- a documented restoration window after pause.

Design consequences:

- The RPC must be one indexed owner lookup with a constant two-field response.
- Owner-binding indexes and row growth must be included in database-size monitoring.
- Do not poll billing state in the background. Read on an authenticated billing/session decision boundary and reuse only within the same uncached request.
- A paused/unavailable project maps to `unavailable/null`, keeps Free available, and never activates Paid from cache.
- Free-plan pause/restore and platform quotas are availability risks, not reasons to fail open.
- Limits and pause policy are external authority and must be refreshed before implementation/activation.
- The external project-health check is operational availability monitoring, not a billing-state read, and must remain read-only and identifier-free.
- Restore procedure is fixed: detect and classify the pause; block Paid cutover/reactivation; obtain separate approval for the Supabase restore action; wait for `healthy`; verify the exact application revision, migration identity, API exposure, schema cache, grants, RLS, function owner/configuration, role membership, and binding invariants; run one approved authenticated fixed-projection RPC smoke; re-enable Paid only after every gate passes.
- A restore action alone is not proof that the Data API schema cache, RPC grants, RLS, owner binding, or application revision is ready.
- If the Free plan cannot meet the explicitly approved monitoring/recovery objective, or if a project pause occurs while public Paid service is active, Paid activation/reactivation remains blocked until the release owner explicitly chooses and approves either an upgraded Supabase plan or continued Free-plan risk. No automatic upgrade or remote operation is authorized by this design.

## Staged Acceptance Criteria

The design is accepted for implementation planning only when:

1. reviewers approve Option C and the constrained definer-role model;
2. the fixed `comment_translator_private.paid_entitlement_owner_bindings` relation, all-existing-Auth-user backfill, same-transaction Auth-user forward trigger, writer guard, immutability, uniqueness, deletion retention, and re-registration behavior are approved;
3. the mutation-plane boundary for final Worker secret removal is explicit;
4. the RPC schema/exposure choice is explicit;
5. the exact fixed projection and mapping table are unchanged;
6. session freshness and request deadline policies are explicit;
7. the current active-only activation rule, including `trialing -> paid-inactive`, is re-verified and accepted as preservation of current behavior;
8. schema-owner inherent capability, routine-creator/default-privilege controls, role-membership closure, and unexpected-object rejection are explicit;
9. mandatory Free-only safety rollback and conditional Container rollback are reviewed as separate paths;
10. project-health ownership, restore/smoke runbook, monitoring cadence, recovery objective, and Free-plan upgrade decision criterion are explicitly approved;
11. migration, proof, rollback, cleanup, restore, and activation remain separately approval-gated;
12. Checkout/Stripe/public-launch work remains out of scope.

Production activation is accepted only when:

- exact schema owner/ACL/default privileges/exposure/grant/RLS/function-owner proof passes;
- eligible and bound existing Auth-user counts match, missing Auth-user bindings are zero, owner binding is complete for every authority row, forward binding is proven for new Auth users, unbound authority rows and conflicts are both zero, and the writer rejects unbound references;
- owner isolation and all fail-closed cases pass;
- the application uses the caller JWT with no read service-role use;
- runtime roles cannot assume, inherit, or administer the schema-owner or reader role, and no unexpected exposed routine or owned object exists;
- `trialing` and every other non-active/expired source state produce `available/paid-inactive`;
- Free remains available for every non-active/unavailable outcome;
- the approved project-health monitor and pause restore/smoke runbook are operational, with an explicit monitoring cadence, recovery objective, and upgrade decision criterion;
- Free-only safety rollback is ready; Container rollback is not claimed unless its separate revision/configuration/runtime and one-read production proof passes;
- a separate release owner explicitly authorizes later activation.

## Official Supabase References

Checked on 2026-07-30:

- [Breaking Change: Tables not exposed to Data and GraphQL API automatically](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- [Securing your API](https://supabase.com/docs/guides/api/securing-your-api)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [User Sessions](https://supabase.com/docs/guides/auth/sessions)
- [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Using Custom Schemas](https://supabase.com/docs/guides/api/using-custom-schemas)
- [About billing on Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)

## Out Of Scope

- Code, config, manifest, lockfile, dependency, migration file, or generated artifact changes.
- Migration apply, SQL execution, database inspection, advisor execution, or schema-cache reload.
- Cloudflare/Supabase/Stripe remote operation.
- Container/DO/process cleanup.
- Checkout, Stripe SDK initialization, Product/Price/Customer/Subscription/Portal, webhook mutation, or billing activation.
- CP2, deploy, promotion, public access change, or Creator public paid launch.
- Secrets, tokens, cookies, raw rows, raw errors, private identifiers, signed-evidence payloads, hashes, or partial disclosures in evidence or reports.
