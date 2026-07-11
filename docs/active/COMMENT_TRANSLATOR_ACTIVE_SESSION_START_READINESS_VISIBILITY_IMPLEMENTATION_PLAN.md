# Comment Translator Active Start Readiness Visibility Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the entire Start readiness panel while a Comment Translator session is active, without changing Start/Stop controls or pre-start and terminal recovery guidance.

**Architecture:** Add one pure UI visibility predicate keyed only by the browser-safe session status, consume it at the existing readiness-panel boundary, and lock the active/pre-start/stopped state matrix with an executable contract. Reuse the existing fixture and visual system; add no copy, styles, storage, provider, or server behavior.

**Tech Stack:** Next.js 16, React, strict TypeScript, Node contract scripts, local Playwright fixture QA.

---

## Chunk 1: Behavior and contract

### Task 1: Lock the visibility matrix RED-first

**Files:**
- Create: `components/comment-translator/comment-translator-session-panel-visibility.ts`
- Modify: `scripts/comment-translator-public-operator-session-ui-contract.mjs`

- [x] Add executable assertions for `not-started -> true`, `active -> false`, and `stopped -> true` using a pure `shouldShowCommentTranslatorStartReadiness` predicate.
- [x] Run `node scripts/comment-translator-public-operator-session-ui-contract.mjs` and confirm RED because the predicate module does not exist.
- [x] Implement only the typed predicate:

```ts
import type { OperatorSessionState } from "./comment-translator-dock-model";

export function shouldShowCommentTranslatorStartReadiness(
  status: OperatorSessionState["status"]
): boolean {
  return status !== "active";
}
```

- [x] Run the focused contract and confirm the pure predicate assertions are GREEN before changing the component.

### Task 2: Apply the panel boundary

**Files:**
- Modify: `components/comment-translator/CommentTranslatorSessionPanel.tsx`
- Test: `scripts/comment-translator-public-operator-session-ui-contract.mjs`
- Modify changed-file allowlists: `scripts/comment-translator-free-beta-usage-display-contract.mjs`
- Modify changed-file allowlists: `scripts/comment-translator-start-stop-reason-ux-contract.mjs`
- Modify changed-file allowlists: `scripts/comment-translator-session-start-stop-contract.mjs`
- Modify changed-file allowlists: `scripts/comment-translator-azure-normal-translation-execution-contract.mjs`
- Modify changed-file allowlists: `scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs`
- Modify changed-file allowlists: `scripts/comment-translator-provider-execution-runtime-contract.mjs`
- Modify changed-file allowlists: `scripts/comment-translator-real-comments-ui-wiring-contract.mjs`
- Modify changed-file allowlists: `scripts/comment-translator-usage-quota-budget-ledger-contract.mjs`

- [x] Add a small `react-dom/server` rendering harness to the focused contract, with `next/link` stubbed only for local deterministic rendering.
- [x] Render all three active phases with stale credential, usage-policy, Start-rate-limit, and reconnect inputs. Assert every Start-readiness node is absent, Start remains rendered/disabled, Stop remains rendered/enabled, `running` has no phase notice, and paused/resyncing have exactly one existing phase notice.
- [x] Render pre-start and terminal-stopped states with real blocker inputs and assert the readiness panel plus blocker/reconnect nodes are present.
- [x] Sequentially render active then terminal-stopped props through the same component module and assert the latter markup restores readiness without reload-dependent state. Run the focused contract and confirm RED against the unchanged component.
- [x] Import the visibility predicate and compute it from `sessionState.status`.
- [x] Place the complete Start-readiness surface under the same non-active boundary: `data-comment-translator-start-contrast`, credential blocker, and reconnect guidance. Do not alter their contents, the Start/Stop actions, or the active-phase notice.
- [x] Run the focused rendered contract and confirm GREEN.
- [x] Add the design path, plan path, predicate path, component path, and focused contract path to all eight affected sibling changed-file allowlists instead of weakening their other assertions.
- [x] Run the focused contract and the affected siblings:

```text
node scripts/comment-translator-public-operator-session-ui-contract.mjs
node scripts/comment-translator-azure-normal-translation-execution-contract.mjs
node scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs
node scripts/comment-translator-free-beta-usage-display-contract.mjs
node scripts/comment-translator-provider-execution-runtime-contract.mjs
node scripts/comment-translator-real-comments-ui-wiring-contract.mjs
node scripts/comment-translator-start-stop-reason-ux-contract.mjs
node scripts/comment-translator-session-start-stop-contract.mjs
node scripts/comment-translator-usage-quota-budget-ledger-contract.mjs
```

Expected: all PASS.

## Chunk 2: Fixture QA and completion

### Task 3: Verify the active fixture states visually

**Files:**
- Modify only if required for deterministic assertions: `app/tools/comment-translator/dev/per-minute-auto-resume/page.tsx`
- Evidence only, do not commit: local fixture captures.

- [x] Preflight with `git fetch origin --prune`, confirm the branch is not `main`, confirm `git merge-base HEAD origin/codex/comment-translator-free-public-beta-integration` is the expected integration ancestor, and account for every dirty path.
- [x] Start the fixture on the local-only URL. Turbopack panicked on the external dependency junction, so use the official webpack development fallback.
- [x] Confirm the fixture route is production-404 by the existing contract; do not open preview or production.
- [x] Attempt the Playwright wrapper; after its pre-launch dependency fetch failed, use existing local Chrome/CDP to capture `running`, `rate-paused`, and `resyncing` at `390 / 820 / 1024 / 1280 / 1366px`.
- [x] Assert for every capture: Start remains visible and disabled, Stop remains visible and enabled, Start readiness panel count is zero, overflow is zero, and forbidden YouTube/provider/Supabase requests are zero.
- [x] Assert `running` has no replacement phase notice and `rate-paused` / `resyncing` retain exactly one existing active-phase notice.
- [x] Record only phase, width, element counts, enabled/disabled booleans, overflow pass/fail, console-error count, and forbidden-request count; do not record browser storage, comments, identifiers, or raw responses.
- [x] Stop the local server and remove QA output after reviewers finish; evidence is local-only and not committed.
- [x] Complete two read-only visual reviews against all 15 fresh captures and resolve blocking findings.

### Task 4: Run final verification and update task state

**Files:**
- Modify: `docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_DESIGN.md`
- Modify: `task.md`

- [x] Mark the 2026-07-11 visibility follow-up implemented after the behavior, contract, type, lint, diff, scan, and visual gates pass, while recording the fresh build environment limitation separately.
- [x] Record the branch, behavior, focused/sibling results, width QA, and prohibited operations in `task.md`.
- [x] Run:

```text
npm run lint
npx tsc --noEmit --pretty false
npm run build
git diff --check
```

Result: lint, TypeScript, and `git diff --check` passed. The fresh build rerun was environment-limited before product compilation because the external dependency junction no longer contained the required Next package; an earlier build on the identical production/test HEAD passed with only existing warnings.

- [x] Run changed-files high-confidence secret scan with pass/fail/count only.
- [x] Run changed TS/TSX `as any`, `@ts-ignore`, and `@ts-expect-error` scan with pass/fail/count only.
- [x] Inspect the final diff and confirm it contains only the visibility predicate, panel boundary, focused/render contract, eight sibling allowlist updates, design status, plan, and `task.md` update.
- [x] Commit the implementation, direct tests, and final verification records locally.
- [ ] Push the feature branch and open a new Draft PR targeting `codex/comment-translator-free-public-beta-integration`; not run in this local completion slice.

## Explicit non-actions

- No deploy/upload or preview/production browser smoke.
- No live/provider execution, OAuth flow, target lookup, Supabase operation, Cloudflare mutation, Stripe action, public gate/access change, or main promotion.
- No copy, CSS, design token, browser storage, session runtime, usage accounting, polling, cache, or provider behavior changes.
