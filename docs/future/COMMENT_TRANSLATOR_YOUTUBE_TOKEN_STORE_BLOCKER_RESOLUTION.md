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

## Separate Approved Migration PR Final Review Blocker

PR #276 is merged into `codex/comment-translator-preview`, so the next PR can review the separate approved migration shape. The final implementation review is still `final-table-rls-key-management-review-required` / `blocked-pending-final-table-rls-key-management-review`.

This PR is contract-only. It records the table shape, RLS posture, migration order, rollback, managed secret or KMS, Rotation, Emergency disable, and No client decrypt review package. It does not add a Supabase migration, RLS policy, token persistence, runtime token resolver write, Google API live call, client storage change, provider coupling, or quota write.

### Table Shape Candidate

- Table name: `youtube_oauth_credentials`.
- Ownership: server-owned rows bound to `owner_user_id`; browser state only receives a `credential_reference_id`.
- Non-secret metadata: provider, provider channel id, read-only YouTube OAuth scope set, expiry status, revoked state, timestamps, and key version.
- Encrypted fields: encrypted access token ciphertext reference and encrypted refresh token ciphertext reference. Token values, authorization codes, raw Google responses, and private credentials are not written to docs, fixtures, PR body, browser storage, or client components.

### RLS Posture

- RLS enabled before runtime use.
- No browser client policy can read or write token material.
- Trusted server runtime only may access encrypted credential rows.
- Any browser-readable state must be redacted and exclude ciphertext, raw credential fields, and decrypt capability.
- No client decrypt.

### Migration Order

1. Create table after final review.
2. Enable RLS before any token write.
3. Add indexes for owner and credential reference lookup.
4. Do not backfill live credentials.
5. Do not enable runtime token resolver writes before key-management review is complete.

### Key Management Review

- Choose managed secret or KMS before SQL or runtime writes.
- Use a server-only envelope decrypt boundary.
- Store key version metadata with each encrypted credential row.
- Define rotation with an old-key decrypt window and re-encrypt path.
- Add an emergency disable path for credential resolution and token writes.
- Preserve no client decrypt and no secret printing.

### Rollback Review

- Disable credential resolution before rollback if token resolution is deployed.
- Use a reviewed database rollback path.
- Keep no token value logging during rollback or investigation.
- Revoke or invalidate credential references if rollback leaves unusable credential rows.

### Final Review Gate

The migration implementation remains blocked until Product/Data/Security owners explicitly approve final table shape, RLS posture, key management, and rollback in reviewable task/docs/PR context. Even complete final review evidence only allows a follow-up explicit implementation approval before any SQL, migration, RLS policy, or token persistence runtime is added.

## Post-PR #277 Implementation Gate Review

PR #277 is merged into `codex/comment-translator-preview` with merge commit `fa6fbc5398c9d67358135d52583010e6311af4a2`.

The PR #277 check pattern is still Cloudflare Pages failed / Workers Builds passed. PR #275 and PR #276 had the same Pages fail / Workers pass history, so this remains an external Cloudflare Pages dashboard log review item rather than evidence of a local build blocker.

After reading `youtubeEncryptedTokenStoreSeparateApprovedMigrationPrReviewGate`, the implementation gate remains `blocked-pending-final-table-rls-key-management-review`. Explicit implementation approval is missing. The current review helper can move from final review collection to `request explicit implementation approval before SQL`, but that still does not authorize SQL in the same PR.

No SQL migration, No RLS policy, and No token persistence runtime may be added until final table shape, RLS posture, key management, rollback, and explicit implementation approval are all recorded in reviewable task/docs/PR context. The next allowed follow-up without those approvals is docs/contract-only approval evidence or blocker summary work.

## Post-PR #278 Final Implementation Approval Review

PR #278 is merged into `codex/comment-translator-preview` with merge commit `4a4e1e77a671e63600f846d8a537e90a9b9f870f`.

