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

## Post Credential Status Display Final Approval Recheck

PR #322 is merged into `codex/comment-translator-preview` with merge commit `fe6ae5062c91157c50c762fea3a63cc87e8575c3`. The credential status display is now wired to the sanitized status action boundary, but this does not grant new authority for remote Supabase migration apply, server-only token persistence runtime beyond the existing skeleton, or Google API live smoke.

This post credential status display final approval recheck remains `blocked-pending-final-review`. Current task/docs/PR context does not newly record final table/RLS/key-management/rollback review evidence for the post-display state, and explicit implementation approval for remote apply or runtime expansion is still absent.

Required evidence before any follow-up implementation remains:

| Area | Required evidence | Current status |
| --- | --- | --- |
| final table shape | Explicit Product/Data/Security review of `youtube_oauth_credentials`, owner binding, credential reference id semantics, non-secret metadata, encrypted ciphertext references, and no browser-readable token material after PR #322 display wiring. | Missing |
| final RLS posture | Explicit Product/Data/Security review that RLS remains enabled before runtime use, browser clients cannot read or write token material, trusted server runtime is the only encrypted row accessor, and sanitized display output stays metadata-only. | Missing |
| key-management | Explicit Security review of managed secret or KMS selection, server-only envelope decrypt boundary, key version metadata, rotation, emergency disable, and no secret printing after display wiring. | Missing |
| rollback | Explicit Product/Data/Security review of disabling credential resolution before rollback, reviewed database rollback path, no token value logging, and revoke/invalidate behavior for unusable credential references. | Missing |
| explicit implementation approval | Explicit approval to open a separate PR for remote Supabase apply, server-only token persistence runtime expansion, or related implementation after final review evidence is complete. | Missing |

No remote Supabase migration apply, No Google API live smoke, No safe live YouTube OAuth smoke, and No runtime expansion are performed in this recheck. Owner authorization before status read, `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED`, opaque non-secret `credentialReferenceId`, and sanitized credential status metadata remain the only allowed client-readable boundary.

## Post-PR #323 Approval Evidence Collection

PR #323 is merged into `codex/comment-translator-preview` with merge commit `07b221999f302477645160278ae50f8ad3eb043c` at `2026-06-04T07:32:53Z`.

PR #323 context confirms Workers Builds success and Cloudflare Pages failure. The Pages failure is treated as `failure-known-pages-disconnect-noise`, consistent with the existing Pages disconnect noise pattern, so it is not implementation approval and does not override the blocker.

Review of current task/docs/PR #323 context found no new final table/RLS/key-management/rollback review evidence and no explicit implementation approval for remote Supabase apply, server-only token persistence runtime expansion, or Google API live smoke. The evidence collection state remains `missing-final-review-and-explicit-implementation-approval`.

Required evidence before any follow-up implementation remains:

| Area | Required evidence | Current status |
| --- | --- | --- |
| final table shape | Explicit Product/Data/Security review of `youtube_oauth_credentials`, owner binding, credential reference id semantics, non-secret metadata, encrypted ciphertext references, and no browser-readable token material after PR #323. | Missing |
| final RLS posture | Explicit Product/Data/Security review that RLS remains enabled before runtime use, browser clients cannot read or write token material, trusted server runtime is the only encrypted row accessor, and sanitized display output stays metadata-only. | Missing |
| key-management | Explicit Security review of managed secret or KMS selection, server-only envelope decrypt boundary, key version metadata, rotation, emergency disable, and no secret printing after PR #323. | Missing |
| rollback | Explicit Product/Data/Security review of disabling credential resolution before rollback, reviewed database rollback path, no token value logging, and revoke/invalidate behavior for unusable credential references. | Missing |
| explicit implementation approval | Explicit approval to open a separate PR for remote Supabase apply, server-only token persistence runtime expansion, or related implementation after final review evidence is complete. | Missing |

This PR is evidence-collection only. No remote Supabase migration apply, No server-only token persistence runtime expansion, No Google API live smoke, and No safe live YouTube OAuth smoke are performed. Owner authorization before status read, `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED`, opaque non-secret `credentialReferenceId`, and sanitized credential status metadata remain preserved.

