# Tokushoho English Localization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a complete English Tokushoho disclosure for the English locale without changing Japanese legal copy or Terms/Privacy behavior.

**Architecture:** Keep `LegalDocumentPage` as the shared presentational unit and add optional date labels plus stable section IDs. A Tokushoho-only client wrapper owns locale readiness, a server-readable Japanese fallback, and complete-document selection from a typed `ja/en` document map. Focused Node contracts verify structural parity, direct canonical disclosures, and route/rendering boundaries.

**Tech Stack:** Next.js App Router, React, TypeScript, Node contract scripts

---

## Chunk 1: TDD implementation and local verification

### Task 1: Add the failing content-localization contract

**Files:**
- Create: `scripts/comment-translator-tokushoho-content-localization-contract.mjs`
- Read: `lib/legal-content.ts`
- Read: `components/legal/LegalDocumentPage.tsx`
- Read: `app/legal/tokushoho/page.tsx`

- [ ] **Step 1: Write the failing contract**

Create a Node contract using the repository's existing TypeScript import hook. Import `tokushohoDocuments` from `lib/legal-content.ts` and assert:

- the map has exactly `ja` and `en`;
- both documents have matching section kinds and row/paragraph cardinalities;
- the established Japanese price, tax, signed-Webhook, provider, cancellation, dispute, retention, Free-availability, and approval-gate markers remain present;
- the English document directly includes canonical English markers for every business-information and sales-condition row;

- [ ] **Step 2: Run the contract and verify RED**

Run:

```powershell
node scripts/comment-translator-tokushoho-content-localization-contract.mjs
```

Expected: FAIL because the `tokushohoDocuments` export does not exist.

### Task 2: Implement locale-indexed Tokushoho content

**Files:**
- Modify: `lib/legal-content.ts`
- Test: `scripts/comment-translator-tokushoho-content-localization-contract.mjs`

- [ ] **Step 1: Preserve the Japanese authority**

Move the existing Japanese Tokushoho object into `tokushohoDocuments.ja` without altering its strings. Keep `legalDocuments.tokushoho` as an alias of that Japanese entry for compatibility with existing contracts.

- [ ] **Step 2: Add the complete English document**

Add `tokushohoDocuments.en` with the same section structure and row/paragraph cardinalities. Translate every date, heading, label, value, and status paragraph. Preserve the canonical meanings listed in the approved design, including:

```text
US$6/month (total price, billed in USD)
Any applicable tax is shown in Stripe Checkout.
Paid access is enabled only after server-side confirmation from a signed Webhook.
Comment text is sent to OpenAI or Azure for translation processing.
Free remains available.
```

- [ ] **Step 3: Keep types exhaustive**

Type the map as `Record<Locale, LegalDocument>` so both supported locales are mandatory and partial fallback is impossible.

- [ ] **Step 4: Run the content contract and verify GREEN**

```powershell
node scripts/comment-translator-tokushoho-content-localization-contract.mjs
```

Expected: PASS with one content-localization success line.

### Task 3: Add the failing rendering contract

**Files:**
- Create: `scripts/comment-translator-tokushoho-rendering-contract.mjs`
- Read: `components/legal/LegalDocumentPage.tsx`
- Read: `app/legal/tokushoho/page.tsx`
- Read: `app/terms/page.tsx`
- Read: `app/privacy/page.tsx`

- [ ] **Step 1: Write the failing rendering contract**

Assert that the Tokushoho-only wrapper reads `locale` and `isLocaleReady`, renders the complete Japanese document before readiness, selects one complete locale after readiness, supplies matching localized date labels, and is used by the Tokushoho route. Assert `LegalDocumentPage` generates one whitespace-free section ID shared by each heading and `aria-labelledby`. Assert Terms and Privacy still call `LegalDocumentPage` with their existing single documents.

- [ ] **Step 2: Run the rendering contract and verify RED**

```powershell
node scripts/comment-translator-tokushoho-rendering-contract.mjs
```

Expected: FAIL because the localized wrapper and date-label interface do not exist.

### Task 4: Add Tokushoho-only locale rendering

**Files:**
- Create: `components/legal/LocalizedTokushohoDocumentPage.tsx`
- Modify: `components/legal/LegalDocumentPage.tsx`
- Modify: `app/legal/tokushoho/page.tsx`
- Modify: `scripts/comment-translator-paid-core-v1-task10-legal-security-contract.mjs`
- Test: `scripts/comment-translator-tokushoho-rendering-contract.mjs`

- [ ] **Step 1: Add optional date labels**

Extend `LegalDocumentPage` with optional `dateLabels`. Default to the exact existing Japanese labels when omitted.

- [ ] **Step 2: Add the client wrapper**

Read `locale` and `isLocaleReady` from `useLocale()`. Before readiness, server-render `tokushohoDocuments.ja` with Japanese date labels as the legal fallback. After readiness, render `tokushohoDocuments[locale]` with matching Japanese or English date labels as one complete unit.

- [ ] **Step 2a: Generate valid section IDREFs**

Generate a stable whitespace-free ID from each section index and use it for both the heading `id` and section `aria-labelledby`.

- [ ] **Step 3: Route Tokushoho through the wrapper**

Replace only the Tokushoho route's direct `LegalDocumentPage` call. Leave Terms and Privacy callers unchanged.

- [ ] **Step 4: Update the existing Task 10 route-shape contract**

Keep direct `LegalDocumentPage` assertions for Terms and Privacy. Require the Tokushoho route to use `LocalizedTokushohoDocumentPage` and retain its canonical metadata and legal-content authority.

- [ ] **Step 5: Run the rendering contract and verify GREEN**

Run:

```powershell
node scripts/comment-translator-tokushoho-rendering-contract.mjs
```

Expected: PASS with one localization-contract success line.

### Task 5: Regression verification

**Files:**
- Verify only; no additional production scope unless a relevant regression is found.

- [ ] **Step 1: Run sibling legal and Paid contracts**

```powershell
node scripts/comment-translator-paid-core-v1-task10-legal-security-contract.mjs
node scripts/comment-translator-paid-core-v1-task11-tax-checkout-policy-contract.mjs
node scripts/comment-translator-provider-legal-copy-refresh-contract.mjs
node scripts/legal-foundation-contract.mjs
node scripts/comment-translator-tokushoho-content-localization-contract.mjs
node scripts/comment-translator-tokushoho-rendering-contract.mjs
```

Expected: all PASS. If `legal-foundation-contract.mjs` fails on documented stale historical copy markers, classify it before changing current legal behavior.

- [ ] **Step 2: Run repository checks**

```powershell
npx --no-install tsc --noEmit --pretty false
npm run lint
npm run build
git diff --check
```

Expected: TypeScript and build PASS; lint has no new errors; diff check PASS.

- [ ] **Step 3: Inspect scope and sensitive-data boundaries**

Confirm only the approved design, plan, two focused contracts, updated Task 10 route-shape contract, legal content, shared renderer, localized wrapper, and Tokushoho route changed. Scan changed files for secret-like values, private identifiers, raw payload handling, and TypeScript suppression directives.

- [ ] **Step 4: Defer external actions**

Do not commit, push, create a PR, deploy, activate Checkout, call Provider/Stripe, mutate Supabase/Cloudflare, or run browser post-deploy QA without separate approval.