The PR #278 check pattern is still Cloudflare Pages failed / Workers Builds passed. PR #275, PR #276, and PR #277 had the same Pages fail / Workers pass history, so this remains an external Cloudflare Pages dashboard log review item rather than evidence of a local build blocker.

Current task/docs/PR context does not record final approval evidence for final table/RLS/key-management/rollback review and does not record explicit implementation approval. The approval collection status is `blocked-pending-final-table-rls-key-management-review` with `explicit implementation approval` still `missing`.

### Final Approval Evidence Inventory

| Area | Required evidence | Status |
|---|---|---|
| final table shape | Product/Data/Security review of `youtube_oauth_credentials`, owner binding, credential reference id semantics, non-secret metadata, encrypted ciphertext references, and no browser-readable token material. | Missing |
| final RLS posture | Product/Data/Security review that RLS is enabled before runtime use, browser clients cannot read or write token material, trusted server runtime is the only encrypted row accessor, redacted browser state excludes ciphertext, and no client decrypt is allowed. | Missing |
| key-management | Security review of managed secret or KMS selection, server-only envelope decrypt boundary, key version metadata, rotation with old-key decrypt window and re-encrypt path, emergency disable, and no secret printing. | Missing |
| rollback | Product/Data/Security review of disabling credential resolution before rollback, reviewed database rollback path, no token value logging during rollback or investigation, and revoke/invalidate behavior for unusable credential references. | Missing |
| explicit implementation approval | Explicit approval to open a separate implementation PR for SQL migration, RLS policy, and token persistence runtime after final review evidence is complete. | Missing |

### Implementation Gate Outcome

`assessYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReview([])` remains blocked with missing `table-shape`, `rls-posture`, `key-management`, and `rollback` review areas. If those four review areas are later approved but explicit implementation approval is still absent, the helper returns `blocked-pending-explicit-implementation-approval` and the next action is to collect explicit implementation approval before SQL.

If final table/RLS/key-management/rollback review and explicit implementation approval are all recorded later, this docs/contract-only PR still does not add SQL. The only allowed next action is a separate implementation PR for SQL migration, RLS policy, and token persistence runtime, still without token values, private credentials, client storage changes, provider coupling, quota writes, or Google API live calls.

No SQL migration, No RLS policy, and No token persistence runtime are added here. The next allowed follow-up while approval is missing is blocker summary or approval evidence collection only. The next separate implementation PR candidate, after all approvals are explicit, is `codex/comment-translator-youtube-token-store-migration-implementation-review`.

## Post-PR #279 Implementation Approval Evidence Review

PR #279 is merged into `codex/comment-translator-preview` with merge commit `3f542071b5542c651eaf01767cb28fb11cde8423`.

The PR #279 check pattern is still Cloudflare Pages failed / Workers Builds passed. PR #275, PR #276, PR #277, and PR #278 had the same Pages fail / Workers pass history, so this remains an external Cloudflare Pages dashboard log review item rather than evidence of a local build blocker.

Review of the current prompt, task docs, PR #279 body, PR #279 comments, and PR #279 reviews found no explicit approval evidence for final table/RLS/key-management/rollback review and no explicit implementation approval. The approval evidence status remains `missing`, and the implementation gate remains `blocked-pending-final-table-rls-key-management-review`.

### Missing Evidence Inventory

| Area | Required evidence before implementation | Status |
|---|---|---|
| final table shape | Explicit Product/Data/Security review of `youtube_oauth_credentials`, owner binding, credential reference id semantics, non-secret metadata, encrypted ciphertext references, and no browser-readable token material. | Missing |
| final RLS posture | Explicit Product/Data/Security review that RLS is enabled before runtime use, browser clients cannot read or write token material, trusted server runtime is the only encrypted row accessor, redacted browser state excludes ciphertext, and no client decrypt is allowed. | Missing |
| key-management | Explicit Security review of managed secret or KMS selection, server-only envelope decrypt boundary, key version metadata, rotation with old-key decrypt window and re-encrypt path, emergency disable, and no secret printing. | Missing |
| rollback | Explicit Product/Data/Security review of disabling credential resolution before rollback, reviewed database rollback path, no token value logging during rollback or investigation, and revoke/invalidate behavior for unusable credential references. | Missing |
| explicit implementation approval | Explicit approval to open a separate implementation PR for SQL migration, RLS policy, and token persistence runtime after final review evidence is complete. | Missing |