## Post-PR #324 Final Implementation Approval Evidence Gate

PR #324 is merged into `codex/comment-translator-preview` with merge commit `7fd49532509cf634e220145eb143469f9bd4e49b` at `2026-06-04T10:57:23Z`.

PR #324 context confirms Workers Builds success and Cloudflare Pages failure. The Pages failure is treated as `failure-known-pages-disconnect-noise`, consistent with the existing Pages disconnect noise pattern, so it is not implementation approval and does not override the blocker.

Review of current task/docs/PR #324 context found no new final table/RLS/key-management/rollback review evidence and no explicit implementation approval for remote Supabase apply, server-only token persistence runtime expansion, or Google API live smoke. The final implementation approval evidence gate remains `missing-final-review-and-explicit-implementation-approval`.

Required evidence before any follow-up implementation remains:

| Area | Required evidence | Current status |
| --- | --- | --- |
| final table shape | Explicit Product/Data/Security review of `youtube_oauth_credentials`, owner binding, credential reference id semantics, non-secret metadata, encrypted ciphertext references, and no browser-readable token material after PR #324. | Missing |
| final RLS posture | Explicit Product/Data/Security review that RLS remains enabled before runtime use, browser clients cannot read or write token material, trusted server runtime is the only encrypted row accessor, and sanitized display output stays metadata-only. | Missing |
| key-management | Explicit Security review of managed secret or KMS selection, server-only envelope decrypt boundary, key version metadata, rotation, emergency disable, and no secret printing after PR #324. | Missing |
| rollback | Explicit Product/Data/Security review of disabling credential resolution before rollback, reviewed database rollback path, no token value logging, and revoke/invalidate behavior for unusable credential references. | Missing |
| explicit implementation approval | Explicit approval to open a separate PR for remote Supabase apply, server-only token persistence runtime expansion, or related implementation after final review evidence is complete. | Missing |

This PR is final implementation approval evidence-gate only. No remote Supabase migration apply, No server-only token persistence runtime expansion, No Google API live smoke, and No safe live YouTube OAuth smoke are performed. Owner authorization before status read, `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED`, opaque non-secret `credentialReferenceId`, and sanitized credential status metadata remain preserved.

## Post-PR #325 Final Approval Evidence Recheck

PR #325 is merged into `codex/comment-translator-preview` with merge commit `b97a39f3a32ecfef2024d2ceb3290aea35283ad5` at `2026-06-04T14:14:31Z`.

PR #325 context confirms Workers Builds success and Cloudflare Pages failure. The Pages failure remains `failure-known-pages-disconnect-noise`, consistent with the existing Pages disconnect noise pattern, so Workers Builds and local verification remain the actionable signals.

Review of current task/docs/PR #325 context found no new final table/RLS/key-management/rollback review evidence and no explicit implementation approval for remote Supabase apply, server-only token persistence runtime expansion, or Google API live smoke. The post-PR #325 final approval evidence recheck remains `missing-final-review-and-explicit-implementation-approval`.

Required evidence before any follow-up implementation remains:

| Area | Required evidence | Current status |
| --- | --- | --- |
| final table shape | Explicit Product/Data/Security review of `youtube_oauth_credentials`, owner binding, credential reference id semantics, non-secret metadata, encrypted ciphertext references, and no browser-readable token material after PR #325. | Missing |
| final RLS posture | Explicit Product/Data/Security review that RLS remains enabled before runtime use, browser clients cannot read or write token material, trusted server runtime is the only encrypted row accessor, and sanitized display output stays metadata-only. | Missing |
| key-management | Explicit Security review of managed secret or KMS selection, server-only envelope decrypt boundary, key version metadata, rotation, emergency disable, and no secret printing after PR #325. | Missing |
| rollback | Explicit Product/Data/Security review of disabling credential resolution before rollback, reviewed database rollback path, no token value logging, and revoke/invalidate behavior for unusable credential references. | Missing |
| explicit implementation approval | Explicit approval to open a separate PR for remote Supabase apply, server-only token persistence runtime expansion, or related implementation after final review evidence is complete. | Missing |

