# Comment Translator Task Board Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale operational surface in `task.md` with a compact Creator closed-beta roadmap while preserving every required paid/post-MVP ID, the Prompt Board future flow, historical evidence, and all existing contract guarantees.

**Architecture:** Copy the pre-cleanup `task.md` intact into a dated archive, introduce one active Creator closed-beta authority, and rebuild `task.md` as the short current index plus explicit compatibility anchors. A focused governance contract protects the user-required IDs and Prompt Board future material; the exact-base passing set must remain green and no new failure may be introduced before publication.

**Tech Stack:** Markdown governance documents, Node.js `.mjs` contract scripts, Git/GitHub PR workflow, Cloudflare-connected integration branch checks.

**Command Runtime:** Every shell command in this plan runs through the repository-approved Git Bash MCP on native Windows. PowerShell is used only for the exact native file-copy operation that preserves the legacy snapshot before source text is removed.

**Spec:** `docs/superpowers/specs/2026-07-22-comment-translator-task-board-cleanup-design.md`

**Base:** `e465e6b99a4c9082cd5f95b96ba585c15c37ab4a` on `codex/comment-translator-free-public-beta-integration`

---

## Chunk 1: Governance Preservation And Cleanup

### Task 1: Add the cleanup preservation contract

**Files:**
- Create: `scripts/comment-translator-task-board-creator-roadmap-contract.mjs`
- Create: `scripts/comment-translator-task-board-contract-suite.mjs`
- Create: `scripts/fixtures/comment-translator-task-board-contract-baseline.json`
- Read: `task.md`
- Read: `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`
- Later create: `docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md`
- Later create: `docs/archive/TASK_LEGACY_CONTRACT_LEDGER_2026-07-22.md`

- [ ] **Step 1: Create a deterministic contract for the required authorities**

The contract must fail closed when a required file is missing and define the exact approved base rows as literal arrays:

```js
const creatorRows = [
  "| C1 | Durable paid entitlement store | pending |",
  "| C2 | Stripe live Checkout / Portal / webhook closed-beta gate | pending / gated |",
  "| C3 | Paid usage and monthly reset | pending |",
  "| C4 | AI natural translation provider route | pending / gated |",
  "| C5 | OBS overlay token runtime | pending |",
  "| C6 | OBS overlay UI route | pending |",
  "| C7 | Moderator share token runtime | pending |",
  "| C8 | Moderator share UI route | pending |",
  "| C9 | Custom dictionary minimum | pending |",
  "| C10 | Priority display polish | pending |",
  "| C11 | Simple 7-day history | pending |",
  "| C12 | Creator closed beta final QA | pending |",
];

const creatorPublicRows = [
  "| CP1 | Creator paid launch readiness | pending |",
  "| CP2 | Creator public paid gate flip | pending / gated |",
];

const publicAfterP1Rows = [
  "| P1-1 | `streamList` primary migration | later |",
  "| P1-2 | 30-day history and search | later |",
  "| P1-3 | CSV export | later |",
  "| P1-4 | Overlay templates | later |",
  "| P1-5 | Dictionary import and suggestions | later |",
  "| P1-6 | AI operations helpers | later |",
  "| P1-7 | Provider comparisons | later |",
  "| P1-8 | Platform expansion | later |",
  "| P1-9 | Voice translation / subtitle work | later |",
];
```

Assert each exact row appears once in both `task.md` and the Creator authority. Also assert:

- `task.md` identifies Creator closed beta as P0 and C1 then C3 as the first sequence.
- `task.md` and the Creator authority each contain exact IDs C1-C12, CP1-CP2, and P1-1-P1-9 once each in their roadmap tables.
- `task.md` retains a P1 Prompt Board post-MVP entry linking `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`.
- the Prompt Board authority still contains `MVP対象外`, `Implementation Task Order`, `Schedule Calendar`, and the browser-only / no-login boundary.
- the archive exists, declares itself historical/non-authoritative, and preserves `Current Free Public Beta State`, `Public Launch Next Flow`, `Pre-Step 5 Hardening Board`, and `Latest Sanitized Evidence Summary`.
- incomplete, missing, unreadable, or inactive Paid entitlement degrades to Free / paid-inactive.
- the cleanup docs state that C1/C3 implementation, Stripe/Supabase/provider mutation, and manual deploy are out of scope.