### Blocker Summary

`assessYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReview([])` remains blocked with missing `table-shape`, `rls-posture`, `key-management`, and `rollback` review areas. If those four review areas are later approved but explicit implementation approval is still absent, the helper returns `blocked-pending-explicit-implementation-approval`.

Because approval evidence is missing, this PR remains docs/contract-only. No SQL migration, No RLS policy, and No token persistence runtime are added. The next allowed follow-up is blocker summary / approval evidence collection, or a separate implementation PR only after final table/RLS/key-management/rollback review and explicit implementation approval are all recorded in reviewable task/docs/PR context.

## Post-PR #280 Explicit Implementation Approval Collection

PR #280 is merged into `codex/comment-translator-preview` with merge commit `2b692c7d3bf19071bc1afe8f650b9e3e315f316e`.

The PR #280 check pattern is still Cloudflare Pages failed / Workers Builds passed. PR #275, PR #276, PR #277, PR #278, and PR #279 had the same Pages fail / Workers pass history, so this remains an external Cloudflare Pages dashboard log review item rather than evidence of a local build blocker.

Review of the current prompt, task docs, PR #280 body, PR #280 comments, and PR #280 reviews found no explicit approval evidence for final table/RLS/key-management/rollback review and no explicit implementation approval. PR #280 itself records the missing evidence state and does not grant implementation authority.

### Missing Evidence Inventory

| Area | Required evidence before implementation | Status |
|---|---|---|
| final table shape | Explicit Product/Data/Security review of `youtube_oauth_credentials`, owner binding, credential reference id semantics, non-secret metadata, encrypted ciphertext references, and no browser-readable token material. | Missing |
| final RLS posture | Explicit Product/Data/Security review that RLS is enabled before runtime use, browser clients cannot read or write token material, trusted server runtime is the only encrypted row accessor, redacted browser state excludes ciphertext, and no client decrypt is allowed. | Missing |
| key-management | Explicit Security review of managed secret or KMS selection, server-only envelope decrypt boundary, key version metadata, rotation with old-key decrypt window and re-encrypt path, emergency disable, and no secret printing. | Missing |
| rollback | Explicit Product/Data/Security review of disabling credential resolution before rollback, reviewed database rollback path, no token value logging during rollback or investigation, and revoke/invalidate behavior for unusable credential references. | Missing |
| explicit implementation approval | Explicit approval to open a separate implementation PR for SQL migration, RLS policy, and token persistence runtime after final review evidence is complete. | Missing |

### Blocker Summary

`assessYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReview([])` remains blocked with missing `table-shape`, `rls-posture`, `key-management`, and `rollback` review areas. If those four review areas are later approved but explicit implementation approval is still absent, the helper returns `blocked-pending-explicit-implementation-approval`.

Because approval evidence is missing, this PR remains docs/contract-only. No SQL migration, No RLS policy, and No token persistence runtime are added. The next allowed follow-up is blocker summary / approval evidence collection, or a separate implementation PR only after final table/RLS/key-management/rollback review and explicit implementation approval are all recorded in reviewable task/docs/PR context. OAuth access token values, refresh token values, authorization code values, private credentials, and service role keys are not recorded.

## Post-PR #281 Approval Evidence Review

PR #281 is merged into `codex/comment-translator-preview` with merge commit `c7ddb6fd44459cff86ec80c500c029b52c90c83c`.

The PR #281 check pattern is still Cloudflare Pages failed / Workers Builds passed. PR #275, PR #276, PR #277, PR #278, PR #279, and PR #280 had the same Pages fail / Workers pass history, so this remains an external Cloudflare Pages dashboard log review item rather than evidence of a local build blocker.