This PR is post-PR #325 final approval evidence recheck only. No remote Supabase migration apply, No server-only token persistence runtime expansion, No Google API live smoke, and No safe live YouTube OAuth smoke are performed. Owner authorization before status read, `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED`, opaque non-secret `credentialReferenceId`, and sanitized credential status metadata remain preserved.

## Final Review And Implementation Approval Evidence

PR #326 is merged into `codex/comment-translator-preview` with merge commit `cb490fb2f9a9f5e218a054d84b6c3c5e5d102bd9` at `2026-06-05T02:20:23Z`.

The current-thread owner approval records final review evidence for the YouTube token store table, RLS posture, key-management, rollback, and explicit implementation approval for a separate implementation PR. This evidence changes the gate from `blocked-pending-final-review` to `ready-for-separate-runtime-or-apply-pr`.

Approved evidence:

| Area | Approved scope | Current status |
| --- | --- | --- |
| final table shape | `youtube_oauth_credentials` owner binding, opaque `credentialReferenceId`, sanitized metadata, encrypted token material, and no browser-readable OAuth token material. | Approved |
| final RLS posture | Browser clients cannot read or write token material; trusted server-only runtime is the encrypted row accessor. | Approved |
| key-management | Managed secret or KMS server-only handling, rotation, emergency disable, and no key or token value output. | Approved |
| rollback | Credential resolution disable, reviewed database rollback path, no token logging, and revoke or invalidate unusable credential references. | Approved |
| explicit implementation approval | A separate small PR may proceed for remote Supabase apply or server-only token persistence runtime expansion after this evidence-recording PR. | Approved |

This PR remains evidence-recording only. No remote Supabase migration apply, No server-only token persistence runtime expansion, No Google API live smoke, and No safe live YouTube OAuth smoke are performed here. Client-readable output remains limited to opaque non-secret `credentialReferenceId` and sanitized credential status metadata. Service-role key values, managed secret values, OAuth access token values, OAuth refresh token values, and authorization code values must not be requested, displayed, logged, stored in docs, or included in PR text.

## Remote Supabase Migration Apply Readiness After PR #328

PR #328 is merged into `codex/comment-translator-preview` with merge commit `62de91361a93633c314b03ab162cc0acf3c081b7`. The PR #327 approval gate remains `ready-for-separate-runtime-or-apply-pr`, and the PR #328 server-only persistence runtime expansion is now available as the prerequisite for a separate remote apply readiness slice.

This slice records `remote-supabase-migration-apply-readiness` only. The remote apply state is `not-applied-readiness-only`; no Supabase remote DB mutation is run, and no service-role smoke is mixed into this PR. The selected follow-up is remote Supabase migration apply readiness, not live status/persistence smoke readiness.

Readiness checks recorded here:

| Check | State |
| --- | --- |
| preview merge-state verified | PR #328 merge commit is the preview head used for this branch. |
| approval gate ready | PR #327 final review and explicit implementation approval is `ready-for-separate-runtime-or-apply-pr`. |
| server runtime expansion merged | PR #328 server-only persistence runtime expansion is merged before apply readiness. |
| migration file reviewed | `supabase/migrations/20260601000000_youtube_oauth_credentials.sql` remains the reviewed candidate. |
| human-remote-apply-approval-required | Blocking external action; the remote Supabase project target and apply run need explicit human approval. |
| apply command reviewed, not run | This PR records the apply boundary without connecting to a remote DB. |
| rollback plan reviewed | Credential resolution disable, reviewed database rollback path, no token logging, and revoke/invalidate unusable references remain required. |
| post-apply verification plan recorded | Schema/RLS presence and sanitized service-role status/persistence smoke belong to a separate step after apply approval. |
| Cloudflare Pages noise separated | Pages failure remains known disconnect noise; Workers Builds and local verification remain the actionable signals. |

