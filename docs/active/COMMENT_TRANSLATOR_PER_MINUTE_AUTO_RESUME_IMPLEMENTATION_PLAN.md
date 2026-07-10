# Comment Translator Per-Minute Auto-Resume Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change only the translated-messages-per-minute boundary from a terminal stop into an active-session pause that automatically resumes from a freshly primed current cursor.

**Architecture:** Extend the durable rolling-usage snapshot with the next server-owned capacity time, represent `running | rate-paused | resyncing` through a focused sanitized projection, and let the bounded polling runtime own a session-keyed single-flight transition coordinator. Route/action responses project that phase into the active session, while the Dock keeps heartbeat/time accounting active and renders pause/resync guidance without exposing cursor, target, account, or provider data.

**Tech Stack:** Next.js App Router, React, TypeScript, server actions, Cloudflare/OpenNext runtime, Supabase-backed durable usage events, deterministic Node contract scripts, fake time/adapter fixtures.

---

## Preconditions And Branch Boundary

- PR #632 is verified `MERGED`; its integration merge commit is `606eac8f5f57ad54c2c2875ec3e5dc871c6ddd70`.
- `origin/codex/comment-translator-free-public-beta-integration` contains the merged PL-G6D preview override files and remains the required implementation base.
- Implementation uses a new branch and a new PR. Do not update or reuse PR #632.
- Suggested implementation branch: `codex/comment-translator-per-minute-auto-resume`.
- The current design commit is local: `801adea`. Preserve the approved design and this plan when creating the implementation branch.
- Before branch creation, commit, push, or PR creation, follow the active-thread approval boundary. Cloudflare mutation, deploy/upload, preview/production browser smoke, live/provider execution, OAuth, target lookup, Supabase operation, Stripe action, public gate/access change, paid runtime, OBS runtime, and main promotion remain prohibited without exact separate approval.

Implementation-start commands after approval:

```bash
git fetch origin --prune
gh pr view 632 --json state,mergedAt,mergeCommit,baseRefName,headRefName
git show --no-ext-diff --stat --oneline 606eac8f5f57ad54c2c2875ec3e5dc871c6ddd70
git switch codex/comment-translator-per-minute-auto-resume-design
git switch -c codex/comment-translator-per-minute-auto-resume
git rebase --onto origin/codex/comment-translator-free-public-beta-integration 45ed6dd0e2edeb4b11b088772c70057218cff1cc
```

Expected: PR state is `MERGED`; merge commit is the reviewed integration commit; the new branch is not `main`; only local design/plan commits after the old PL-G6D head are replayed onto latest integration. If the design branch or rebase boundary is unavailable, or rebase conflicts, stop instead of resolving unrelated files implicitly.

## Planned File Structure

**Create**

- `lib/comment-translator-per-minute-rate-pause.ts`: focused browser-safe phase types and pure projection constructors/invariants.
- `scripts/comment-translator-per-minute-auto-resume-contract.mjs`: RED-first end-to-end deterministic contract for usage recovery time, active pause, single-flight recovery, fresh cursor prime, terminal fallbacks, accounting, and sanitization.

**Modify: server authority and orchestration**

- `lib/comment-translator-usage-ledger-runtime.ts`: add the next rolling provider-capacity timestamp to the server-owned usage snapshot.
- `lib/comment-translator-durable-usage-counter-store.ts`: derive the earliest slot-release time from current-session `ai-usage-estimated` events.
- `lib/comment-translator-session-runtime.ts`: keep the session active for `translated-message-cap` and expose the sanitized active-phase projection.
- `lib/comment-translator-bounded-live-chat-polling-wiring.ts`: own pause entry, old-cursor invalidation, single-flight recovery, fresh prime, and pause cleanup.
- `lib/comment-translator-live-provider-session-step.ts`: treat rate pause/resync as no-translation active outcomes and keep active seed states type-complete.
- `app/api/comment-translator/session/route.ts`: pass the server-owned phase projection into session resolution without running provider work for status restore.
- `app/tools/comment-translator/actions.ts`: mirror the route behavior for the normal UI action path.

**Modify: browser presentation**

- `components/comment-translator/CommentTranslatorDock.tsx`: render pause/resync state, countdown, no-backlog warning, active Stop, and disabled Start while heartbeat/feed refresh remains active.
- `lib/comment-translator.ts`: add localized Japanese/English pause, resync, countdown, and skipped-window copy.
- `app/tools/comment-translator/dev/per-minute-auto-resume/page.tsx`: production-404 local visual fixture route with fixed sanitized phase states only.