- [ ] **Step 2: Create the sanitized baseline-comparator runner**

The runner and manifest must:

- recursively discover `scripts/*.mjs` files whose text contains `task` + `.md`;
- exclude only itself;
- sort paths deterministically;
- validate the manifest's exact 170 base paths, including 43 base-pass and 127 base-fail classifications;
- execute each file with `process.execPath` and a bounded timeout;
- classify results as `PRESERVED_PASS`, `REGRESSION`, `BASELINE_FAIL`, `RECOVERED`, `NEW_PASS`, or `NEW_FAIL` without stdout/stderr/body values;
- finish with `baseline_total=170 baseline_pass=43 preserved_pass=<n> regressions=<n> baseline_fail=<n> new_pass=<n> new_fail=<n> baseline_scripts_modified=<n>`;
- exit non-zero for a focused contract failure, regression, missing baseline path, manifest mismatch, any change to the 170 baseline scripts, or new failure.

- [ ] **Step 3: Run the focused contract and confirm RED**

Run:

```bash
node scripts/comment-translator-task-board-creator-roadmap-contract.mjs
```

Expected: non-zero because the Creator authority and dated archive do not yet exist and the current task index does not select Creator closed beta.

### Task 2: Preserve history and add the Creator authority

**Files:**
- Copy: `task.md` → `docs/archive/TASK_LEGACY_CONTRACT_LEDGER_2026-07-22.md`
- Create: `docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md`

- [ ] **Step 1: Copy the exact pre-cleanup task board into the archive**

Before changing `task.md`, resolve and verify both absolute paths are inside the task worktree, then use PowerShell `Copy-Item -LiteralPath` to copy the untouched original to `docs/archive/TASK_LEGACY_CONTRACT_LEDGER_2026-07-22.md`. Keep `task.md` in place. Add an archive header with `apply_patch` that records:

- snapshot date `2026-07-22`;
- source integration base `e465e6b99a4c9082cd5f95b96ba585c15c37ab4a`;
- historical/non-authoritative status;
- current authorities are the new compact `task.md` and Creator active board;
- no secrets, private identifiers, provider metadata, or credential values are added.

Do not delete any historical section from the archived body.

Verify the copied legacy body hash matches the original source body before adding the archive-only header, or compare the archived body after the header byte-for-byte with the untouched source.

- [ ] **Step 2: Create the Creator closed-beta task board**

The active board must contain:

- current state: Free public beta complete, Creator closed beta next;
- dependency order: C1 → C3, then separately gated C2/C4 and user-visible C5-C11, ending C12;
- exact tables preserving C1-C12, CP1-CP2, P1-1-P1-9 names and statuses from the base task board;
- C1 acceptance boundary: durable server-owned entitlement rows, signed billing evidence input, sanitized output, Free fallback on missing/unreadable/inactive state;
- C3 handoff boundary: paid usage counters and monthly reset remain blocked until C1 is merged and verified;
- explicit non-actions for Supabase remote apply, Stripe live actions, provider execution, Cloudflare mutation/manual deploy, and production gate changes;
- PR target `codex/comment-translator-free-public-beta-integration` through short-lived branches.

### Task 3: Rebuild the current task board and reconcile Prompt Board status

**Files:**
- Modify: `task.md`
- Modify: `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`

- [ ] **Step 1: Add the new current surface while retaining the full legacy body**

Before removing any historical text, add only the new current index, Creator sequence, authority links, and approval boundaries above the existing `Legacy Contract Compatibility Ledger`. Keep the entire old ledger body and its existing single copies of all 23 roadmap rows in `task.md` during this phase. Do not add duplicate roadmap tables until compaction replaces the legacy ledger; this keeps the focused contract's exact-row count at one before and after compaction.