No service-role smoke is run in this PR. No Google API live smoke is run. No safe live YouTube OAuth smoke is run. Client-readable output remains limited to opaque non-secret `credentialReferenceId` and sanitized credential status metadata. Owner authorization before status read and `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` remain preserved. Service-role key values, managed secret values, OAuth access token values, OAuth refresh token values, and authorization code values must not be requested, printed, stored, or placed in PR text.

## Safe Live Service-Role Status/Persistence Smoke Readiness After PR #329

PR #329 is merged into `codex/comment-translator-preview` with merge commit `c773a52155fafc2f1148c947745688eb89dd8d76`. PR #329 recorded remote Supabase migration apply readiness as `not-applied-readiness-only`, so this follow-up records safe-live service-role status/persistence smoke readiness only and remains `blocked-pending-remote-apply`.

This slice records `safe-live-service-role-status-persistence-smoke-readiness` only. The actual service-role smoke state is `not-run-readiness-only`: no remote Supabase migration apply is run, no service-role status or persistence smoke is executed, no Google API live smoke is run, and no safe live YouTube OAuth smoke is run. The selected follow-up is readiness/blocker recording for service-role status/persistence smoke after a future confirmed remote apply.

Readiness checks recorded here:

| Check | State |
| --- | --- |
| preview merge state verified | PR #329 merge commit is contained in `origin/codex/comment-translator-preview`. |
| remote apply readiness merged | PR #329 remote apply readiness is the prerequisite and remains `not-applied-readiness-only`. |
| env reference names recorded | `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are reference names only; values are not requested, printed, stored, or placed in PR text. |
| missing env sanitized state recorded | Missing env references must degrade to sanitized unavailable / reconnect-required metadata. |
| credential resolution disable preserved | `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` remains the emergency `credential-resolution-disabled` state. |
| owner authorization before read/write recorded | Owner authorization is required before any trusted service-role status read or persistence write smoke. |
| post-apply verification scope recorded | After a future confirmed remote apply, smoke scope is limited to schema/RLS presence, sanitized status metadata, and opaque `credentialReferenceId` persistence verification. |
| remote apply confirmed before smoke | Blocking external action; safe live service-role smoke can run only after remote Supabase migration apply is confirmed. |
| Cloudflare Pages noise separated | Pages failure remains known disconnect noise; Workers Builds and local verification remain the actionable signals. |

No remote Supabase migration apply is run in this PR. No service-role smoke is run. No Google API live smoke is run. No safe live YouTube OAuth smoke is run. Client-readable output remains limited to opaque non-secret `credentialReferenceId` and sanitized credential status metadata. Owner authorization before status read/write and `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` remain preserved. Service-role key values, managed secret values, OAuth access token values, OAuth refresh token values, and authorization code values must not be requested, printed, stored, or placed in PR text.

## Human-Approved Remote Supabase Migration Apply Execution Handoff After PR #330

PR #330 is merged into `codex/comment-translator-preview` with merge commit `70ff213bd203ee979336d059253999ea2ce33565`. PR #330 records service-role status/persistence smoke readiness as `blocked-pending-remote-apply`, and PR #329 remote apply readiness remains `not-applied-readiness-only`. This follow-up records only `human-approved-remote-supabase-migration-apply-execution-handoff`.

The remote apply state is `not-run-pending-explicit-human-target-and-run-approval`. No remote Supabase migration apply is run here, and No service-role smoke execution is mixed into this PR. The next action is an apply-run checklist handoff that still requires a concrete remote Supabase target and explicit human run approval before any external DB mutation.

Handoff checks recorded here:

| Check | State |
| --- | --- |
| preview merge state verified | PR #330 merge commit is contained in `origin/codex/comment-translator-preview`. |
| service-role smoke readiness merged | PR #330 readiness is the prerequisite and remains `blocked-pending-remote-apply`. |
| remote apply readiness not-applied confirmed | PR #329 remains `not-applied-readiness-only`; no remote apply confirmation is recorded. |
| remote target selection required | Blocking external action; the operator must provide an opaque project target reference. |
| explicit human run approval required | Blocking external action; the apply run requires explicit human approval before mutation. |
| apply execution command boundary recorded | This PR records the apply-run checklist only and does not connect to a remote DB. |
| env reference names recorded | `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are reference names only for post-apply readiness; values are not requested, printed, stored, or placed in PR text. |
| missing env sanitized state recorded | Missing env references must degrade to sanitized unavailable / reconnect-required metadata. |
| credential resolution disable preserved | `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` remains the emergency `credential-resolution-disabled` state. |
| owner authorization before post-apply smoke recorded | Owner authorization is required before any post-apply trusted service-role status read or persistence write smoke. |
| rollback abort conditions recorded | Abort if target or approval is ambiguous, migration diff differs from reviewed file, rollback path is not confirmed, credential resolution is enabled before apply, or any secret/token value would be printed. |
| dashboard log unverified scope recorded | Cloudflare Pages, Workers Builds, Supabase dashboard apply history, and remote database schema/RLS inspection logs remain unchecked locally. |
| Cloudflare Pages noise separated | Pages failure remains known Pages disconnect noise; Workers Builds and local verification remain the actionable signals. |

