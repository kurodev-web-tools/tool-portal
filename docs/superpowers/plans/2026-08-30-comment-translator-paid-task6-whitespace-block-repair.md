# Comment Translator Paid Task 6 Whitespace Block Repair Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make both unapplied Task 6 migrations accept exactly one semantically identical hardened uncertain-retry block despite PostgreSQL whitespace reflow, without relaxing any other guard.

**Architecture:** The focused Node contract first locks down a shared SQL source invariant: both migrations normalize whitespace in the semantic definition and canonical block, then compare exact normalized cardinality. Bounded-opening/stem and legacy-exclusion needles use that same normalized definition so token wrapping remains accepted while mixed legacy/hardened shapes remain fail-closed; canonical legacy positive repair checks stay exact.

**Tech Stack:** PostgreSQL PL/pgSQL migrations, Node.js `assert` focused contracts, Git.

---

## Chunk 1: Focused regression and minimal repair

### Task 1: Add the failing focused contract

**Files:**
- Modify: `scripts/comment-translator-paid-core-v1-task6-provider-contract.mjs`
- Test: `scripts/comment-translator-paid-core-v1-task6-provider-contract.mjs`

- [x] Add assertions that each unapplied migration normalizes both the semantic definition and canonical hardened uncertain block with `[[:space:]]+`.
- [x] Add assertions that every hardened-state classification uses the normalized operands and an exactly-one occurrence predicate.
- [x] Run `node scripts/comment-translator-paid-core-v1-task6-provider-contract.mjs` and confirm it fails because normalization is absent.

### Task 2: Implement the minimal migration repair

**Files:**
- Modify: `supabase/migrations/20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility.sql`
- Modify: `supabase/migrations/20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair.sql`

- [x] Add normalized semantic-definition and hardened-block variables to both migrations.
- [x] Refresh normalized values after every semantic-definition recomputation used by hardened-state classification.
- [x] Replace only hardened uncertain-block cardinality predicates with whitespace-normalized exactly-one/zero predicates as appropriate.
- [x] Run the focused provider contract and confirm it passes.

### Task 3: Verify scope and preserved boundaries

**Files:**
- Verify: the three implementation/test files above
- Verify: relevant Gate 0-A2 focused contracts

- [x] Run Node syntax checks for the focused contract.
- [x] Run the Task 6 provider contract and relevant Gate 0-A2 migration-history contract.
- [x] Run `git diff --check`, inspect `git diff --stat`, and review the complete scoped diff.
- [x] Confirm no remote operation, commit, push, or PR was performed; request the next approval separately.