**Modify: focused and sibling contracts**

- `scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs`
- `scripts/comment-translator-session-start-stop-contract.mjs`
- `scripts/comment-translator-free-beta-usage-display-contract.mjs`
- `scripts/comment-translator-azure-normal-translation-execution-contract.mjs`
- `scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs`
- `scripts/comment-translator-usage-quota-budget-ledger-contract.mjs`
- `scripts/comment-translator-public-operator-session-ui-contract.mjs`
- `scripts/comment-translator-ui-live-provider-runtime-contract.mjs`
- `scripts/comment-translator-real-comments-ui-wiring-contract.mjs`
- `scripts/comment-translator-pl-g6d-preview-rate-limit-smoke-override-contract.mjs`
- `scripts/comment-translator-provider-execution-runtime-contract.mjs`

**Modify: operational record**

- `docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_DESIGN.md`: implementation status and verified behavior only; do not rewrite approved decisions.
- `task.md`: current branch, scope, verification, UI widths, non-actions, and new-PR boundary.

## Chunk 1: Rolling Authority And Active Session Projection

### Task 1: Create the focused RED contract and rolling recovery authority

**Files:**

- Create: `scripts/comment-translator-per-minute-auto-resume-contract.mjs`
- Modify: `lib/comment-translator-usage-ledger-runtime.ts`
- Modify: `lib/comment-translator-durable-usage-counter-store.ts`
- Modify: `scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs`
- Modify: `scripts/comment-translator-usage-quota-budget-ledger-contract.mjs`

- [ ] **Step 1: Write failing usage-authority fixtures**

Add deterministic durable rows for one active session with provider-executed counts inside and outside the rolling 60-second window. Assert the ready snapshot contains:

```ts
translatedMessagesInCurrentMinute: number;
translatedMessageCapacityAvailableAtMs: number | null;
```

Required cases:

- below cap returns `null`;
- at cap returns the earliest valid `occurred_at + 60_000` that frees at least one slot;
- multiple translated-message estimates in one event still use that event's expiry;
- another session, cache hit, filtered row, non-AI event, and expired event do not affect the timestamp;
- a capped state with no trustworthy contributing timestamp fails closed rather than authorizing recovery.

Repeat the count/timestamp cases through `readInMemoryCommentTranslatorUsageSnapshot`; durable and in-memory authority must derive the same field from their own provider-executed event records.

- [ ] **Step 2: Run the focused contract to prove RED**

Run:

```bash
node scripts/comment-translator-per-minute-auto-resume-contract.mjs
```

Expected: FAIL because the usage snapshot does not expose `translatedMessageCapacityAvailableAtMs`.

- [ ] **Step 3: Add the snapshot field and pure durable derivation**

Extend `CommentTranslatorUsageLedgerSnapshot` with the required nullable field. Update both `createUsageSnapshotFromRows` and `readInMemoryCommentTranslatorUsageSnapshot`: first materialize current-window provider-executed rows/records, then derive both the count and earliest capacity time from that same list. Use only server-owned event time and translated-message estimate values.

The minimal shape is:

```ts
const currentWindowRows = activeSessionRows.filter(isCurrentWindowProviderExecution);
const translatedMessagesInCurrentMinute = sumTranslatedMessages(currentWindowRows);
const translatedMessageCapacityAvailableAtMs =
  translatedMessagesInCurrentMinute >= planEntitlement.translatedMessagesPerMinute
    ? earliestValidExpiry(currentWindowRows)
    : null;
```

Do not return raw event timestamps to the browser; this field remains server-only input to a rounded countdown projection.

If the count is capped but no finite contributing expiry exists, throw inside the snapshot derivation. `readCommentTranslatorDurableUsageSnapshotOrFailClosed` must catch this and return its existing sanitized `global-budget-stop` fail-closed result. The in-memory path uses numeric `occurredAtMs`; add a deterministic guard and fail-closed test rather than returning an active session with `null` recovery time.

- [ ] **Step 4: Run focused and durable sibling contracts**

Run:

```bash
node scripts/comment-translator-per-minute-auto-resume-contract.mjs
node scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs
node scripts/comment-translator-usage-quota-budget-ledger-contract.mjs
```

Expected: PASS; malformed/untrustworthy capped authority remains fail-closed.

- [ ] **Step 5: Commit the authority slice after commit approval**

