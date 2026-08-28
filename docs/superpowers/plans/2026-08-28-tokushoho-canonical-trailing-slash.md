# Tokushoho Canonical Trailing Slash Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Tokushoho page publish the same `/legal/tokushoho/` canonical path that the trailing-slash Preview runtime serves.

**Architecture:** Keep the change route-local. First update the two existing source contracts so they fail against the slashless metadata, then change the single metadata string and rerun focused and sibling verification. Do not alter routing or canonical metadata for any other page.

**Tech Stack:** Next.js metadata, Node.js contract scripts, TypeScript, ESLint, OpenNext Cloudflare

---

## Chunk 1: Test-first canonical correction

### Task 1: Establish the failing regression contracts

**Files:**
- Modify: `scripts/comment-translator-paid-core-v1-task10-legal-security-contract.mjs`
- Modify: `scripts/comment-translator-paid-core-v1-task11-tax-checkout-policy-contract.mjs`
- Reference: `next.config.mjs`
- Reference: `app/legal/tokushoho/page.tsx`

- [ ] **Step 1: Change the Task 10 expected canonical**

Replace only this assertion:

```js
assert.match(source.tokushohoRoute, /canonical:\s*["']\/legal\/tokushoho\/["']/u);
```

- [ ] **Step 2: Change the Task 11 Tokushoho expectation**

Keep the other three canonical paths unchanged and replace only the Tokushoho tuple:

```js
[read("app/legal/tokushoho/page.tsx"), "/legal/tokushoho/"]
```

- [ ] **Step 3: Run the contracts and verify RED**

Run:

```powershell
node scripts/comment-translator-paid-core-v1-task10-legal-security-contract.mjs
node scripts/comment-translator-paid-core-v1-task11-tax-checkout-policy-contract.mjs
```

Expected: both commands fail because `app/legal/tokushoho/page.tsx` still declares `canonical: "/legal/tokushoho"`. A syntax or file-loading error is not an acceptable RED result.

### Task 2: Apply the minimal metadata fix

**Files:**
- Modify: `app/legal/tokushoho/page.tsx`
- Test: `scripts/comment-translator-paid-core-v1-task10-legal-security-contract.mjs`
- Test: `scripts/comment-translator-paid-core-v1-task11-tax-checkout-policy-contract.mjs`

- [ ] **Step 1: Change the canonical string**

Replace only the canonical value:

```ts
alternates: {
  canonical: "/legal/tokushoho/"
}
```

- [ ] **Step 2: Run the focused contracts and verify GREEN**

Run:

```powershell
node scripts/comment-translator-paid-core-v1-task10-legal-security-contract.mjs
node scripts/comment-translator-paid-core-v1-task11-tax-checkout-policy-contract.mjs
node scripts/comment-translator-tokushoho-rendering-contract.mjs
node scripts/comment-translator-tokushoho-content-localization-contract.mjs
```

Expected: all four commands exit 0 and print their normal pass summaries.

## Chunk 2: Verification and handoff

### Task 3: Verify scope and regressions

**Files:**
- Verify only: all changed files

- [ ] **Step 1: Inspect the exact diff**

Run:

```powershell
git diff -- app/legal/tokushoho/page.tsx scripts/comment-translator-paid-core-v1-task10-legal-security-contract.mjs scripts/comment-translator-paid-core-v1-task11-tax-checkout-policy-contract.mjs
git diff --check
```

Expected: one production string and two test expectations change; no whitespace errors.

- [ ] **Step 2: Run all 29 Paid Core contracts and provider legal copy**

Run this deterministic bundle without installing dependencies or changing package metadata:

```powershell
$contracts = @(Get-ChildItem -LiteralPath scripts -File -Filter 'comment-translator-paid-core-v1-*-contract.mjs' | Sort-Object Name)
if ($contracts.Count -ne 29) { throw "expected 29 Paid Core contracts, found $($contracts.Count)" }
foreach ($contract in $contracts) {
  & node $contract.FullName
  if ($LASTEXITCODE -ne 0) { throw "Paid Core contract failed: $($contract.Name)" }
}
node scripts/comment-translator-provider-legal-copy-refresh-contract.mjs
if ($LASTEXITCODE -ne 0) { throw "provider legal copy contract failed" }
```

Expected: 29/29 Paid Core contracts and the provider legal copy contract pass. Any known historical unrelated failure must be identified separately and must not be reported as a pass.

- [ ] **Step 3: Run static and build verification when already available**

Run:

```powershell
npx --no-install tsc --noEmit --pretty false
npm run lint
npm run build
npm run build:cloudflare
node --check workers/comment-translator-paid-open-next-wrapper.mjs
node --check .open-next/worker.js
```

Expected: TypeScript and builds exit 0; lint has 0 errors with only previously established warnings. If this isolated worktree lacks dependencies, record these as setup-blocked and do not install or link dependencies without approval.

- [ ] **Step 4: Confirm clean scope for handoff**

Run:

```powershell
git status --short --branch
git diff --stat
```

Expected: only the approved route, two contracts, and the approved design/plan documents are changed or untracked.

- [ ] **Step 5: Stop at the approval gate**

Report local results. Do not commit, push, create a pull request, merge, deploy, perform any Preview browser check (including read-only checks), or operate Stripe, Supabase, Cloudflare, Provider, or Production until separately authorized.