Review of the current prompt, task docs, PR #281 body, PR #281 comments, and PR #281 reviews found no explicit approval evidence for final table/RLS/key-management/rollback review and no explicit implementation approval. PR #281 itself records the missing evidence state and does not grant implementation authority.

### Missing Evidence Inventory

| Area | Required evidence before implementation | Status |
|---|---|---|
| final table shape | Explicit Product/Data/Security review of `youtube_oauth_credentials`, owner binding, credential reference id semantics, non-secret metadata, encrypted ciphertext references, and no browser-readable token material. | Missing |
| final RLS posture | Explicit Product/Data/Security review that RLS is enabled before runtime use, browser clients cannot read or write token material, trusted server runtime is the only encrypted row accessor, redacted browser state excludes ciphertext, and no client decrypt is allowed. | Missing |
| key-management | Explicit Security review of managed secret or KMS selection, server-only envelope decrypt boundary, key version metadata, rotation with old-key decrypt window and re-encrypt path, emergency disable, and no secret printing. | Missing |
| rollback | Explicit Product/Data/Security review of disabling credential resolution before rollback, reviewed database rollback path, no token value logging during rollback or investigation, and revoke/invalidate behavior for unusable credential references. | Missing |
| explicit implementation approval | Explicit approval to open a separate implementation PR for SQL migration, RLS policy, and token persistence runtime after final review evidence is complete. | Missing |

### Blocker Summary

`assessYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReview([])` remains blocked with missing `table-shape`, `rls-posture`, `key-management`, and `rollback` review areas. If those four review areas are later approved but explicit implementation approval is still absent, the helper returns `blocked-pending-explicit-implementation-approval`.

Because approval evidence is missing, this PR remains docs/contract-only. No SQL migration, No RLS policy, and No token persistence runtime are added. The next allowed follow-up is blocker summary / approval evidence collection, or a separate implementation PR only after final table/RLS/key-management/rollback review and explicit implementation approval are all recorded in reviewable task/docs/PR context. OAuth access token values, refresh token values, authorization code values, private credentials, and service role keys are not recorded.

## Post-PR #282 Approval Evidence Review

PR #282 is merged into `codex/comment-translator-preview` with merge commit `324048b1e31aa756580987465b5e19ddd76a98c5`.

The PR #282 check pattern is still Cloudflare Pages failed / Workers Builds passed. PR #275, PR #276, PR #277, PR #278, PR #279, PR #280, and PR #281 had the same Pages fail / Workers pass history, so this remains an external Cloudflare Pages dashboard log review item rather than evidence of a local build blocker.

Review of the current prompt, task docs, PR #282 body, PR #282 comments, and PR #282 reviews found no explicit approval evidence for final table/RLS/key-management/rollback review and no explicit implementation approval. PR #282 itself records the missing evidence state and does not grant implementation authority.

### Missing Evidence Inventory

| Area | Required evidence before implementation | Status |
|---|---|---|
| final table shape | Explicit Product/Data/Security review of `youtube_oauth_credentials`, owner binding, credential reference id semantics, non-secret metadata, encrypted ciphertext references, and no browser-readable token material. | Missing |
| final RLS posture | Explicit Product/Data/Security review that RLS is enabled before runtime use, browser clients cannot read or write token material, trusted server runtime is the only encrypted row accessor, redacted browser state excludes ciphertext, and no client decrypt is allowed. | Missing |
| key-management | Explicit Security review of managed secret or KMS selection, server-only envelope decrypt boundary, key version metadata, rotation with old-key decrypt window and re-encrypt path, emergency disable, and no secret printing. | Missing |
| rollback | Explicit Product/Data/Security review of disabling credential resolution before rollback, reviewed database rollback path, no token value logging during rollback or investigation, and revoke/invalidate behavior for unusable credential references. | Missing |
| explicit implementation approval | Explicit approval to open a separate implementation PR for SQL migration, RLS policy, and token persistence runtime after final review evidence is complete. | Missing |

### Blocker Summary

`assessYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReview([])` remains blocked with missing `table-shape`, `rls-posture`, `key-management`, and `rollback` review areas. If those four review areas are later approved but explicit implementation approval is still absent, the helper returns `blocked-pending-explicit-implementation-approval`.

Because approval evidence is missing, this PR remains docs/contract-only. No SQL migration, No RLS policy, and No token persistence runtime are added. The next allowed follow-up is blocker summary / approval evidence collection, or a separate implementation PR only after final table/RLS/key-management/rollback review and explicit implementation approval are all recorded in reviewable task/docs/PR context. OAuth access token values, refresh token values, authorization code values, private credentials, and service role keys are not recorded.

## Post-PR #283 Approval Evidence Review

PR #283 is merged into `codex/comment-translator-preview` with merge commit `ae44280149febd40b474ad01d1afe09c8cb528cb`.

The PR #283 check pattern is still Cloudflare Pages failed / Workers Builds passed. PR #275, PR #276, PR #277, PR #278, PR #279, PR #280, PR #281, and PR #282 had the same Pages fail / Workers pass history, so this remains an external Cloudflare Pages dashboard log review item rather than evidence of a local build blocker.

Review of the current prompt, task docs, PR #283 body, PR #283 comments, and PR #283 reviews found no explicit approval evidence for final table/RLS/key-management/rollback review and no explicit implementation approval. PR #283 itself records the missing evidence state and does not grant implementation authority.

### Missing Evidence Inventory

| Area | Required evidence before implementation | Status |
|---|---|---|
| final table shape | Explicit Product/Data/Security review of `youtube_oauth_credentials`, owner binding, credential reference id semantics, non-secret metadata, encrypted ciphertext references, and no browser-readable token material. | Missing |
| final RLS posture | Explicit Product/Data/Security review that RLS is enabled before runtime use, browser clients cannot read or write token material, trusted server runtime is the only encrypted row accessor, redacted browser state excludes ciphertext, and no client decrypt is allowed. | Missing |
| key-management | Explicit Security review of managed secret or KMS selection, server-only envelope decrypt boundary, key version metadata, rotation with old-key decrypt window and re-encrypt path, emergency disable, and no secret printing. | Missing |
| rollback | Explicit Product/Data/Security review of disabling credential resolution before rollback, reviewed database rollback path, no token value logging during rollback or investigation, and revoke/invalidate behavior for unusable credential references. | Missing |
| explicit implementation approval | Explicit approval to open a separate implementation PR for SQL migration, RLS policy, and token persistence runtime after final review evidence is complete. | Missing |

### Blocker Summary

`assessYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReview([])` remains blocked with missing `table-shape`, `rls-posture`, `key-management`, and `rollback` review areas. If those four review areas are later approved but explicit implementation approval is still absent, the helper returns `blocked-pending-explicit-implementation-approval`.

Because approval evidence is missing, this PR remains docs/contract-only. No SQL migration, No RLS policy, and No token persistence runtime are added. The next allowed follow-up is blocker summary / approval evidence collection, or a separate implementation PR only after final table/RLS/key-management/rollback review and explicit implementation approval are all recorded in reviewable task/docs/PR context. OAuth access token values, refresh token values, authorization code values, private credentials, and service role keys are not recorded.

## Post-PR #285 Approval Evidence Review

PR #285 is merged into `codex/comment-translator-preview` with merge commit `18d6705f3f667b5625a609a7fcb0864868959ca5`.

The PR #285 check pattern is still Cloudflare Pages failed / Workers Builds passed. PR #275, PR #276, PR #277, PR #278, PR #279, PR #280, PR #281, PR #282, and PR #283 had the same Pages fail / Workers pass history, so this remains an external Cloudflare Pages dashboard log review item rather than evidence of a local build blocker.

Review of the current prompt, task docs, PR #285 body, PR #285 comments, and PR #285 reviews found no explicit approval evidence for final table/RLS/key-management/rollback review and no explicit implementation approval. PR #285 itself records the missing evidence state and does not grant implementation authority.