```bash
git add lib/comment-translator-usage-ledger-runtime.ts lib/comment-translator-durable-usage-counter-store.ts scripts/comment-translator-per-minute-auto-resume-contract.mjs scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs scripts/comment-translator-usage-quota-budget-ledger-contract.mjs
git commit -m "[codex] Add per-minute recovery authority"
```

### Task 2: Add the sanitized pure phase model

**Files:**

- Create: `lib/comment-translator-per-minute-rate-pause.ts`
- Modify: `scripts/comment-translator-per-minute-auto-resume-contract.mjs`

- [ ] **Step 1: Add failing projection and session tests**

Assert the exact active projection:

```ts
type CommentTranslatorPerMinuteRatePauseProjection = {
  activePhase: "running" | "rate-paused" | "resyncing";
  ratePauseReason: "translated-message-cap" | null;
  retryAfterSeconds: number | null;
  automaticResumeExpected: boolean;
};
```

Test exact invariants for all three phases, rounded non-negative countdown, and no raw timestamp/cursor/target metadata in serialized output. The pure resolver must return a discriminated fail-closed result when count is capped and recovery time is missing:

```ts
type CommentTranslatorPerMinuteRatePauseResolution =
  | { status: "ready"; projection: CommentTranslatorPerMinuteRatePauseProjection }
  | { status: "fail-closed"; stopReason: "global-budget-stop" };
```

- [ ] **Step 2: Run the phase contract to prove RED**

```bash
node scripts/comment-translator-per-minute-auto-resume-contract.mjs
```

Expected: FAIL because the focused phase module does not exist.

- [ ] **Step 3: Implement the pure phase module**

Add focused constructors for running, paused, and resyncing. Clamp retry time as:

```ts
Math.max(0, Math.ceil((capacityAvailableAtMs - nowMs) / 1_000));
```

The module must import `server-only`, accept only counts/limits/time, and return either the four sanitized fields or the exact fail-closed result. It does not read or mutate polling/session state.

- [ ] **Step 4: Run the pure projection contract to GREEN**

Run the command from Step 2.

Expected: PASS for running, paused, resyncing, rounded countdown, sanitization, and missing-authority fail-closed resolution.

- [ ] **Step 5: Commit the pure phase slice after commit approval**

```bash
git add lib/comment-translator-per-minute-rate-pause.ts scripts/comment-translator-per-minute-auto-resume-contract.mjs
git commit -m "[codex] Add per-minute pause phase model"
```

## Chunk 2: Serialized Polling Pause And Fresh-Cursor Recovery

### Task 3: Add the session-keyed single-flight polling coordinator

**Files:**

- Modify: `lib/comment-translator-bounded-live-chat-polling-wiring.ts`
- Modify: `lib/comment-translator-live-provider-session-step.ts`
- Modify: `scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs`
- Modify: `scripts/comment-translator-per-minute-auto-resume-contract.mjs`

- [ ] **Step 1: Write failing pause and recovery tests**

Use deterministic adapters, deferred promises, and fake `nowMs` to assert:

- cap returns `rate-limit-paused`, `providerSignal: null`, and no server-only comments;
- YouTube adapter and translation provider counts remain zero during pause;
- first pause transition replaces the old polling state with `nextPageToken: null`, clears prime/dedupe state, and retains only the server-only live target;
- repeated paused heartbeats do not recreate state;
- before capacity time, phase remains paused;
- after capacity time, one fresh prime runs, its comments are discarded, and phase becomes running;
- a later poll passes only post-prime comments to translation;
- the old cursor never appears in adapter input after pause entry;
- two concurrent recovery calls share one in-flight prime;
- when an old-cursor adapter call is held by a deferred promise, a capped heartbeat joins that tick; only after the old tick completes may the next serialized heartbeat enter pause, and every later adapter input must use a fresh `null` cursor;
- recoverable prime errors keep `resyncing`; retry exhaustion and terminal provider states hand off the existing sanitized terminal stop.

- [ ] **Step 2: Run polling contracts to prove RED**

```bash
node scripts/comment-translator-per-minute-auto-resume-contract.mjs
node scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs
```

Expected: FAIL because the current cap result is `skipped-quota-budget-stop-handoff` and clears the session through a provider signal.

- [ ] **Step 3: Wrap polling ticks in session-keyed single-flight**

Keep one in-flight promise and one monotonic generation per `sessionReferenceId`, and move the current body into a serialized internal function. Concurrent calls join the existing promise; `finally` removes only the matching promise.

```ts
const pollingTickInFlightBySessionReference = new Map<string, Promise<CommentTranslatorBoundedLiveChatPollingTickResult>>();
const pollingGenerationBySessionReference = new Map<string, number>();
```