Run the focused preservation contract and the baseline-comparator runner. Expected: focused PASS, `preserved_pass=43`, `regressions=0`, `new_pass=1`, `new_fail=0`, and `baseline_scripts_modified=0`. The 127 exact-base failures remain explicitly classified as pre-existing and are not reported as successful.

- [ ] **Step 2: Compact the current `task.md` only after the first baseline-aware no-regression gate**

Use this heading order:

1. `Current Task Index`
2. `Current Premises`
3. `Current Comment Translator Sequence`
4. `Account Limits / Entitlement Control`
5. `Approval-Gated Actions`
6. `Canonical Documents`
7. `Initial Release Decisions`
8. `Later Work / Post-MVP Roadmap`
9. `Verification Baseline`
10. `Legacy Contract Compatibility Anchors`

Required content:

- P0 Creator closed beta, with C1 then C3 and the new authority link;
- completed Free public beta checkpoint and existing launch authority links;
- P1 Prompt Board marked MVP-complete/post-MVP, preserving its active authority link;
- exact C1-C12, CP1-CP2, P1-1-P1-9 roadmap tables and meanings;
- Free limits and fail-closed Paid degradation;
- current approval boundaries and canonical document pointers;
- archive pointer and a statement that new long-form history belongs outside `task.md`;
- minimal legacy phrases required by behavioral/security contracts, without copying old branch narratives back into the current surface.

- [ ] **Step 3: Update Prompt Board current status without removing future flow**

Update only stale current-selection/checkpoint labels to record:

- PR #660 promotion to main;
- PR #663 delete-dialog follow-up merged to main;
- MVP complete but post-MVP development remains available;
- existing `MVP対象外`, `Implementation Task Order`, Schedule Calendar adapter candidate, browser-only storage boundaries, and future candidates remain unchanged.

- [ ] **Step 4: Run the focused and complete contract sets after compaction**

Run:

```bash
node scripts/comment-translator-task-board-creator-roadmap-contract.mjs
node scripts/comment-translator-task-board-contract-suite.mjs
```

Expected: the focused contract exits 0 with one success marker and the comparator reports `preserved_pass=43`, `regressions=0`, `new_fail=0`, and `baseline_scripts_modified=0`. This second baseline-aware run is mandatory after legacy duplication is removed.

### Task 4: Eliminate exact-base regressions

**Files:**
- Prefer modifying: `task.md` compatibility anchors
- Read: `docs/archive/TASK_LEGACY_CONTRACT_LEDGER_2026-07-22.md`
- Read: current canonical `docs/active/*.md`
- Read-only: the existing 170 task-reading `scripts/*.mjs`

- [ ] **Step 1: Recompute and execute the task-reading contract set**

Run:

```bash
node scripts/comment-translator-task-board-contract-suite.mjs
```

Expected: the exact base manifest remains 170 paths with 43 PASS / 127 FAIL, all 43 base-pass contracts remain PASS, no new contract fails, and `baseline_scripts_modified=0` across all 170 existing scripts.

- [ ] **Step 2: Fix failures using the smallest safe compatibility path**

For each regression from the 43 exact-base passing contracts, use this order:

1. restore a short truthful compatibility anchor in `task.md` when it remains an active invariant;
2. keep all existing 170 contract scripts read-only, including the 127 baseline-fail files;
3. never remove or weaken runtime, secret, server-only, fail-closed, quota, billing, provider, or approval-boundary assertions;
4. if a regression cannot be resolved with a truthful anchor or current canonical authority, shrink compaction and retain the required source text.

After each change, rerun the affected base-pass contract. After all focused fixes, rerun the baseline comparator from the final working tree.

- [ ] **Step 3: Validate any changed contract scripts**

Build the file set from both tracked changes and untracked files, then run:

