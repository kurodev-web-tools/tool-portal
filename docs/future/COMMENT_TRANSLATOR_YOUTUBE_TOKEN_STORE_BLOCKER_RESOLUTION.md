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