Do not serialize different sessions together. Stop/cleanup increments the generation and clears phase/cursor/dedupe state. Every tick captures its generation before adapter execution and rechecks it after `await`; a stale completion must discard provider comments/state and return a no-comments stopped/stale result. It must never repopulate cleared maps. Test reset clears promise, generation, phase, cursor, and dedupe maps.

- [ ] **Step 4: Implement pause entry before provider polling**

Evaluate missing heartbeat, daily/session, monthly/budget, and provider terminal boundaries first. Handle only `translated-message-cap` as recoverable:

```ts
if (usage.translatedMessagesInCurrentMinute >= translatedMessagesPerMinute) {
  return enterOrReadRatePause({ sessionReferenceId, pollingState, usage, nowMs });
}
```

On first entry, recreate the state using the existing server-only `liveChatId` and `createInitialYouTubeLiveChatPollingState`, delete primed/dedupe sets, record `rate-paused`, and do not call the adapter. Missing server-only state remains a sanitized unavailable/terminal path; do not perform target lookup merely to enter a pause.

- [ ] **Step 5: Implement resync and bounded failure behavior**

When a previously paused session has capacity, set `resyncing` and poll the fresh unprimed state. Reuse the existing first-poll cursor-prime behavior so all prime comments are skipped. Keep `resyncing` during existing bounded backoff, transition to `running` after prime success, and clear everything on terminal stop.

Expose a read-only sanitized phase projection for route/action status responses. Reading projection must never poll, mutate cursor, or authorize provider use.

- [ ] **Step 6: Keep the live-provider step translation-free while paused**

Treat `rate-limit-paused` and recovery prime results as normal active no-translation outcomes. Diagnostics may map pause to existing `not-due`; do not add raw cursor or target metadata to diagnostics.

- [ ] **Step 7: Run polling and focused contracts to GREEN**

Run the two commands from Step 2.

Expected: PASS with one prime for concurrent recovery and zero provider execution during pause/prime.

- [ ] **Step 8: Commit the polling coordinator slice after commit approval**

```bash
git add lib/comment-translator-bounded-live-chat-polling-wiring.ts lib/comment-translator-live-provider-session-step.ts scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs scripts/comment-translator-per-minute-auto-resume-contract.mjs
git commit -m "[codex] Auto-resume per-minute polling pauses"
```

### Task 4: Wire route and server actions to the same phase authority

**Files:**

- Modify: `app/api/comment-translator/session/route.ts`
- Modify: `app/tools/comment-translator/actions.ts`
- Modify: `lib/comment-translator-session-runtime.ts`
- Modify: `lib/comment-translator-live-provider-session-step.ts`
- Modify: `scripts/comment-translator-per-minute-auto-resume-contract.mjs`
- Modify: `scripts/comment-translator-session-start-stop-contract.mjs`
- Modify: `scripts/comment-translator-free-beta-usage-display-contract.mjs`
- Modify: `scripts/comment-translator-public-operator-session-ui-contract.mjs`
- Modify: `scripts/comment-translator-ui-live-provider-runtime-contract.mjs`
- Modify: `scripts/comment-translator-real-comments-ui-wiring-contract.mjs`

- [ ] **Step 1: Write failing route/action source contracts**

Assert both paths:

- use the same exported phase-projection reader after heartbeat polling;
- pass the projection to `readCommentTranslatorSessionCommand`;
- keep `providerSignal` null for a rate pause;
- keep status restore provider-free and target-lookup-free;
- preserve exact-marker/preview/allowed-tester entitlement resolution before usage and phase resolution.

Add executable status fixtures that inject counting/throwing provider-runtime and target-lookup adapters, invoke route/action status orchestration, and assert both counts remain zero. Source matching alone is not sufficient.

- [ ] **Step 2: Run route/action siblings to prove RED**

```bash
node scripts/comment-translator-per-minute-auto-resume-contract.mjs
node scripts/comment-translator-session-start-stop-contract.mjs
node scripts/comment-translator-free-beta-usage-display-contract.mjs
node scripts/comment-translator-public-operator-session-ui-contract.mjs
node scripts/comment-translator-ui-live-provider-runtime-contract.mjs
node scripts/comment-translator-real-comments-ui-wiring-contract.mjs
```

Expected: FAIL because the session active union lacks phase metadata and route/action commands do not receive the coordinator projection.

- [ ] **Step 3: Inject coordinator phase into active session resolution**