### Missing Evidence Inventory

| Area | Required evidence before implementation | Status |
|---|---|---|
| final table shape | Explicit Product/Data/Security review of `youtube_oauth_credentials`, owner binding, credential reference id semantics, non-secret metadata, encrypted ciphertext references, and no browser-readable token material. | Missing |
| final RLS posture | Explicit Product/Data/Security review that RLS is enabled before runtime use, browser clients cannot read or write token material, trusted server runtime is the only encrypted row accessor, redacted browser state excludes ciphertext, and no client decrypt is allowed. | Missing |
| key-management | Explicit Security review of managed secret or KMS selection, server-only envelope decrypt boundary, key version metadata, rotation with old-key decrypt window and re-encrypt path, emergency disable, and no secret printing. | Missing |
| rollback | Explicit Product/Data/Security review of disabling credential resolution before rollback, reviewed database rollback path, no token value logging during rollback or investigation, and revoke/invalidate behavior for unusable credential references. | Missing |
| explicit implementation approval | Explicit approval to open a separate implementation PR for SQL migration, RLS policy, and token persistence runtime after final review evidence is complete. | Missing |

### Blocker Summary

`assessYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReview([])` remains blocked with missing `table-shape`, `rls-posture`, `key-management`, and `rollback` review areas. If those four review areas are later approved but explicit implementation approval is still absent, the helper returns `blocked-pending-explicit-implementation-approval`.

Because approval evidence is missing, this PR remains docs/contract-only. No SQL migration, No RLS policy, and No token persistence runtime are added. The next allowed follow-up is blocker summary / approval evidence collection, or a separate implementation PR only after final table/RLS/key-management/rollback review and explicit implementation approval are all recorded in reviewable task/docs/PR context. OAuth access token values, refresh token values, authorization code values, private credentials, and service role keys are not recorded.

## Post-PR #287 Approval Evidence Review

PR #287 is merged into `codex/comment-translator-preview` with merge commit `a3419bb74e0596dabe41df0afa3149fa923f4e14`.

The PR #287 check pattern is still Cloudflare Pages failed / Workers Builds passed. PR #275, PR #276, PR #277, PR #278, PR #279, PR #280, PR #281, PR #282, PR #283, and PR #285 had the same Pages fail / Workers pass history, so this remains an external Cloudflare Pages dashboard log review item rather than evidence of a local build blocker.

Review of the current prompt, task docs, PR #287 body, PR #287 comments, and PR #287 reviews found no explicit approval evidence for final table/RLS/key-management/rollback review and no explicit implementation approval. PR #287 itself records the missing evidence state and does not grant implementation authority.

### Missing Evidence Inventory

| Area | Required evidence before implementation | Status |
|---|---|---|
| final table shape | Explicit Product/Data/Security review of `youtube_oauth_credentials`, owner binding, credential reference id semantics, non-secret metadata, encrypted ciphertext references, and no browser-readable token material. | Missing |
| final RLS posture | Explicit Product/Data/Security review that RLS is enabled before runtime use, browser clients cannot read or write token material, trusted server runtime is the only encrypted row accessor, redacted browser state excludes ciphertext, and no client decrypt is allowed. | Missing |
| key-management | Explicit Security review of managed secret or KMS selection, server-only envelope decrypt boundary, key version metadata, rotation with old-key decrypt window and re-encrypt path, emergency disable, and no secret printing. | Missing |
| rollback | Explicit Product/Data/Security review of disabling credential resolution before rollback, reviewed database rollback path, no token value logging during rollback or investigation, and revoke/invalidate behavior for unusable credential references. | Missing |
| explicit implementation approval | Explicit approval to open a separate implementation PR for SQL migration, RLS policy, and token persistence runtime after final review evidence is complete. | Missing |

### Blocker Summary

`assessYouTubeEncryptedTokenStoreSeparateApprovedMigrationPrReview([])` remains blocked with missing `table-shape`, `rls-posture`, `key-management`, and `rollback` review areas. If those four review areas are later approved but explicit implementation approval is still absent, the helper returns `blocked-pending-explicit-implementation-approval`.

