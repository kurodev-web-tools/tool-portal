# Comment Translator Creator NC-X3 Safe CSV Export Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Download the authenticated owner’s existing NC-H1 safe history projection as a bounded, formula-safe CSV attachment.

**Architecture:** Keep authorization in the existing server action and keep the browser out of owner, session, entitlement, and history selection. Add a server-only serializer with a fixed seven-column allowlist and 500-row fail-closed bound, then expose it through a fixed GET attachment route. Add only a static notice and download link to the existing safe-history panel.

**Tech Stack:** Next App Router route handlers, TypeScript, Web Streams/Response, existing server actions and safe-history types, repository contract scripts.

---

## Chunk 1: CSV serializer and contract

**Files:**

- Create: `lib/comment-translator-creator-history-csv.ts`
- Create: `scripts/comment-translator-creator-nc-x3-safe-csv-export-contract.mjs`

- [x] **Step 1: Write the failing focused contract**

  Cover the seven-column allowlist and order, safe UI mappings, 500-row bound, RFC quoting/newlines/Unicode, formula prefixes after whitespace/control characters, and the stable filename/header constants.

- [x] **Step 2: Run the focused contract and verify RED**

  Run `node scripts/comment-translator-creator-nc-x3-safe-csv-export-contract.mjs` and confirm failure is caused by the missing serializer contract, not a setup error.

- [x] **Step 3: Implement the minimal server-only serializer**

  Preserve the NC-H1 row order, encode null as empty, quote commas/quotes/CR/LF with doubled quotes and CRLF records, prepend UTF-8 BOM, neutralize `=`, `+`, `-`, and `@` after leading whitespace/control characters, and fail closed when rows exceed 500. Do not import or expose private identifiers.

- [x] **Step 4: Run the focused contract and verify GREEN**

  Re-run the same command and inspect the generated fixture text for deterministic headers, Unicode, embedded newlines, and formula-safe cells.

## Chunk 2: Authenticated attachment route and UI notice

**Files:**

- Create: `app/api/comment-translator/history/export/route.ts`
- Modify: `components/comment-translator/CommentTranslatorCreatorHistoryPanel.tsx`

- [x] **Step 1: Extend the focused contract with route behavior**

  Assert the route uses the existing no-argument safe-history action, emits only successful safe projections as CSV, returns sanitized fail-closed output otherwise, and sets attachment, `text/csv; charset=utf-8`, stable filename, and `no-store` headers. Assert the panel contains the retention/deletion notice and fixed download link without browser authority.

- [x] **Step 2: Run the focused contract and verify RED**

  Run `node scripts/comment-translator-creator-nc-x3-safe-csv-export-contract.mjs` and confirm the new route/UI assertions fail before implementation.

- [x] **Step 3: Implement the route and notice**

  Use a fixed GET route with no query authority. Call `readCommentTranslatorCreatorSafeHistoryAction()` and return a sanitized unavailable response for any non-ready or over-bound result. Keep the panel props-only and add only static copy plus a native anchor to the fixed route.

- [x] **Step 4: Run the focused contract and verify GREEN**

  Re-run the focused contract and inspect the actual route/panel source for no query, storage, log, raw/private, or browser-owned authority.

## Chunk 3: Root acceptance checks

**Files:**

- Inspect all changed paths and the existing NC-H1/Free/security contracts; do not expand implementation scope.

- [x] **Step 1: Re-run focused and existing contracts**

  Run the NC-X3 contract, NC-H1 history contract, current-task reconciliation contract, and the relevant existing security/Free contracts.

- [x] **Step 2: Run repository hygiene and isolation checks**

  Run `git diff --check` and targeted scans for private identifiers, raw/provider payloads, secrets, browser storage, query authority, migrations, bindings, R2, and config leakage.

- [x] **Step 3: Classify dependency-backed checks**

  If `node_modules` is absent, do not install and record lint/typecheck/Next/OpenNext as setup-blocked. If already present, run the repository-supported checks without modifying manifests or lockfiles.

- [x] **Step 4: Perform browser/download QA when the local runtime is available**

  Verify the fixed route’s supported-browser download/open behavior and, because the panel changes, widths 390 / 820 / 1024 / 1280 / 1366, overflow, console, keyboard, and focus. Do not use authenticated live or external environments.

- [x] **Step 5: Stop before commit, push, PR, merge, deploy, activation, or cleanup**

  Root inspects the full diff, sends the completed material change to a fresh read-only `sol-reviewer`, and repairs only listed specification mismatches through `sol-repairer` if needed.