Remove `translated-message-cap` from `assessUsageStopReason` terminal resolution for active sessions. Make `readCommentTranslatorSessionCommand` require `CommentTranslatorPerMinuteRatePauseResolution` from the coordinator; it must not derive phase from usage independently.

- ready resolution creates the active state with the exact projection and continued elapsed-time accounting;
- fail-closed resolution stops with existing sanitized `global-budget-stop`;
- `createActiveSeedState` supplies the coordinator's running projection;
- stopped-state reason compatibility remains unchanged for previously stored `translated-message-cap` records.

- [ ] **Step 4: Wire heartbeat and a true read-only status path**

After the polling step, read the sanitized resolution from the bounded polling owner and pass it to session runtime in both route and actions. Move `status` into an early read-only branch after authorization, durable active-session/usage read, and entitlement resolution but before live provider runtime creation or live-target lookup. Status reads coordinator projection only; it must not run `runCommentTranslatorLiveProviderSessionStep`, create/invoke a polling adapter, or resolve a live target.

- [ ] **Step 5: Run route/action/session siblings to GREEN**

Run all six commands from Step 2.

Expected: PASS; route and server action return the same browser-safe phase semantics, cap sessions remain active, time advances, terminal boundaries stop, and status provider/target counts are zero.

- [ ] **Step 6: Commit the shared wiring slice after commit approval**

```bash
git add app/api/comment-translator/session/route.ts app/tools/comment-translator/actions.ts lib/comment-translator-session-runtime.ts lib/comment-translator-live-provider-session-step.ts scripts/comment-translator-per-minute-auto-resume-contract.mjs scripts/comment-translator-session-start-stop-contract.mjs scripts/comment-translator-free-beta-usage-display-contract.mjs scripts/comment-translator-public-operator-session-ui-contract.mjs scripts/comment-translator-ui-live-provider-runtime-contract.mjs scripts/comment-translator-real-comments-ui-wiring-contract.mjs
git commit -m "[codex] Wire per-minute pause session state"
```

## Chunk 3: Operator UX, Accounting Regression, And Completion Gate

### Task 5: Render pause/resync UX without changing session controls

**Files:**

- Create: `app/tools/comment-translator/dev/per-minute-auto-resume/page.tsx`
- Modify: `components/comment-translator/CommentTranslatorDock.tsx`
- Create: `components/comment-translator/CommentTranslatorActivePhaseNotice.tsx`
- Create: `components/comment-translator/CommentTranslatorCommentCard.tsx`
- Create: `components/comment-translator/CommentTranslatorCreatorWaitlistPanel.tsx`
- Create: `components/comment-translator/CommentTranslatorDockAtoms.tsx`
- Create: `components/comment-translator/CommentTranslatorDockHeader.tsx`
- Create: `components/comment-translator/CommentTranslatorFeedPanel.tsx`
- Create: `components/comment-translator/CommentTranslatorSessionPanel.tsx`
- Create: `components/comment-translator/CommentTranslatorSettingsPanel.tsx`
- Create: `components/comment-translator/CommentTranslatorUsageSidebar.tsx`
- Create: `components/comment-translator/comment-translator-dock-format.ts`
- Create: `components/comment-translator/comment-translator-dock-model.ts`
- Create: `components/comment-translator/useCommentTranslatorBrowserTimeZone.ts`
- Create: `components/comment-translator/useCommentTranslatorCreatorWaitlist.ts`
- Create: `components/comment-translator/useCommentTranslatorDockControls.ts`
- Create: `components/comment-translator/useCommentTranslatorSessionFeedController.ts`
- Modify: `components/portal/PortalShell.tsx`
- Modify: `lib/comment-translator.ts`
- Create: `lib/comment-translator-copy-en.json`
- Create: `lib/comment-translator-copy-ja.json`
- Create: `lib/comment-translator-fixture-comments.ts`
- Create: `lib/comment-translator-runtime.ts`
- Create: `lib/comment-translator-snapshot-data.ts`
- Create: `lib/comment-translator-types.ts`
- Modify: `docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_IMPLEMENTATION_PLAN.md`
- Modify: `scripts/account-remote-display-settings-contract.mjs`
- Modify: `scripts/comment-translator-per-minute-auto-resume-contract.mjs`
- Modify: `scripts/comment-translator-public-operator-session-ui-contract.mjs`
- Modify: `scripts/comment-translator-free-beta-usage-display-contract.mjs`
- Modify: `task.md`

- [ ] **Step 1: Write failing copy/render contracts**

Require the exact stable markers:

```text
data-comment-translator-active-phase="running|rate-paused|resyncing"
data-comment-translator-rate-pause="auto-resume-current-cursor"
```

Require the exact localized copy keys/values:

```text
ja.ratePausedTitle = 分速上限のため一時休止中
en.ratePausedTitle = Paused at the per-minute limit
ja.ratePausedBody = 約{seconds}秒後に、新着コメントから自動再開します
en.ratePausedBody = Translation will resume automatically from new comments in about {seconds} seconds.
ja.ratePausedSkipped = 休止中に投稿されたコメントは翻訳されません
en.ratePausedSkipped = Comments posted during the pause will not be translated.
ja.resyncingTitle = コメント取得の再開を準備中
en.resyncingTitle = Preparing to resume comment retrieval
```

Also require:

- active Stop and unavailable Start while paused/resyncing;
- usage display still showing the authoritative limit/count;
- heartbeat/feed refresh remaining enabled because top-level session status stays active.

- [ ] **Step 2: Run UI contracts to prove RED**

```bash
node scripts/comment-translator-per-minute-auto-resume-contract.mjs
node scripts/comment-translator-public-operator-session-ui-contract.mjs
node scripts/comment-translator-free-beta-usage-display-contract.mjs
```

Expected: FAIL because the Dock has no active-phase notice or copy.

- [ ] **Step 3: Add localized copy and a bounded notice**

Render one warning panel near the session state, not a modal or browser notification. Use only `activePhase`, `retryAfterSeconds`, usage count, and static localized text. Replace `{seconds}` only with a non-negative rounded server-provided number. Do not persist countdown or phase in browser storage.

Keep the existing Stop button enabled for `status === "active"`. Do not add a restart button. Existing Start remains unavailable because a session is active.

Add a dev-only visual route that passes a fixed sanitized `initialSessionState` into the Dock for `running`, `rate-paused`, and `resyncing`. The route must call `notFound()` when `process.env.NODE_ENV === "production"`; it must not call actions, provider runtime, target lookup, Supabase, or browser storage. Pass an explicit fixed signed-out account status with no account identifier into `PortalShell`, and mount the remote display-settings applier only for signed-in accounts, so the fixture cannot trigger the transitive account-session/Supabase lookup or signed-in browser preference storage. Add a contract proving the production guard, fixed state allowlist, actual phase-notice timer/storage/action isolation, and transitive `PortalShell` account boundary.

- [ ] **Step 4: Run UI contracts to GREEN**

Run the three commands from Step 2.

Expected: PASS with sanitized pause and resync markers.

- [ ] **Step 5: Commit the UI slice after commit approval**

```bash
git add app/tools/comment-translator/dev/per-minute-auto-resume/page.tsx
git add components/comment-translator/CommentTranslatorDock.tsx components/comment-translator/CommentTranslatorActivePhaseNotice.tsx components/comment-translator/CommentTranslatorCommentCard.tsx components/comment-translator/CommentTranslatorCreatorWaitlistPanel.tsx components/comment-translator/CommentTranslatorDockAtoms.tsx components/comment-translator/CommentTranslatorDockHeader.tsx components/comment-translator/CommentTranslatorFeedPanel.tsx components/comment-translator/CommentTranslatorSessionPanel.tsx components/comment-translator/CommentTranslatorSettingsPanel.tsx components/comment-translator/CommentTranslatorUsageSidebar.tsx components/comment-translator/comment-translator-dock-format.ts components/comment-translator/comment-translator-dock-model.ts components/comment-translator/useCommentTranslatorBrowserTimeZone.ts components/comment-translator/useCommentTranslatorCreatorWaitlist.ts components/comment-translator/useCommentTranslatorDockControls.ts components/comment-translator/useCommentTranslatorSessionFeedController.ts
git add components/portal/PortalShell.tsx
git add lib/comment-translator.ts lib/comment-translator-copy-en.json lib/comment-translator-copy-ja.json lib/comment-translator-fixture-comments.ts lib/comment-translator-runtime.ts lib/comment-translator-snapshot-data.ts lib/comment-translator-types.ts
git add scripts/account-remote-display-settings-contract.mjs scripts/comment-translator-per-minute-auto-resume-contract.mjs scripts/comment-translator-public-operator-session-ui-contract.mjs scripts/comment-translator-free-beta-usage-display-contract.mjs
git add docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_IMPLEMENTATION_PLAN.md task.md
git commit -m "[codex] Show automatic per-minute pause recovery"
```

