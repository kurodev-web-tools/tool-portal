# Comment Translator Creator NC-X5 Bounded CSV Import Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved, server-owned, all-replacement NC-C1 glossary CSV import with preview, cancel, atomic apply, and no AI suggestion.

**Architecture:** Keep parsing and normalization in a dependency-free server-only state machine. Server actions derive caller authority from the existing action-context seam, read/write only through the trusted NC-C1 store/runtime, and reparse original bytes on apply. The client panel stores only bytes and preview state in component memory and never selects owner, plan, provider, storage, or activation authority.

**Tech Stack:** TypeScript, Next server actions, React client component, existing NC-C1 glossary runtime/store, Node contract scripts. No dependency or manifest changes.

---

## Chunk 1: Approved design and focused RED contract

**Files:**

- Create: `docs/superpowers/specs/2026-08-10-comment-translator-creator-nc-x5-bounded-csv-import-design.md`
- Create: `docs/superpowers/plans/2026-08-10-comment-translator-creator-nc-x5-bounded-csv-import.md`
- Create: `scripts/comment-translator-creator-nc-x5-bounded-csv-import-contract.mjs`

- [x] **Step 1: Record the handoff design and exact file ownership**

  Keep this spec limited to NC-C1 bounded CSV import. Do not add suggestion/provider, schema/RPC/migration, Paid activation, deployment, or route wiring.

- [x] **Step 2: Write the failing focused contract**

  Assert source/file ownership and runtime behavior for the parser, actions, and panel. Cover the approved CSV matrix, fixed sanitized result classes, write counts, same-byte apply reparse, owner/version authority, and forbidden storage/provider/private surfaces. The contract must load TypeScript without installing dependencies.

- [x] **Step 3: Run the focused contract and verify RED**

  Run:

  ```powershell
  node scripts/comment-translator-creator-nc-x5-bounded-csv-import-contract.mjs
  ```

  Expected: failure caused by the missing parser/action/panel implementation, not a setup error.

## Chunk 2: Dependency-free parser and normalizer

**Files:**

- Create: `lib/comment-translator-creator-glossary-csv-import.ts`

- [x] **Step 1: Implement the byte/decode boundary**

  Reject bytes over 128 KiB before decode, reject UTF-16/32 BOMs and invalid UTF-8, remove only one optional UTF-8 BOM, and reject NUL/disallowed controls.

- [x] **Step 2: Implement the deterministic CSV state machine**

  Support exact four-column header, comma/quote escaping, quoted CRLF/LF, doubled quotes, and EOF. Reject bare CR, unclosed quote, trailing data after a closing quote, blank logical rows, header-only input, unexpected columns, and rows over 30.

- [x] **Step 3: Implement existing-contract normalization and injection checks**

  Apply NFKC, whitespace folding, language aliases/pattern, code-point bounds, note empty-to-null, formula-leading rejection, and collision detection. Sort normalized entries using the NC-C1 order and return only fixed failure classes.

- [x] **Step 4: Run the focused contract and verify GREEN for parser cases**

  Re-run the contract. Expected: all parser fixtures pass while action/panel assertions may remain failing until later chunks.

## Chunk 3: Authenticated preview/apply actions

**Files:**

- Create: `app/tools/comment-translator/glossary-actions.ts`

- [x] **Step 1: Add server-owned preview action**

  Use only `readCommentTranslatorCreatorActionCallerAuthority()`, `createTrustedCommentTranslatorCreatorGlossaryStore()`, and `createCommentTranslatorCreatorGlossaryRuntime(...)`. Read current status/version, map missing to expectedVersion `0`, parse bytes on the server, return a sanitized normalized preview, and never call replace.

- [x] **Step 2: Add server-owned apply action**

  Accept only original bytes and previewed expectedVersion. Re-read caller/current glossary, reparse original bytes, fail closed on stale/unavailable/invalid, and invoke `runtime.replace(...)` exactly once for a fresh valid apply. Map all internal failures to fixed UI-safe classes.

- [x] **Step 3: Run action contract cases and verify GREEN**

  Verify unauthenticated/unavailable/unreadable/missing/existing/stale/fresh cases, zero write on preview/cancel/stale/failure, single replace on success, and server-derived owner only.

## Chunk 4: Deterministic client-memory panel

**Files:**

- Create: `components/comment-translator/CommentTranslatorCreatorGlossaryImportPanel.tsx`

- [x] **Step 1: Implement file selection and preview state**

  Convert the selected File to bytes in component memory, require an explicit Preview button, render only safe normalized rows, and show fixed sanitized errors.

- [x] **Step 2: Implement cancel and explicit apply**

  Clear file/bytes/preview in memory only on Cancel. Keep Apply disabled until a ready preview, send the same bytes plus the server-returned expectedVersion only on explicit Apply, and prevent duplicate pending calls.

- [x] **Step 3: Run panel/source contract and verify GREEN**

  Confirm no localStorage/sessionStorage/indexedDB/useEffect/query authority/provider/storage/owner/plan/private payload/logging or automatic persistence/wiring exists.

## Chunk 5: Root acceptance and reconciliation

**Files:**

- Modify minimally only if evidence requires: `task.md`, `scripts/comment-translator-current-task-roadmap-reconciliation-contract.mjs`
- Inspect: all new files and existing relevant contracts

- [x] **Step 1: Run focused and relevant existing contracts**

  Run NC-X5, NC-C1, current-task reconciliation, NC-F1, NC-E1, NC-P1, NC-Q1, Free permanence, auth/entitlement, provider, token/session/browser-authority contracts that are relevant to the changed boundary.

- [x] **Step 2: Inspect scope and security hygiene**

  Run `git diff --check`, `git diff --stat`, full diff/root scope inspection, and scans for secrets/tokens/cookies/raw/private/provider payloads, browser storage, owner/query authority, logs, R2, migration/RPC/schema/config/binding, and package/lock changes.

- [x] **Step 3: Classify dependency-backed checks**

  If `node_modules` remains absent, do not install and record lint/typecheck/build/OpenNext as setup-blocked. If present, run only repository-supported checks without manifest/lockfile changes.

- [x] **Step 4: Reconcile current task evidence minimally**

  Replace stale NC-X3 current-lane facts only with verified NC-X5 implementation evidence; preserve Free permanent, Paid `0/8` NO-GO, nine unresolved hard requirements, activation closed, NC-L1 not-started, and deployment UNKNOWN.

- [x] **Step 5: Stop at read-only review handoff**

  Send the finished diff to a fresh `sol-reviewer` (`gpt-5.6-sol` / `medium`) read-only. If it lists mismatches, route only those corrections to `sol-repairer` (`gpt-5.6-sol` / `medium`), then re-inspect and rerun affected checks. Do not commit, push, create PR, merge, deploy, activate, or clean up.

## Review checkpoint

- fresh `sol-reviewer` found no Critical/Important issues and listed only two Minor corrections: clear the selected-file label on read failure and remove the stale NC-X3 selected marker from `task.md`.
- fresh `sol-repairer` changed only the three owned paths for those corrections and reported focused NC-X5, task reconciliation, and `git diff --check` exit 0.
- root re-inspected the actual diff and reran the affected contracts plus the relevant dependency-free NC-C1/F1/E1/P1/Q1/D1, existing NC-X3, and token/browser authority contracts; all rerun commands exited 0.