The handoff result remains `blocked-pending-explicit-human-remote-apply-target-and-run-approval`. Client-readable output remains limited to opaque non-secret `credentialReferenceId` and sanitized credential status metadata. No Google API live smoke and No safe live YouTube OAuth smoke are run. Service-role key values, managed secret values, OAuth access token values, OAuth refresh token values, and authorization code values must not be requested, printed, stored, or placed in PR text.

## Remote Supabase Migration Apply Run Target Blocker After PR #331

PR #331 is merged into `codex/comment-translator-preview` with merge commit `42f03817563f047e3703be27d9b9cc6c92654305` and head commit `ed22885d01e481ac7432fd9a77d4bbcbfe3f4e30`. PR #331 recorded the remote apply execution handoff as `blocked-pending-explicit-human-remote-apply-target-and-run-approval`.

This follow-up records the current apply-run decision only. The current thread has `explicit-human-remote-apply-run-approval-recorded`, but the safe concrete remote Supabase target is `not-confirmed-no-repo-supabase-cli-target-metadata`. Target discovery found `supabase/config.toml missing`, `.supabase link metadata missing`, and `no repo-local non-secret project target metadata found`. Therefore the apply run remains `not-run-blocked-pending-safe-concrete-remote-target`.

Apply-run checks recorded here:

| Check | State |
| --- | --- |
| PR #331 merge state verified | `origin/codex/comment-translator-preview` contains merge commit `42f03817563f047e3703be27d9b9cc6c92654305`. |
| PR #331 checks separated | Workers Builds passed; Cloudflare Pages failed as known Pages disconnect noise. |
| thread approval recorded | The current thread explicitly approved a remote apply run. |
| safe concrete target missing | No repo-local non-secret Supabase CLI target metadata was found. |
| migration file reviewed | `supabase/migrations/20260601000000_youtube_oauth_credentials.sql` remains the only reviewed apply candidate. |
| credential resolution disable required | Keep `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` before any future apply. |
| rollback / abort conditions recorded | Abort if safe target is missing, migration diff changes, credential resolution is not disabled, service-role smoke would be mixed in, or any secret/token value would be printed. |
| post-apply verification boundary recorded | If a future target-confirmed apply runs, verification is limited to schema/RLS presence. |

No remote Supabase migration apply is run in this PR. No service-role smoke execution is run or mixed into this PR. No Google API live smoke is run. No safe live YouTube OAuth smoke is run. Client-readable output remains limited to opaque non-secret `credentialReferenceId` and sanitized credential status metadata. Service-role key values, managed secret values, OAuth access token values, OAuth refresh token values, and authorization code values must not be requested, printed, stored, or placed in PR text.

## Safe Concrete Remote Supabase Target Metadata Confirmation After PR #332

PR #332 is merged into `codex/comment-translator-preview` with merge commit `85998d2265eaa6348a265241f13799bfbc46759e` and head commit `7ed1c5de42f73a3e403d30605e23f9b6f5a81577`. PR #332 recorded the remote apply target blocker as `not-run-blocked-pending-safe-concrete-remote-target`.