### Task 6: Lock accounting, preview override, and terminal regressions

**Files:**

- Modify: `scripts/comment-translator-azure-normal-translation-execution-contract.mjs`
- Modify: `scripts/comment-translator-pl-g6d-preview-rate-limit-smoke-override-contract.mjs`
- Modify: `scripts/comment-translator-start-stop-reason-ux-contract.mjs`
- Modify: `scripts/comment-translator-provider-execution-runtime-contract.mjs`
- Modify: `scripts/comment-translator-per-minute-auto-resume-contract.mjs`

- [ ] **Step 1: Add regression-only accounting and compatibility cases**

All changed pause/session behavior tests were written RED-first in Tasks 1-5. This task does not change provider execution or entitlement logic; these cases are expected to pass before and after the slice and guard against accidental drift.

Assert:

- a capacity-fitting cache-miss batch executes through the limit;
- an over-capacity cache-miss batch remains atomically blocked before provider execution;
- cache-only-at-cap completes with no provider/durable usage;
- mixed over-capacity cache-hit/cache-miss remains atomically blocked with no usage;
- filtered/non-provider-executed messages never increment the rolling count;
- production/unset/malformed/non-allowed states remain 30;
- only Cloudflare preview + exact reviewed marker + allowed tester receives fixed smoke limit 5;
- preview and production use identical pause/resume semantics after entitlement resolution;
- `translated-message-cap` no longer maps to terminal UI stop during an active session, while legacy stopped records remain renderable and other reasons are unchanged.

- [ ] **Step 2: Run accounting and override regression contracts**

```bash
node scripts/comment-translator-azure-normal-translation-execution-contract.mjs
node scripts/comment-translator-pl-g6d-preview-rate-limit-smoke-override-contract.mjs
node scripts/comment-translator-start-stop-reason-ux-contract.mjs
node scripts/comment-translator-provider-execution-runtime-contract.mjs
node scripts/comment-translator-per-minute-auto-resume-contract.mjs
```

Expected: accounting, entitlement, cache, and provider-runtime cases PASS. Only obsolete active-session terminal-stop assertions may fail and must be replaced by the RED-first focused assertions already added in Tasks 1-5; do not weaken stopped-record compatibility.

- [ ] **Step 3: Make only the minimal contract-aligned adjustments**

Do not change the fixed limits, marker label, allowed-tester hash boundary, provider cache semantics, monthly accounting, or terminal reason compatibility. Update sibling allowlists for every shared runtime/UI file actually changed.

- [ ] **Step 4: Run accounting and override contracts to GREEN**

Run all five commands from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit the regression-contract slice after commit approval**

```bash
git add scripts/comment-translator-azure-normal-translation-execution-contract.mjs scripts/comment-translator-pl-g6d-preview-rate-limit-smoke-override-contract.mjs scripts/comment-translator-start-stop-reason-ux-contract.mjs scripts/comment-translator-provider-execution-runtime-contract.mjs scripts/comment-translator-per-minute-auto-resume-contract.mjs
git commit -m "[codex] Lock per-minute auto-resume contracts"
```

### Task 7: Complete local verification, UI widths, and new-PR handoff

**Files:**

- Modify: `docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_DESIGN.md`
- Modify: `task.md`
- Review: every changed file against `origin/codex/comment-translator-free-public-beta-integration`

- [ ] **Step 1: Run the focused and sibling contract bundle**

```bash
node scripts/comment-translator-per-minute-auto-resume-contract.mjs
node scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs
node scripts/comment-translator-usage-quota-budget-ledger-contract.mjs
node scripts/comment-translator-session-start-stop-contract.mjs
node scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs
node scripts/comment-translator-free-beta-usage-display-contract.mjs
node scripts/comment-translator-azure-normal-translation-execution-contract.mjs
node scripts/comment-translator-public-operator-session-ui-contract.mjs
node scripts/comment-translator-ui-live-provider-runtime-contract.mjs
node scripts/comment-translator-real-comments-ui-wiring-contract.mjs
node scripts/comment-translator-start-stop-reason-ux-contract.mjs
node scripts/comment-translator-pl-g6d-preview-rate-limit-smoke-override-contract.mjs
node scripts/comment-translator-provider-execution-runtime-contract.mjs
```

Expected: all commands exit 0.

- [ ] **Step 2: Run repository verification**

```bash
npm run lint
npx tsc --noEmit --pretty false
npm run build
git diff --check
```

Expected: all exit 0. Record existing non-blocking build warnings separately; do not label environment/tooling failures as product regressions.

