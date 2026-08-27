# Comment Translator Paid Checkout Expiry Finalize Lease Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve a reconciler-owned Checkout expiry lease until the common finalizer so a successful terminal release is reported as success rather than stale.

**Architecture:** Add a focused contract first, then add one additive migration that redefines the existing expiry RPC. The RPC keeps all existing fail-closed guards and conditionally preserves only a supplied, validated reconciler lease.

**Tech Stack:** PostgreSQL/PLpgSQL, Supabase migrations, Node.js source contracts, TypeScript.

---

## Chunk 1: Regression Contract and Repair

### Task 1: Add the failing lease-finalization contract

**Files:**
- Create: `scripts/comment-translator-paid-core-v1-gate0a-checkout-expiry-finalize-lease-contract.mjs`

- [ ] Assert the new migration exists and historical migration bytes remain unchanged.
- [ ] Assert the redefined RPC preserves a validated non-null reconciler lease.
- [ ] Assert a null-authority direct call clears lease token/until.
- [ ] Assert `p_owner_user_id is null` is rejected before any owner comparison or mutation.
- [ ] Assert Session status, checked-at max expiry, owner/hold/binding, subscription/entitlement, capacity, signature, and service-role-only guards remain present.
- [ ] Add a shared-state deterministic fixture in the same focused contract: the expiry action terminalizes without clearing its claimed lease, the common finalizer consumes that lease, and the run returns `success` with `stale=0`, retry=0, and no failure-safety call.
- [ ] Run the focused contract and record the expected RED caused by the missing migration.

### Task 2: Add the minimal additive migration

**Files:**
- Create: `supabase/migrations/<generated>_comment_translator_paid_checkout_expiry_finalize_lease.sql`

- [ ] Generate the migration filename with `supabase migration new` when the existing CLI is available; otherwise report setup-blocked before inventing a filename.
- [ ] Copy the deployed RPC definition, add explicit null-owner rejection, and change terminal lease assignment to conditional preservation for non-null validated lease authority.
- [ ] Revoke default/public execute and grant only `service_role` execute.
- [ ] Run the focused contract and confirm GREEN.

## Chunk 2: Verification and Review

### Task 3: Run bounded verification

**Files:**
- Verify only; no additional production files expected.

- [ ] Run Gate 0-A checkout recovery, unbound recovery, legacy expiry, recovery floor/canonicalization, Stripe diagnostic, and Task 9 contracts.
- [ ] Run store/schema/migration-parser contracts, Node syntax, TypeScript noEmit, focused lint, and `git diff --check`.
- [ ] Inspect the root diff and confirm historical migrations, `task.md`, `AGENTS.md`, manifests, and lockfiles are unchanged.

### Task 4: Read-only semantic review

- [ ] Run `sol-reviewer / medium` read-only against the approved design and actual diff.
- [ ] Address only findings within the approved scope and rerun affected checks.
- [ ] Report local implementation separately from remote apply/deploy/external verification.
