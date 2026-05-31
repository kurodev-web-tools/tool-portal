# Kuro Live Comment Translator YouTube Token Store Blocker Resolution

Status: blocker resolution plan for `codex/comment-translator-preview`.

PR #271 merged the YouTube OAuth token store + consent runtime foundation into `codex/comment-translator-preview`. This memo converts the blocker list from `lib/comment-translator-youtube-oauth-token-store-foundation.ts` into implementation decision units. It is proposal only: no token persistence, no Supabase schema, no migration, no RLS policy, no storage key change, no OAuth token value handling, and no Google API live call are added here.

## Scope

- Keep OAuth access token and refresh token values out of client components, fixtures, task docs, PR body, localStorage, and IndexedDB.
- Keep owner verification, owned broadcast lookup, Live Chat polling step, and sanitized comment bridge separate from translation provider modules.
- Keep client components from calling Google API, provider modules, or polling runtime directly.
- Preserve DeepL provider prototype, MockTranslationProvider, Manual / Paste Input MVP, interactive shell, storage payloads, IndexedDB keys, localStorage keys, Supabase schema, migrations, RLS policy, and handoff payloads.
- Record safe live smoke conditions and the unchecked scope because live smoke is not run in this slice.

## Blocker Resolution Decisions

| Blocker | Decision unit | Proposed resolution | Required approval before implementation |
|---|---|---|---|
| schema approval | Approve credential record ownership, minimum metadata, RLS posture, migration rollout, and rollback. | Proposal only. A separate approved migration must define a server-owned YouTube credential table, owner binding, credential reference id, scope set, expiry metadata, revoked state, and encrypted token ciphertext fields without exposing token values to browser clients. | Product and data-owner approval for table shape, RLS posture, migration order, rollback path, and no browser-readable token material. |
| key management | Choose encryption boundary, managed secret or KMS owner, rotation semantics, and decrypt access. | Use a server-only envelope. The implementation must choose managed secret or KMS handling, rotation cadence, versioned key metadata, and a no-client-decrypt rule. | Security approval for managed secret or KMS selection, rotation procedure, emergency disable path, and secret handling rules. |
| token refresh | Define refresh timing, expiry states, bounded retry, backoff, concurrent refresh locking, and user-visible failure states. | Refresh should be server-only, triggered before expiry or on expired reference resolution, use bounded retry with backoff, avoid direct provider coupling, and mark terminal failures as expired or reconnect-required. | Runtime approval for expiry thresholds, retry/backoff limits, lock behavior, terminal expired states, and no quota or billing write in the refresh path. |
| revocation | Define broadcaster disconnect behavior, Google revoke handling, local cleanup, and post-revocation user state. | Disconnect should be server-only, mark the credential revoked before or with cleanup, call the provider revoke endpoint only from trusted runtime code when approved, and remove or invalidate encrypted token material after bounded cleanup. | Product and security approval for disconnect UX state, revoke endpoint usage, cleanup order, retry policy, and failure display. |
| audit log | Define which sensitive token-store actions need audit events and which fields are allowed without token material. | Record event type, owner reference, credential reference id, non-secret status, timestamp, and failure class only. Never record OAuth access tokens, refresh tokens, authorization codes, raw Google responses, or private credentials. | Privacy and security approval for allowed event fields, retention period, redaction rules, and whether audit storage needs a separate schema PR. |
| retention policy | Define credential lifetime, stale credential cleanup, revoked credential cleanup, and account deletion behavior. | Keep encrypted token records only while broadcaster connection is active, clean up stale or revoked credentials on a documented schedule, and delete credential material during account deletion or explicit disconnect cleanup. | Privacy and product approval for active credential lifetime, stale cleanup timing, revoked cleanup timing, and account deletion behavior. |
| safe live smoke approval | Define safe test YouTube owner account, endpoints, credential handling, logging limits, and abort conditions. | Safe live smoke may only run after explicit approval for a safe test YouTube owner account, server-only token handling, read-only scope, and bounded calls to `channels.list`, `liveBroadcasts.list`, and one `liveChatMessages.list` step with no token printing. | User approval for the safe test owner account, target endpoints, no-print credential handling, and documented unchecked scope. |

