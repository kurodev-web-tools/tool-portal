# Comment Translator Paid Core v1 Task 10 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the public Terms, Privacy, Tokushoho, Paid conditions, and operations runbook with the approved Paid Core v1 retention/security boundary without changing external configuration or runtime authority.

**Architecture:** Keep the existing data-driven legal document routes backed by `lib/legal-content.ts`, update the billing Paid-conditions disclosure to use the same canonical retention/provider wording, and add a repository-only runbook for dispute, kill-switch, provider, backlog, capacity, rollback, and expert-review gates. A focused Node contract will read these surfaces and the existing server/runtime boundaries, fail on stale or unsafe claims, and enforce sanitized output rules.

**Tech Stack:** Next.js/TypeScript legal content and billing copy, Markdown operational runbook, Node `node:assert` contract scripts, existing Task 2–9 contract scripts.

---

## Chunk 1: Task 10 legal/security/privacy implementation

### Task 1: Add the focused RED contract

**Files:**
- Create: `scripts/comment-translator-paid-core-v1-task10-legal-security-contract.mjs`
- Read: `lib/legal-content.ts`, `components/account/AccountBillingShell.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/legal/tokushoho/page.tsx`, `docs/active/COMMENT_TRANSLATOR_PAID_V1_RUNBOOK.md`

- [x] Assert the canonical price, renewal, maximum-not-guarantee, cancellation/refund, provider-send, JP/US/card/no-bank-transfer disclosures across the public legal and Paid-condition surfaces.
- [x] Assert the session-end-plus-24-hour sanitized feed snapshot exception and the no-copy boundary for Provider detail, logs, aggregates, and idempotency ledgers.
- [x] Assert distinct OpenAI up-to-30-day possibility, Azure policy, and service DB 24-hour retention wording.
- [x] Assert account deletion, dispute handling, owner-scoped stop, cancel-before-capacity-release, victory restoration conditions, kill switch, provider outage, webhook backlog, capacity, rollback, and expert-review checklist sections in the runbook.
- [x] Assert forbidden public claims and high-confidence secret/private-identifier patterns are absent from the changed surface.
- [x] Run the contract and capture the expected RED failure before changing production copy.

### Task 2: Update canonical legal content and Paid conditions

**Files:**
- Modify: `lib/legal-content.ts`
- Modify: `components/account/AccountBillingShell.tsx`
- Read: `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/legal/tokushoho/page.tsx`

- [x] Replace stale “preparing” and “no permanent comment log” claims with the approved Paid v1 terms and actual sanitized snapshot boundary.
- [x] Keep Terms, Privacy, Tokushoho, and billing Paid conditions semantically identical for price, limits, provider transmission, retention, cancellation/refund, deletion, and dispute handling.
- [x] Do not add legal conclusions for tax, Tokushoho, privacy, provider retention, or ZDR; label expert/legal verification as pending.

### Task 3: Add the Paid operations runbook

**Files:**
- Create: `docs/active/COMMENT_TRANSLATOR_PAID_V1_RUNBOOK.md`

- [x] Document sanitized operator checks and fail-closed actions for owner-scoped dispute stops, user-win cancel and capacity release, operator-win restoration, kill switches, Provider outage/circuit, Webhook backlog, capacity/infra thresholds, and rollback.
- [x] Keep external settings, live actions, Gate 0, Task 11, deploy, activation, and publication explicitly approval-gated and unexecuted.
- [x] Include a legal/tax/privacy expert-review checklist with unresolved items stated as unknown/pending.

### Task 4: Run focused GREEN and sibling verification

**Files:**
- Verify: changed files and Task 2–9/Free baseline contracts

- [x] Run the Task 10 contract and the Task 8/9 plus sibling/Free legal/privacy contracts.
- [x] Run changed `.ts`/`.mjs` syntax checks, JSON parsing, high-confidence secret/private-identifier scans, and `git diff --check`.
- [x] Attempt `npm run lint`, `npx tsc --noEmit --pretty false`, and `npm run build` without installing dependencies; classify missing tooling as setup-blocked.
- [x] If no browser-startable route is available because dependencies are missing, record width/JA-EN/keyboard/focus/overflow/console QA as setup-blocked rather than PASS.

### Task 5: Read-only semantic review and acceptance

**Files:**
- Verify: actual diff and reviewer output

- [x] Obtain `sol-reviewer` (`gpt-5.6-sol`, `medium`) read-only review.
- [x] Apply only specification-mismatch corrections, if any, then rerun affected checks.
- [x] Leave task.md untouched because it is root-owned; return repository-implemented, locally-verified, setup-blocked, externally-unverified, and approval-gated evidence to the parent.