This follow-up records safe concrete remote Supabase target metadata confirmation only. The target confirmation result is `blocked-missing-repo-local-non-secret-target-metadata`. The actual apply state is `not-run-target-confirmation-only`: No remote Supabase migration apply is run, No service-role smoke execution is run or mixed into this PR, No Google API live smoke is run, and No safe live YouTube OAuth smoke is run.

Target metadata confirmation checks recorded here:

| Check | State |
| --- | --- |
| PR #332 merge state verified | `origin/codex/comment-translator-preview` contains merge commit `85998d2265eaa6348a265241f13799bfbc46759e`. |
| prior target blocker confirmed | PR #332 remains `not-run-blocked-pending-safe-concrete-remote-target`. |
| allowed metadata sources fixed | Only `supabase/config.toml` and Supabase CLI link metadata in `.supabase` can confirm the target. |
| current target metadata discovery | `supabase/config.toml missing`, `.supabase link metadata missing`, and `no repo-local non-secret project target metadata found`. |
| rejected target sources fixed | service_role key value, managed secret value, OAuth token value, human-pasted private credential, browser storage, and existing handoff payload do not qualify as target metadata. |
| ambiguous target blocker fixed | Multiple candidates or an otherwise non-unique non-secret project reference block actual apply. |
| separate apply PR condition fixed | Even if a safe concrete target is later confirmed, this PR only records readiness and the apply-command-only run stays a separate PR condition. |

The next PR may proceed to apply-command-only only after repo-local non-secret Supabase config or CLI link metadata uniquely identifies the target, the reviewed migration file still matches `supabase/migrations/20260601000000_youtube_oauth_credentials.sql`, `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` is preserved before apply, and a final operator confirmation is given for that separate apply-command-only PR. Service-role smoke execution remains a further separate PR after a confirmed remote apply.

## Remote Supabase Apply Command Gate After PR #333

PR #333 is merged into `codex/comment-translator-preview` with merge commit `ebe6b1baccaf18459d7e606f5d3d7150641dea71` and head commit `ff8c15aef43b39109a7c37327cd30331d635e54d`. PR #333 recorded target metadata confirmation as `blocked-missing-repo-local-non-secret-target-metadata` and actual apply as `not-run-target-confirmation-only`.

This follow-up records the operator-local Supabase CLI link metadata state only. The target metadata source is `confirmed-from-supabase-cli-local-link-metadata`: `supabase/.temp/project-ref present`, `supabase/.temp/linked-project.json present`, the project reference is a single non-secret 20-character project ref, and `supabase/.temp/` is ignored and not committed.

Apply-command gate checks recorded here:

| Check | State |
| --- | --- |
| PR #333 merge state verified | `origin/codex/comment-translator-preview` contains merge commit `ebe6b1baccaf18459d7e606f5d3d7150641dea71`. |
| local link metadata confirmed | Supabase CLI local link metadata in supabase/.temp is present in the operator worktree. |
| metadata commit boundary fixed | `supabase/.temp/` is ignored; local link metadata is not committed. |
| target source remains non-secret | The project ref is non-secret target metadata; service_role key value, managed secret value, OAuth token value, browser storage, and existing handoff payload do not qualify. |
| migration file reviewed | `supabase/migrations/20260601000000_youtube_oauth_credentials.sql` remains the only reviewed apply candidate. |
| credential resolution disable required | Keep `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` before any future apply. |
| final operator confirmation required | Actual apply remains `not-run-pending-final-operator-confirmation`. |

No remote Supabase migration apply is run in this PR. No service-role smoke execution is run or mixed into this PR. No Google API live smoke is run. No safe live YouTube OAuth smoke is run. Client-readable output remains limited to opaque non-secret `credentialReferenceId` and sanitized credential status metadata. Service-role key values, managed secret values, OAuth access token values, OAuth refresh token values, and authorization code values must not be requested, printed, stored, or placed in PR text.

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