Each decision remains `blocked-until-approved` and requires a separate implementation PR.

## Implementation Readiness

`assessYouTubeEncryptedTokenStoreImplementationReadiness([])` returns `blocked` with the missing blocker ids and required approvals. Passing every blocker id only returns `ready-for-separate-implementation-pr`; it does not enable token persistence inside this PR.

The current plan status is `blocked-until-approvals-and-separate-implementation`.

## Schema/Key Approval Checkpoint

`youtubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint` narrows the next decision to only `schema-approval` and `key-management`. The checkpoint status is `proposal-only-pending-explicit-approval`: it records what must be approved before an implementation PR can exist, but it still does not allow token persistence, schema mutation, migration, RLS policy, storage key changes, client storage changes, provider coupling, quota writes, or Google API live calls in this PR.

### Approvers And Confirmation Items

| Area | Required approvers | Confirmation items |
|---|---|---|
| Schema | Product owner, Data owner | Server-owned YouTube credential table ownership model; owner binding and credential reference id semantics; RLS posture that never exposes token material to browser clients; migration rollout order and rollback path; no existing storage key, payload, IndexedDB key, localStorage key, handoff payload, or quota write change. |
| Key management | Security owner | Managed secret or KMS owner selection; server-only envelope and decrypt access boundary; rotation cadence and versioned key metadata; emergency disable and incident handling path; no client decrypt, no secret printing, and no privileged server key exposure. |
| Approved migration PR | Product owner, Data owner, Security owner | The migration PR must target `codex/comment-translator-preview`, stay separate from this proposal-only PR, and contain no OAuth token values or private credentials in code, task docs, PR body, fixtures, browser storage, or client components. |

### Proposal-Only Conditions

Keep the work proposal-only when any of these remain true:

- schema/RLS/table shape approval is missing or incomplete;
- managed secret or KMS owner and rotation policy are not approved;
- safe live smoke owner/account/endpoints are not approved;
- migration rollback or data-owner review is pending;
- implementation would touch Supabase schema, migration, RLS, storage keys, payloads, browser storage, provider coupling, or quota writes in this PR.

### Approved Migration PR Conditions

Only move to a separate approved migration PR when all of these are true:

- product and data-owner approve table shape, RLS posture, migration order, and rollback;
- security approves managed secret/KMS selection, rotation procedure, emergency disable path, and no client decrypt;
- the migration PR targets `codex/comment-translator-preview` and is reviewed independently;
- no OAuth token values or private credentials appear in the migration PR, task docs, PR body, fixtures, browser storage, or client components;
- Google API live smoke remains separate until safe live smoke conditions are satisfied.

### Safe Live Smoke Gate

Safe live Google API smoke remains not run in this slice. It can only run after explicit user approval for a safe test YouTube owner account, a server-only token resolver, encrypted server token store review, read-only YouTube OAuth scope, bounded calls to `channels.list`, `liveBroadcasts.list`, and one `liveChatMessages.list` step, and no OAuth token value in client components, fixtures, task docs, PR body, localStorage, or IndexedDB.

Unchecked scope while this gate is closed: no safe live YouTube login / OAuth smoke, no owner verification smoke, no owned broadcast lookup smoke, no Live Chat polling smoke, and no Google API live call.

## Approved Migration Proposal Gate

PR #273 is merged into `codex/comment-translator-preview`, but the current task/docs/PR context does not contain explicit Product owner, Data owner, or Security owner approval. The gate status is `blocked-missing-explicit-owner-approvals`.

This keeps the work proposal-only. It does not allow token persistence, Supabase schema mutation, migration, RLS policy changes, storage key changes, client storage changes, provider coupling, quota writes, or Google API live calls in this PR.

### Approval Collection Note

- Product owner approval for table shape, RLS posture, migration order, and rollback is still required.
- Data owner approval for browser-unreadable token material and rollback is still required.
- Security owner approval for managed secret or KMS selection, rotation, emergency disable, and no client decrypt is still required.

