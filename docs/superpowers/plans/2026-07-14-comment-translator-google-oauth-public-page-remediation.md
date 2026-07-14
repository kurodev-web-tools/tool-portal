# Comment Translator Google OAuth Public Page Remediation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the submitted OAuth homepage and privacy policy explicitly expose privacy and access-removal guidance while preparing a sanitized review-response packet.

**Architecture:** Extend the existing static Next.js public-information page using its current design tokens and links. Keep legal copy in the existing `legalDocuments` authority, lock the user-visible contract with the existing Node assertion script, and record operator-only response material in one active document.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, Tailwind CSS, Node.js contract scripts.

---

## Chunk 1: Public contract and copy

### Task 1: Pin the missing reviewer-facing behavior

**Files:**
- Modify: `scripts/comment-translator-oauth-public-info-page-contract.mjs`

- [x] Add assertions for a hero-level privacy link, an explicit YouTube removal heading, the in-app disconnect route, Google-side access removal, the official Google guidance URL, and matching privacy-policy copy.
- [x] Run `node scripts/comment-translator-oauth-public-info-page-contract.mjs` and confirm RED on the first missing assertion.

### Task 2: Add the public homepage guidance

**Files:**
- Modify: `app/tools/comment-translator/about/page.tsx`

- [x] Add `/privacy` to the hero actions using the existing secondary-button pattern.
- [x] Add a dedicated section explaining local disconnect and Google-side access removal without adding client state or runtime dependencies.
- [x] Run the focused contract and confirm the page assertions are GREEN except for the not-yet-updated privacy policy.

### Task 3: Align the privacy policy

**Files:**
- Modify: `lib/legal-content.ts`

- [x] Update the shared legal-document date.
- [x] Replace the current contact-only paragraph in Article 9 with explicit local disconnect, Google-side revocation, retained-data request, and contact guidance.
- [x] Run the focused contract and confirm GREEN.

## Chunk 2: Review packet and operational checkpoint

### Task 4: Prepare the sanitized reviewer packet

**Files:**
- Create: `docs/active/COMMENT_TRANSLATOR_GOOGLE_OAUTH_REVIEW_RESPONSE_PACKET.md`

- [x] Record public URLs, purpose, `youtube.readonly` rationale, Start-only flow, removal steps, demo evidence checklist, and a paste-ready Trust & Safety reply draft.
- [x] State that no email is sent and no Google Auth configuration or resubmission is performed.

### Task 5: Record current operational state

**Files:**
- Modify: `task.md`

- [x] Add the isolated branch, implementation scope, verification evidence, unchanged Google pending state, and `public_release_capable=no`.

## Chunk 3: Verification

### Task 6: Run static and build gates

**Files:**
- Verify only.

- [x] Run the focused contract, `git diff --check`, changed-file secret scan, and changed TypeScript escape-hatch scan.
- [x] Run lint, TypeScript, and production build using existing dependencies only; do not install packages.

### Task 7: Run browser QA

**Files:**
- Verify only.

- [x] Serve the local production build.
- [x] Check `/tools/comment-translator/about/` and `/privacy/` at `390 / 820 / 1024 / 1280 / 1366px`.
- [x] Confirm the privacy and removal links are visible, there is no horizontal overflow, no login form/password input, and no console error.
- [x] Reconcile the plan, inspect the final diff, and report remaining external blockers without mutating Google Cloud.