```bash
{
  git diff --name-only -z -- 'scripts/*.mjs'
  git ls-files --others --exclude-standard -z -- 'scripts/*.mjs'
} | while IFS= read -r -d '' file; do node --check "$file" || exit 1; done
```

Expected: exit 0 for every changed script.

### Task 5: Final verification and atomic cleanup commit

**Files:**
- Verify all changed files

- [ ] **Step 1: Verify required IDs and Prompt Board preservation**

Run the focused contract again and inspect the exact roadmap tables in `task.md` and the Creator authority. Compare Prompt Board future headings and Schedule Calendar text against base commit `e465e6b99a4c9082cd5f95b96ba585c15c37ab4a`.

Expected: no required ID or future boundary is missing or renamed.

- [ ] **Step 2: Run final repository-safe checks**

Run:

```bash
git diff --check
git status --short
```

Run the existing changed-file high-confidence secret/private-identifier scan used by the Comment Translator docs/contracts line, or an equivalent count-only scan that emits file counts and zero high-confidence matches without values.

Use this exact count-only Git Bash command; it never prints matching content:

```bash
base=e465e6b99a4c9082cd5f95b96ba585c15c37ab4a
mapfile -d '' changed_files < <({
  git diff --name-only -z "$base" --
  git ls-files --others --exclude-standard -z --
})
pattern='(sk_live_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,}|sb_secret_[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{30,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|Bearer[[:space:]]+[A-Za-z0-9._-]{20,}|(liveChatId|owner(User)?Id|projectRef|providerTarget)[[:space:]]*[:=][[:space:]]*["'"'][A-Za-z0-9_-]{12,}["'"'])'
matches=0
for file in "${changed_files[@]}"; do
  [ -f "$file" ] || continue
  count=$(rg -o -I -i "$pattern" -- "$file" | wc -l | tr -d ' ')
  matches=$((matches + count))
done
printf 'changed_files=%s high_confidence_secret_private_identifier_matches=%s\n' "${#changed_files[@]}" "$matches"
test "$matches" -eq 0
```

Expected: `git diff --check` exit 0 and `high_confidence_secret_private_identifier_matches=0`.

- [ ] **Step 3: Review the full diff and commit**

Confirm the diff contains only:

- approved spec/plan docs;
- dated task archive;
- new Creator active authority;
- compact `task.md`;
- Prompt Board status-only reconciliation;
- focused preservation/compatibility contracts.

Commit message:

```text
docs: prepare creator closed beta task board
```

### Task 6: Publish, verify, and merge the cleanup PR

**Files:**
- No new local files

- [ ] **Step 1: Recheck integration containment before push**

Fetch origin, confirm the branch still contains the latest integration tip, and stop for reconciliation if integration moved.

- [ ] **Step 2: Push the cleanup branch and create the PR**

Create a ready PR targeting `codex/comment-translator-free-public-beta-integration`. The body must list preservation guarantees, `43/43` base-pass preserved, `regressions=0`, `127` pre-existing baseline failures, `baseline scripts modified=0`, checks run, archive path, no runtime/UI change, and excluded external operations. Do not claim that all historical contracts passed.

- [ ] **Step 3: Verify GitHub checks and mergeability**

Required checks must complete successfully and the PR must be mergeable. A failed or pending required check blocks merge.

- [ ] **Step 4: Merge under the approval already recorded in the spec**

Use a normal merge, do not force-push, and do not delete protected branches. Verify the merge commit is contained in integration.

- [ ] **Step 5: Observe the automatic preview build separately**

Read the check result for the exact integration merge commit. Do not run manual deploy or Cloudflare mutation. A failed preview build blocks completion reporting and C1 handoff.

- [ ] **Step 6: Prepare the C1 task handoff**

Create a separate Codex task rooted at the latest integration tip. Scope it only to C1 durable paid entitlement design/implementation; preserve C3 as the next task and keep Stripe live/Supabase remote/provider/deploy operations approval-gated.