### Migration Proposal Conditions

- The separate migration PR must target `codex/comment-translator-preview`.
- The separate migration PR must receive independent review for schema shape, RLS posture, key management, and rollback plan.
- No OAuth token values or private credentials may appear in code, task docs, PR body, fixtures, browser storage, or client components.
- Google API live smoke remains separate until safe live smoke conditions are satisfied.

### Rollback Plan

- Disable credential resolution before rollback if token resolution is deployed.
- Revert migration through a reviewed database rollback path.
- Keep no token value logging during rollback or investigation.
- Revoke or invalidate credential references if rollback leaves unusable credential rows.

## Safe Live Smoke

Safe live Google API smoke is not run in this slice.

It remains blocked until all of these are true:

- explicit user approval for a safe test YouTube owner account;
- server-only token resolver implementation that can obtain token material without returning it to callers;
- encrypted server token store implemented and reviewed without hidden schema changes;
- read-only YouTube OAuth scope only;
- bounded live smoke plan for `channels.list`, `liveBroadcasts.list`, and one `liveChatMessages.list` step;
- no OAuth token value in client components, fixtures, task docs, PR body, localStorage, or IndexedDB.

Unchecked scope for this PR: no safe live YouTube login / OAuth / owner verification / Live Chat polling smoke, no Google API live call, and no token persistence runtime.

## Explicit Approval Collection

PR #274 is merged into `codex/comment-translator-preview`, but the current task/docs/PR context still does not contain explicit Product owner, Data owner, or Security owner approval. The approval collection status is `blocked-missing-explicit-owner-approvals`.

This slice is an approval-evidence-only checkpoint. It records the approval inventory, blocker summary, and required confirmation items, but it does not allow token persistence, Supabase schema mutation, migration, RLS policy changes, storage key changes, client storage changes, provider coupling, quota writes, or Google API live calls.

### Evidence Inventory

| Role | Current evidence | Status |
|---|---|---|
| Product owner | No explicit approval in task/docs/PR context for table shape, RLS posture, migration order, rollback, or disconnect UX readiness. | Missing |
| Data owner | No explicit approval in task/docs/PR context for browser-unreadable token material, audit/retention fields, rollback, or account deletion cleanup. | Missing |
| Security owner | No explicit approval in task/docs/PR context for managed secret or KMS selection, rotation, emergency disable, server-only decrypt access, or no client decrypt. | Missing |

### Blocker Summary

- Product owner explicit approval is missing.
- Data owner explicit approval is missing.
- Security owner explicit approval is missing.
- Migration readiness remains blocked until all three explicit approvals are recorded in reviewable task/docs/PR context.

### Required Confirmation Items

- Product owner: approve the server-owned YouTube credential table shape, owner binding semantics, RLS posture, migration order, rollback path, disconnect/revocation user state, and no existing storage key, payload, IndexedDB key, localStorage key, handoff payload, or quota write change.
- Data owner: approve browser-unreadable token material, credential-reference-only browser state, allowed audit fields, retention period, stale/revoked cleanup timing, rollback handling, and account deletion cleanup.
- Security owner: approve managed secret or KMS ownership, server-only envelope handling, decrypt access boundary, rotation cadence, versioned key metadata, emergency disable path, incident handling, no client decrypt, no secret printing, and no privileged server key exposure.

### Migration Readiness

Migration readiness remains `blocked-until-explicit-owner-approvals`. If Product owner, Data owner, and Security owner approvals are later recorded, this PR may only record approval evidence and readiness for a separate approved migration PR. The separate migration PR must target `codex/comment-translator-preview`, receive independent review, and keep OAuth token values and private credentials out of code, task docs, PR body, fixtures, browser storage, and client components.

### Safe Live Smoke

Safe live Google API smoke is not run for explicit approval collection. It remains blocked until there is explicit approval for a safe test YouTube owner account, server-only token resolver implementation, encrypted server token store review, read-only YouTube OAuth scope, bounded calls to `channels.list`, `liveBroadcasts.list`, and one `liveChatMessages.list` step, and no OAuth token value in client components, fixtures, task docs, PR body, localStorage, or IndexedDB.

