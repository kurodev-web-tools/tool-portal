# Kuro Live Comment Translator Per-Minute Auto-Resume Design

Status: design approved on 2026-07-10. Design and planning readiness only; implementation, Cloudflare mutation, deploy/upload, preview or production browser smoke, live/provider execution, public access change, and main promotion are not included.

## Purpose

Treat the translated-messages-per-minute limit as a temporary rate pause instead of a terminal session stop. When rolling capacity becomes available, resume from the current live-chat position without translating comments posted during the pause.

The normal Free entitlement remains 30 translated provider executions per rolling 60-second window. The existing reviewed preview-only allowed-tester smoke override may use its fixed lower entitlement, but it does not change the behavior defined here.

## Approved Product Decisions

- `translated-message-cap` is a recoverable active-session pause, not a terminal stop reason.
- The pause stops YouTube comment polling and translation-provider execution.
- Session and daily elapsed time continue to accrue while paused.
- The browser continues its normal heartbeat/status refresh so the active session and server-owned usage state remain current.
- When one or more rolling-window slots become available, the server re-primes the polling cursor at the current live-chat position.
- Comments posted during the pause are not translated, queued, persisted for later translation, or replayed after recovery.
- Translation resumes only for comments posted after successful cursor re-priming.
- User Stop remains available throughout the pause.
- Daily time, session time, monthly provider-input characters, provider/global/AI budget, unavailable usage authority, missing heartbeat, authentication failure, provider terminal state, and exhausted bounded retry remain terminal stop boundaries.

## Non-Goals

- No backlog or deferred translation queue.
- No raw-comment retention for recovery.
- No catch-up translation burst after the pause.
- No change to the normal Free per-minute limit or preview smoke activation contract.
- No new Cloudflare variable, public access gate, paid entitlement behavior, Supabase object, migration, or remote operation.
- No change to cache-hit accounting: only provider-executed/cache-miss translations consume the per-minute limit.

## Architecture

### 1. Session Limit Classification

The session runtime must classify limit outcomes into two categories:

- `recoverable-rate-pause`: only `translated-message-cap`.
- `terminal-stop`: all existing time, monthly, budget, provider, authorization, heartbeat, and terminal polling boundaries.

The active-session resolver must not call the stopped-state constructor solely because the translated-message count equals the entitlement limit. It must return an active browser-safe state with a sanitized rate-pause projection.

### 2. Server-Owned Rate-Pause Projection

The bounded polling runtime owns a server-only per-session phase, and the active browser-safe state receives only its sanitized projection. The projection uses the exact discriminator:

```ts
activePhase: "running" | "rate-paused" | "resyncing";
ratePauseReason: "translated-message-cap" | null;
retryAfterSeconds: number | null;
automaticResumeExpected: boolean;
```

It contains no provider identifiers or raw data. It must communicate:

- whether the session is running, rate-paused, or resynchronizing;
- the reason label `translated-message-cap`;
- rounded seconds until the next rolling slot is expected to become available;
- that automatic resume is expected;
- that pause-window comments are not translated.

Projection invariants are exact:

- `running`: reason `null`, recovery seconds `null`, automatic resume `false`;
- `rate-paused`: reason `translated-message-cap`, non-negative rounded recovery seconds, automatic resume `true`;
- `resyncing`: reason `translated-message-cap`, recovery seconds `null`, automatic resume `true`.

The recovery estimate must be derived server-side from the same rolling provider-execution events that own the per-minute count. A client-supplied timestamp or countdown must never authorize provider execution.

If the rolling-window authority or entitlement cannot be read, the existing fail-closed terminal path applies. The browser receives only a sanitized unavailable/stop reason.

### 3. Polling Pause Boundary

The bounded live-chat polling preflight must evaluate terminal boundaries before the recoverable per-minute boundary.

All polling-state reads and writes for one session reference must run through one session-keyed single-flight coordinator inside the bounded polling runtime. The coordinator serializes the full polling tick, including an adapter call, so pause entry cannot race an in-flight old-cursor poll and concurrent heartbeat/status requests cannot prime more than once. Session-state resolution may project the coordinator result, but it must not independently mutate cursor or phase state.

While the per-minute count is at the entitlement limit, the coordinator must:

- do not invoke the YouTube polling adapter;
- do not invoke the translation provider;
- preserve the active session, heartbeat, timer accounting, server-only target boundary, and Stop capability;
- return a sanitized `rate-limit-paused` polling result instead of a quota-stop handoff;
- on the first serialized transition into `rate-paused`, replace the polling state with a fresh unprimed state created from the existing server-only `liveChatId`, delete cursor-primed and seen-comment state, and retain no old cursor;
- leave the fresh state unpolled until rolling capacity returns.

Repeated requests while already paused return the same sanitized pause phase and must not repeatedly reset recovery timing or create new polling states.

The pause result must not contain a cursor, target metadata, raw comments, provider payloads, account identifiers, or internal durable-event identifiers.

### 4. Rolling Recovery And Cursor Re-Priming

Normal browser heartbeat/status refresh continues to read server-owned usage. The polling coordinator is the sole owner of the recovery transition. When the count drops below the entitlement limit, the first serialized polling tick:

1. Keep the session active and mark recovery as `resyncing`.
2. Reuse the fresh unprimed polling state created at pause entry; its only retained target value is the existing server-only `liveChatId`.
3. Run the existing cursor-prime behavior exactly once. Concurrent requests join the same in-flight recovery result instead of starting another prime.
4. Discard all comments returned by the prime poll and retain only the new server-only cursor.
5. Return to `running` after priming succeeds.
6. Translate only comments returned by later polls.