- [ ] **Step 3: Run sanitized changed-files scans**

Run these exact count-only scans from Git Bash:

```bash
base=origin/codex/comment-translator-free-public-beta-integration
changed_file_count=$(git diff --name-only "$base"...HEAD | sed '/^$/d' | wc -l | tr -d ' ')
secret_match_count=$( (git diff --name-only -z "$base"...HEAD | xargs -0 -r rg -I -l '(-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})' 2>/dev/null || true) | wc -l | tr -d ' ')
ts_file_count=$( (git diff --name-only "$base"...HEAD | rg '\.(ts|tsx)$' || true) | wc -l | tr -d ' ')
type_suppression_count=$( (git diff --name-only -z "$base"...HEAD | xargs -0 -r rg -I -n '(@ts-ignore|@ts-expect-error|\bas any\b)' --glob '*.ts' --glob '*.tsx' 2>/dev/null || true) | wc -l | tr -d ' ')
printf 'changed_files=%s\nhigh_confidence_secret_matches=%s\nchanged_ts_tsx_files=%s\ntype_suppression_matches=%s\n' "$changed_file_count" "$secret_match_count" "$ts_file_count" "$type_suppression_count"
test "$secret_match_count" -eq 0
test "$type_suppression_count" -eq 0
```

Report only:

```text
changed_files=<count>
high_confidence_secret_matches=0
changed_ts_tsx_files=<count>
type_suppression_matches=0
```

Do not print matching content, environment values, provider data, IDs, tokens, cookies, headers, browser storage, raw comments, raw payloads, or raw SQL.

- [ ] **Step 4: Perform local fixture-based width QA**

Start the exact local fixture server:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Use `@browser:control-in-app-browser` and `@omo:visual-qa` against only:

```text
http://127.0.0.1:3100/tools/comment-translator/dev/per-minute-auto-resume?phase=running
http://127.0.0.1:3100/tools/comment-translator/dev/per-minute-auto-resume?phase=rate-paused
http://127.0.0.1:3100/tools/comment-translator/dev/per-minute-auto-resume?phase=resyncing
```

The route injects one of three fixed sanitized states through the Dock's `initialSessionState` prop; query input is allowlisted and defaults to `running`. Verify each state at `390 / 820 / 1024 / 1280 / 1366px`.

Check: `document.documentElement.scrollWidth <= window.innerWidth`; the expected `data-comment-translator-active-phase` marker is present once; countdown and warning wrap; Stop stays visible/enabled; Start stays unavailable; usage count remains legible; Japanese and English copy do not overlap; console error count is zero; network calls to YouTube/provider/Supabase are zero.

Record only width, phase label, overflow pass/fail, marker count, console-error count, and forbidden-network count. Stop the local server after QA. Production build/runtime access to the fixture URL must return 404 by contract; do not deploy it for QA.

- [ ] **Step 5: Update operational records**

Record implementation status, exact local commands, pass/fail, width results, counts-only scans, residual risks, and non-actions in the design doc and `task.md`. Keep the earlier production attempt record unchanged:

```text
total=31
peak_rolling=14-of-30
boundary_status=inconclusive-window-not-saturated
post_stop=pass
post_stop_window=0-of-30
```

- [ ] **Step 6: Review the final diff and commit docs after commit approval**

```bash
git diff --stat origin/codex/comment-translator-free-public-beta-integration...HEAD
git diff --check
git status --short
git add docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_DESIGN.md task.md
git commit -m "[codex] Record per-minute auto-resume verification"
```

- [ ] **Step 7: Stop before push and new PR**

Report local commits, verification, width QA, and clean/dirty status. Request exact same-thread approval before:

```bash
git push -u origin codex/comment-translator-per-minute-auto-resume
gh pr create --draft --base codex/comment-translator-free-public-beta-integration --head codex/comment-translator-per-minute-auto-resume
```

The PR must be new and must not reuse or modify PR #632. Do not merge it. Do not apply Cloudflare variables or deploy after PR creation.

## Execution Skills

- Use `@superpowers:subagent-driven-development` for implementation tasks because subagents are available.
- Use `@superpowers:test-driven-development` for every behavioral change: observe RED before implementation, then GREEN.
- Use `@omo:programming` for TypeScript changes and strict type safety.
- Use `@omo:frontend` for the Dock state/copy change.
- Use `@omo:visual-qa` after the rendered UI change.
- Use `@verification-before-completion` before each completion or commit claim.
- Use `@omo:git-master` for branch, commit, and history operations.
