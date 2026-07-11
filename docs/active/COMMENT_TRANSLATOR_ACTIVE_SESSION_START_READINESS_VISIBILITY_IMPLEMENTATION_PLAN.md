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

- [ ] Add executable assertions for `not-started -> true`, `active -> false`, and `stopped -> true` using a pure `shouldShowCommentTranslatorStartReadiness` predicate.
- [ ] Run `node scripts/comment-translator-public-operator-session-ui-contract.mjs` and confirm RED because the predicate module does not exist.
- [ ] Implement only the typed predicate:

```ts
import type { OperatorSessionState } from "./comment-translator-dock-model";

export function shouldShowCommentTranslatorStartReadiness(
  status: OperatorSessionState["status"]
): boolean {
  return status !== "active";
}
```

- [ ] Run the focused contract and confirm the pure predicate assertions are GREEN before changing the component.

### Task 2: Apply the panel boundary

**Files:**
- Modify: `components/comment-translator/CommentTranslatorSessionPanel.tsx`
- Test: `scripts/comment-translator-public-operator-session-ui-contract.mjs`
- Modify changed-file allowlists: `scripts/comment-translator-free-beta-usage-display-contract.mjs`
- Modify changed-file allowlists: `scripts/comment-translator-start-stop-reason-ux-contract.mjs`
- Modify changed-file allowlists: `scripts/comment-translator-session-start-stop-contract.mjs`

- [ ] Add a small `react-dom/server` rendering harness to the focused contract, with `next/link` stubbed only for local deterministic rendering.
- [ ] Render all three active phases with stale credential, usage-policy, Start-rate-limit, and reconnect inputs. Assert every Start-readiness node is absent, Start remains rendered/disabled, Stop remains rendered/enabled, `running` has no phase notice, and paused/resyncing have exactly one existing phase notice.
- [ ] Render pre-start and terminal-stopped states with real blocker inputs and assert the readiness panel plus blocker/reconnect nodes are present.
- [ ] Sequentially render active then terminal-stopped props through the same component module and assert the latter markup restores readiness without reload-dependent state. Run the focused contract and confirm RED against the unchanged component.
- [ ] Import the visibility predicate and compute it from `sessionState.status`.
- [ ] Place the complete Start-readiness surface under the same non-active boundary: `data-comment-translator-start-contrast`, credential blocker, and reconnect guidance. Do not alter their contents, the Start/Stop actions, or the active-phase notice.
- [ ] Run the focused rendered contract and confirm GREEN.
- [ ] Add the design path, plan path, predicate path, component path, and focused contract path to the three affected sibling changed-file allowlists instead of weakening their other assertions.
- [ ] Run the focused contract and the siblings:

```text
node scripts/comment-translator-public-operator-session-ui-contract.mjs
node scripts/comment-translator-per-minute-auto-resume-contract.mjs
node scripts/comment-translator-free-beta-usage-display-contract.mjs
node scripts/comment-translator-start-stop-reason-ux-contract.mjs
node scripts/comment-translator-session-start-stop-contract.mjs
```

Expected: all PASS.

## Chunk 2: Fixture QA and completion

### Task 3: Verify the active fixture states visually

**Files:**
- Modify only if required for deterministic assertions: `app/tools/comment-translator/dev/per-minute-auto-resume/page.tsx`
- Evidence only, do not commit: local fixture captures.

- [ ] Preflight with `git fetch origin --prune`, confirm the branch is not `main`, confirm `git merge-base HEAD origin/codex/comment-translator-free-public-beta-integration` is the expected integration ancestor, and account for every dirty path.
- [ ] Start the fixture with `npm run dev -- --hostname 127.0.0.1 --port 3100`; use only `http://127.0.0.1:3100/tools/comment-translator/dev/per-minute-auto-resume?phase=<phase>`.
- [ ] Confirm the fixture route is production-404 by the existing contract; do not open preview or production.
- [ ] With Playwright, capture `running`, `rate-paused`, and `resyncing` at `390 / 820 / 1024 / 1280 / 1366px` into `output/playwright/comment-translator-active-start-readiness/`.
- [ ] Assert for every capture: Start remains visible and disabled, Stop remains visible and enabled, Start readiness panel count is zero, overflow is zero, and forbidden YouTube/provider/Supabase requests are zero.
- [ ] Assert `running` has no replacement phase notice and `rate-paused` / `resyncing` retain exactly one existing active-phase notice.
- [ ] Record only phase, width, element counts, enabled/disabled booleans, overflow pass/fail, console-error count, and forbidden-request count; do not record browser storage, comments, identifiers, or raw responses.
- [ ] Stop the local server and remove QA output after reviewers finish; evidence is local-only and not committed.
- [ ] Dispatch two read-only visual reviewers against all 15 fresh captures and resolve blocking findings.

### Task 4: Run final verification and update task state

**Files:**
- Modify: `docs/active/COMMENT_TRANSLATOR_PER_MINUTE_AUTO_RESUME_DESIGN.md`
- Modify: `task.md`

- [ ] Mark the 2026-07-11 visibility follow-up implemented only after fresh verification passes.
- [ ] Record the branch, behavior, focused/sibling results, width QA, and prohibited operations in `task.md`.
- [ ] Run:

```text
npm run lint
npx tsc --noEmit --pretty false
npm run build
git diff --check
```

- [ ] Run changed-files high-confidence secret scan with pass/fail/count only.
- [ ] Run changed TS/TSX `as any`, `@ts-ignore`, and `@ts-expect-error` scan with pass/fail/count only.
- [ ] Inspect the final diff and confirm it contains only the visibility predicate, panel boundary, focused/render contract, three sibling allowlist updates, design status, plan, and `task.md` update.
- [ ] Commit the implementation and direct tests together, push the feature branch, and open a new Draft PR targeting `codex/comment-translator-free-public-beta-integration`.

## Explicit non-actions

- No deploy/upload or preview/production browser smoke.
- No live/provider execution, OAuth flow, target lookup, Supabase operation, Cloudflare mutation, Stripe action, public gate/access change, or main promotion.
- No copy, CSS, design token, browser storage, session runtime, usage accounting, polling, cache, or provider behavior changes.