Because approval evidence is missing, this PR remains docs/contract-only. No SQL migration, No RLS policy, and No token persistence runtime are added. The next allowed follow-up is blocker summary / approval evidence collection, or a separate implementation PR only after final table/RLS/key-management/rollback review and explicit implementation approval are all recorded in reviewable task/docs/PR context. OAuth access token values, refresh token values, authorization code values, private credentials, and service role keys are not recorded.

## Separate Implementation PR

PR #288 is merged into `codex/comment-translator-preview` with merge commit `48cad58019157cbc186b73ce19aee9698bdecdfa`. The current implementation PR is based on explicit Product owner / Data owner / Security owner approval for the final table shape, RLS posture, key-management, rollback review, and explicit permission to open a separate implementation PR for SQL migration, RLS policy, and token persistence runtime skeleton.

This implementation stays minimal and server-only. It adds a reviewable Supabase SQL migration for `youtube_oauth_credentials`, enables RLS enabled before runtime token write, grants encrypted row access only to trusted server runtime via `service_role`, and keeps browser clients without direct table access to token material, ciphertext references, or decrypt capability. Browser-visible state remains limited to a credential reference and sanitized status produced by server-only runtime code.

### Table / RLS Implementation Boundary

- Table: `youtube_oauth_credentials`.
- Owner binding: `owner_user_id` references `auth.users(id)`.
- Browser-safe reference: `credential_reference_id`.
- Provider metadata: `provider`, `provider_channel_id`, read-only YouTube OAuth `scope_set`, `scope_metadata`, expiry, and revoked state.
- Encrypted references: access and refresh token ciphertext references only. OAuth token values, authorization code values, raw Google response payloads, private credentials, and service role key values are not recorded.
- Key metadata: managed secret or KMS reference name plus key version metadata only.
- RLS policy: no anon or authenticated browser-client direct table access; trusted server `service_role` policy is the only explicit encrypted row accessor.

### Runtime Skeleton Boundary

The runtime module is `lib/comment-translator-youtube-token-store-runtime.ts` and starts with `import "server-only";`. It accepts ciphertext references and key reference metadata, persists through an injected trusted store boundary, and returns only `credentialReferenceId`, provider/channel metadata, scope, expiry, revoked state, and `never-returned-by-design` token markers. It does not perform refresh, Google API live calls, quota writes, billing integration, provider coupling, client decrypt, localStorage, or IndexedDB changes.

### Key-Management References

The implementation records only reference names:

- `YOUTUBE_OAUTH_TOKEN_STORE_KEY_REF`
- `YOUTUBE_OAUTH_TOKEN_STORE_KEY_VERSION`
- `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED`

No secret values are required, printed, committed, or documented. Managed secret / KMS selection and rotation remain operational configuration, with key version metadata stored per credential row.

### Rollback / Emergency Disable

- Use credential resolution disable before rollback if token resolution is deployed.
- Follow a reviewed database rollback path before removing or changing credential rows.
- Keep no token value logging during rollback or investigation.
- Revoke or invalidate unusable credential references if rollback leaves rows that cannot be resolved.

### Unchecked Scope

- No remote Supabase migration apply.
- No Supabase migration / RLS smoke.
- No Google API live call.
- No safe live YouTube login / OAuth / owner verification / Live Chat polling smoke.
- No refresh or revocation runtime beyond sanitized reference invalidation.
- No client component change.

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

The next implementation PR should not start until the decision owners approve the required items and explicit implementation approval is recorded. A reasonable next slice is a dedicated final implementation approval PR that contains either:

1. a docs/contract-only blocker summary if final table shape, RLS posture, key-management, rollback, or explicit implementation approval is still missing, or
2. a separate implementation PR only after final table shape, RLS posture, rollback, key-management policy, and explicit implementation approval are all recorded.

Until then, token persistence remains blocked.