Unchecked scope while this gate is closed: no safe live YouTube login / OAuth / owner verification / Live Chat polling smoke, no Google API live call, and no token persistence runtime.

## Separate Approved Migration Readiness

PR #275 is merged into `codex/comment-translator-preview`. After reviewing the current proposal/contract-only state, the task/docs/PR context now records Product owner, Data owner, and Security owner approval to proceed to a separate migration readiness PR. The approval state is `readiness-approved-not-migration-implementation`.

This approval is readiness-only. It allows approval evidence review, separate migration PR readiness, rollback review gate confirmation, and safe live smoke gate confirmation. It does not allow OAuth token persistence, token refresh, token revocation, encrypted token store implementation, Supabase schema mutation, migration, RLS policy changes, storage key changes, client storage changes, provider coupling, quota writes, billing integration, or Google API live calls in this PR.

### Readiness Approval Evidence

| Role | Approval scope | Status |
|---|---|---|
| Product owner | Approved table shape, RLS posture, migration order, rollback, disconnect/revocation UX, and no existing storage key/payload/IndexedDB/localStorage/handoff payload/quota write change for readiness review only. Actual migration is not approved here. | Approved for readiness |
| Data owner | Approved browser-unreadable token material, credential-reference-only browser state, audit fields, retention, rollback, account deletion cleanup, and no token values/auth codes/raw Google responses/private credentials in code/docs/fixtures/PR body/browser storage for readiness review only. Final table/RLS implementation is not approved here. | Approved for readiness |
| Security owner | Approved managed secret or KMS review, server-only decrypt, no client decrypt, no secret printing, rotation, emergency disable, and privileged key exposure controls for readiness review only. Production token persistence and live credential handling are not approved here. | Approved for readiness |

### Readiness Note

- Approval evidence is sufficient to draft a separate migration readiness PR.
- Actual Supabase migration and RLS implementation stay out of this PR.
- The separate migration PR must target `codex/comment-translator-preview` and receive independent review.
- Final table and RLS implementation review is still required before applying any migration.
- OAuth token values and private credentials must remain out of code, task docs, PR body, fixtures, browser storage, and client components.

### Rollback Review Gate

Rollback remains `review-required-before-migration-implementation`. The separate migration PR must review:

- disable credential resolution before rollback if token resolution is deployed;
- reviewed database rollback path;
- no token value logging during rollback or investigation;
- revoke or invalidate credential references if rollback leaves unusable credential rows.

### Safe Live Smoke Gate

Safe live Google API smoke is not run for this readiness PR. It remains blocked until there is explicit approval for a safe test YouTube owner account, server-only token resolver implementation, encrypted server token store review, read-only YouTube OAuth scope, bounded calls to `channels.list`, `liveBroadcasts.list`, and one `liveChatMessages.list` step, and no OAuth token value in client components, fixtures, task docs, PR body, localStorage, or IndexedDB.

Unchecked scope while this gate is closed: no safe live YouTube login / OAuth / owner verification / Live Chat polling smoke, no Google API live call, no token persistence runtime, and no Supabase migration or RLS smoke.

## Non-Goals

- No OAuth token persistence.
- No token refresh implementation.
- No token revocation implementation.
- No encrypted token store implementation.
- No Supabase schema.
- No migration.
- No RLS policy.
- No localStorage.
- No IndexedDB.
- No client component Google API call.
- No client component provider call.
- No polling runtime change.
- No direct provider import.
- No quota write.
- No billing integration.

## Next PR Candidate

The next implementation PR should not start until the decision owners approve the required items. A reasonable next slice is a dedicated encrypted token store schema/key-management approval PR that contains either:

1. a proposal-only approval artifact if schema/key details still need review, or
2. a separate approved migration PR if schema, RLS posture, rollback, and key-management policy are explicitly approved.

Until then, token persistence remains blocked.
