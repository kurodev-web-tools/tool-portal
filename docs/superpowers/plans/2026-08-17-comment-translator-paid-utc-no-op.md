# Comment Translator Paid UTC No-op Handling Implementation Plan

> **For agentic workers:** This plan is executed in the current approved worktree. No commit, push, PR, deploy, Cron invocation, or external mutation is part of this plan.

**Goal:** Treat the Task 9 UTC-month close RPC's boolean `false` result as a successful no-op when no overdue cost bucket exists, while preserving fail-closed handling for RPC errors and invalid results.

**Architecture:** Keep the existing strict boolean parser for operations that require `true`. Add a close-UTC-month-specific parser that accepts either boolean result, throws only for an RPC error or non-boolean data, and returns the boolean as the `moreOverdueMonths` signal already expected by the reconciler. No Supabase migration or remote contract change is needed.

**Tech Stack:** TypeScript runtime module, Node.js ESM deterministic contract test, Node module loader hooks already used by the repository's paid-core contract scripts.

---

### Task 1: Add the regression contract for a UTC no-op result

**Files:**
- Create: `scripts/comment-translator-paid-usage-store-no-op-contract.mjs`
- Read-only reference: `lib/comment-translator-paid-usage-store.ts:419-637`

- [x] **Step 1: Write the failing test**

  Build the trusted usage store with a fake Supabase client whose RPC returns `{ data: false, error: null }` for `ct_paid_close_utc_month_reconciled`. Call `closeUtcMonth` with bounded fixture values and assert that it resolves to `false`. Also assert that an RPC error still rejects, so the new behavior is limited to a valid boolean no-op.

- [x] **Step 2: Run the regression contract and verify RED**

  Run: `node scripts/comment-translator-paid-usage-store-no-op-contract.mjs`

  Expected: FAIL because the current shared `readBoolean` helper rejects `data: false`.

### Task 2: Implement the narrow no-op parser

**Files:**
- Modify: `lib/comment-translator-paid-usage-store.ts:630-637,1164-1166`

- [x] **Step 1: Add a close-UTC-month-specific boolean reader**

  The helper must throw when `result.error` is present or `result.data` is not boolean, and otherwise return `result.data` unchanged.

- [x] **Step 2: Wire only `closeUtcMonth` to the new helper**

  Leave the existing strict `readBoolean` helper and all other callers unchanged.

### Task 3: Verify the fix and preserve the worktree boundary

**Files:**
- Verify only: `scripts/comment-translator-paid-usage-store-no-op-contract.mjs`, `lib/comment-translator-paid-usage-store.ts`

- [x] **Step 1: Run the new contract and verify GREEN**

  Run: `node scripts/comment-translator-paid-usage-store-no-op-contract.mjs`

  Expected: PASS for false no-op, true continuation, and RPC-error rejection.

- [x] **Step 2: Run the existing paid-core contract**

  Run: `node scripts/comment-translator-paid-core-v1-task9-retention-contract.mjs`

  Expected: PASS without changing the existing contract's unrelated assertions.

- [x] **Step 3: Run static verification**

  Run: `npm run lint`, `npx tsc --noEmit --pretty false`, and `git diff --check`.

  Expected: no new lint/type/diff errors; pre-existing unrelated failures must be reported separately.

- [x] **Step 4: Inspect the final diff and status**

  Confirm that existing user changes remain untouched, no secret/URL/raw error was added, and no commit or external operation was performed.