This deliberately prioritizes real-time behavior over complete coverage. The old cursor must never be used as a fallback after a rate pause. An old-cursor poll already in flight before the limit is observed finishes inside the same serialized tick; pause entry occurs only on the next tick after the durable usage count reaches the limit.

### 5. Resynchronization Errors

Cursor re-priming uses the existing bounded polling retry policy, whose default maximum is three recoverable retries.

- A recoverable provider error enters the existing bounded backoff and keeps the session active in `resyncing`.
- Session and daily elapsed time continue to accrue during retry/backoff.
- No polling result is passed to translation until priming succeeds.
- A terminal live-chat state, exhausted retries, unreadable usage authority, missing heartbeat, or another terminal boundary stops the session with the existing sanitized reason family.
- After terminal stop, the UI may instruct the user to Start again.

## State Model

```text
running
  -> rate-paused                 when translated count reaches the entitlement limit
rate-paused
  -> terminal-stopped            when any terminal boundary is reached
  -> resyncing                   when rolling capacity becomes available
resyncing
  -> resyncing                   on recoverable bounded retry
  -> terminal-stopped            on terminal state or retry exhaustion
  -> running                     after cursor prime succeeds
running | rate-paused | resyncing
  -> terminal-stopped            on explicit user Stop
```

`rate-paused` and `resyncing` remain active-session phases. They do not create a new session, reset elapsed time, or release the one-active-session-per-user boundary. The browser-safe session status remains `active`; `activePhase` carries the phase distinction.

## Usage And Provider Accounting

- The limit-th eligible cache-miss/provider execution succeeds when submitted in a batch that fits the remaining capacity.
- Preserve the existing atomic batch preflight: if cache misses in one batch exceed remaining per-minute capacity, no cache miss in that batch executes and there is no partial provider call.
- A cache-only batch may still complete at the cap without consuming provider capacity.
- A mixed cache-hit/cache-miss batch that exceeds remaining capacity is blocked as one batch under the existing preflight; its cache hits are not counted, persisted as provider usage, or separately served.
- Cache hits and filtered/non-provider-executed messages do not increment the rolling count when they complete in a cache-only or remaining-capacity-fitting batch; a mixed over-capacity batch remains atomically blocked as specified above.
- No new comments are fetched during `rate-paused`, so pause-window comments are not evaluated for cache hits.
- Session and daily elapsed time continue to advance in all active states.
- Monthly provider-input usage changes only when a provider execution occurs under the existing authority.

## Browser UX

While rate-paused, show:

- status: `分速上限のため一時休止中`;
- recovery guidance: `約○秒後に、新着コメントから自動再開します`;
- coverage warning: `休止中に投稿されたコメントは翻訳されません`;
- the current per-minute usage, such as `30 / 30`;
- Stop as an available action;
- Start as unavailable because the current session remains active.

While re-priming or retrying, show `コメント取得の再開を準備中`. After successful priming, return to the normal running display without requiring Start.

The countdown is advisory display metadata. Provider authorization always comes from a fresh server-owned usage read. Browser storage remains unchanged.

## Testing Contracts

Use deterministic fixtures and fake time to prove:

1. reaching the per-minute limit returns an active `rate-paused` session rather than a stopped session;
2. YouTube polling and translation-provider execution are both not run while paused;
3. session and daily elapsed time advance during the pause;
4. recovery does not begin before rolling capacity becomes available;
5. capacity recovery enters `resyncing` and primes a fresh cursor;
6. comments returned by the prime poll are discarded and never sent to translation;
7. the first comment from a later poll is translated normally;
8. the old cursor is never used after pause entry;
9. the browser-safe active projection distinguishes `running`, `rate-paused`, and `resyncing`;
10. concurrent recovery requests join one session-keyed prime and cannot duplicate priming;
11. an in-flight old-cursor poll and pause entry are serialized, and the old cursor is unavailable after pause entry;
12. recoverable re-prime errors use bounded retry and retry exhaustion stops safely;
13. a cache-miss batch that fits remaining capacity executes, while an over-capacity batch is blocked atomically with no partial provider call;
14. cache-only-at-cap completes without usage, while a mixed over-capacity batch is blocked without usage;
15. daily/session/monthly/budget/provider/unavailable boundaries remain terminal;
16. normal production/unset/malformed states retain the Free limit of 30;
17. preview smoke activation remains exact-marker, Cloudflare-preview, and allowed-tester only;
18. cache hits and filtered/non-provider-executed messages do not consume the per-minute provider limit;
19. browser-safe output contains only sanitized state, counts, and rounded recovery timing.

Affected shared-runtime sibling contracts must run with the focused contracts. Implementation verification must also include lint, TypeScript checking, production build, `git diff --check`, changed-files high-confidence no-secret scan with count-only reporting, and changed TS/TSX type-suppression scan.

Because rendered state and copy change, perform local fixture-based browser QA at `390 / 820 / 1024 / 1280 / 1366px`. Live/provider, preview, or production browser smoke remains separately approval-gated.

## Implementation Boundary

Implementation belongs in a separate reviewable follow-up slice after the existing PL-G6D preview smoke override slice is integrated or otherwise selected as its explicit base. Do not add this behavioral change to the existing override PR implicitly.

Stop before Cloudflare environment apply, preview/production deploy or upload, live/provider execution, OAuth live flow, Google target lookup, Supabase work, Stripe action, public gate/access change, paid runtime, OBS runtime, or main promotion. Each such operation requires its own exact sanitized approval.
