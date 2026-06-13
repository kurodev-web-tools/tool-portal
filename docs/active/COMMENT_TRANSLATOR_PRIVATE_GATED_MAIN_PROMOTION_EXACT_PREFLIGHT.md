# Kuro Live Comment Translator Private-Gated Main Promotion Exact Preflight

Status: Task 28 exact preflight/blocker record after PR #436. Public-release capable: no.

This record prepares the exact main-promotion / deploy / production-smoke plan without executing it. It is not approval for main promotion, merge to `main`, deploy/upload, production/custom URL smoke, Cloudflare production mutation, remote mutation, remote schema migration, Supabase migration apply, Stripe live-mode action, billing setting mutation, Customer Portal redirect, webhook registration, provider target lookup, liveChatId lookup, translation provider API execution, or live/provider execution.

Output policy: sanitized-metadata-only. Secret values, token values, OAuth values, authorization code values, owner user id values, provider channel id values, liveChatId values, service-role key values, Authorization header values, Stripe secret values, webhook signing secret values, provider target metadata values, raw comment text, provider response bodies, browser storage payloads, and handoff payload expansion are not requested, displayed, stored, or recorded.

## Merge Gate Evidence

- PR #436 `[codex] Record Task 28 production env readiness`: merged.
- Merge commit: `3b508071b5f188c8006a39d2f83bc284a3bce068`.
- Git containment: merge commit is contained in `origin/codex/comment-translator-preview`.
- GitHub metadata checked: state `MERGED`, base `codex/comment-translator-preview`, head `codex/comment-translator-production-env-readiness-post-pr435`, merged at `2026-06-13T03:31:52Z`.
- Check rollup observed after merge review: Cloudflare Pages completed with failure. This remains deployment-surface evidence to handle separately from local verification and does not by itself approve or block local readiness.

## Operator-Reported Env Presence

The operator reported the following presence-only production configuration after PR #436. No values were shown, requested, stored, or recorded.

| Boundary | Reference presence | Task 28 interpretation |
| --- | --- | --- |
| Cloudflare production Worker runtime | private launch allowlist | Required private-gate allowlist is reported present. Allowed-tester production smoke still needs approved deployed target and authenticated tester context. |
| Cloudflare production Worker runtime | Supabase public auth vars | Required account/auth references are reported present. |
| Cloudflare production Worker runtime | Supabase service role secret | Trusted status/session smoke reference is reported present. Value remains server-only. |
| Cloudflare production Worker runtime | YouTube credential resolution flag | Credential resolution control reference is reported present. Actual status/session smoke still requires approval. |
| Cloudflare production Worker runtime | Stripe test mode secret, webhook secret, and paid price reference | Stripe references are reported present for test mode only. This does not prove Stripe live-mode readiness and does not approve Checkout, Portal, webhook registration, or billing mutation. |
| Cloudflare production Worker runtime | Azure Translator key, endpoint, and region | Azure provider references are reported present. Translation provider API execution is still not approved. |
| Cloudflare production Worker runtime | translation budget and Azure character cap vars | Budget/cap references are reported present. Budget enforcement behavior still needs approved smoke or contract-only interpretation. |
| Cloudflare production Worker runtime | site URL and Turnstile public key | Site/auth hardening references are reported present. Production/custom route smoke is still not approved. |
| Cloudflare build env | `CLOUDFLARE_ACCOUNT_ID` | Account selection reference is reported present for build/deploy readiness. Deploy/upload remains unapproved. |
| Cloudflare production Worker runtime | OpenAI / DeepL / Gemini / Workers AI | Not set. Paid OpenAI provider smoke and comparison-provider smoke remain blocked or out of scope. |

## Current Blocker Summary

Task 28 completion criteria are still not met.

| Surface | State | Blocker |
| --- | --- | --- |
| main promotion | not-run-blocked-pending-explicit-approval | No approval for merge/promotion toward `main`. |
| deploy/upload | not-run-blocked-pending-explicit-approval | No approval for Cloudflare upload/deploy or production mutation. `CLOUDFLARE_ACCOUNT_ID` is reported present, but deploy authentication and exact deploy target are not approved evidence. |
| production/custom URL smoke | not-run-blocked-pending-approved-deploy-target | No approved deployed production/custom target smoke. |
| non-allowed-user denial smoke | not-run-blocked-pending-approved-target | Private launch gate is locally covered, but production denial smoke requires an approved target. |
| allowed-tester account smoke | not-run-blocked-pending-approved-target-and-authenticated-context | Env presence is improved, but account smoke needs approved target and safe authenticated tester context. |
| allowed-tester session smoke | not-run-blocked-pending-approved-target-auth-and-provider-credential-readiness | Supabase service role and credential resolution references are reported present; actual credential status/session smoke remains approval-gated. |
| Stripe billing smoke | not-run-blocked-test-mode-and-approval-gated | Stripe references are test mode only; live-mode billing evidence is not present and Checkout/Portal/webhook actions are not approved. |
| provider translation smoke | not-run-blocked-pending-explicit-provider-approval | Azure references are reported present; OpenAI is not set. Free/Azure-only translation smoke would still need explicit provider execution approval. |
| rollback action | not-run-blocked-pending-approved-deploy-action | Rollback notes exist; no rollback action is approved or needed until an approved deploy/smoke fails. |

## Exact Preflight Plan

The following plan may be used only after the release owner gives explicit same-thread approval for the exact action. Until then, this is a planning record only.

### Phase 0: Local Readiness, No External Mutation

Allowed before external approval:

1. `git fetch origin --prune`
2. confirm PR #436 merge metadata and merge commit containment in `origin/codex/comment-translator-preview`;
3. read `AGENTS.md`, `task.md`, this preflight doc, env readiness doc, deployment/live-smoke runbook, final QA, and security/privacy final review;
4. run local verification only: `npm run lint`, `npx tsc --noEmit`, `npm run build`, optionally `npm run build:cloudflare`, and `git diff --check`;
5. record only command names, pass/fail status, and sanitized blocker labels.

Abort if local verification fails, if output contains forbidden values, or if the branch/worktree is not based on latest `origin/codex/comment-translator-preview`.

### Phase 1: Main Promotion

Approval required before execution.

Candidate command/action shape:

1. create or update a PR from `codex/comment-translator-preview` to `main`, or use the repository's approved main promotion mechanism;
2. wait for required checks;
3. merge only after checks and release-owner approval are still valid.

Record only PR number, base/head branch names, merge commit, check names/conclusions, and timestamps. Do not record deployment secrets, private identifiers, or dashboard values.

Abort if the base/head is unexpected, checks fail for app/runtime reasons, Cloudflare output exposes forbidden values, or the release owner has not approved the exact promotion action in this thread.

### Phase 2: Deploy / Upload

Approval required before execution.

Candidate command/action shape:

1. `npm run upload:cloudflare`
2. sanitized output review for deployment metadata only;
3. `npm run deploy:cloudflare`

Record only command names, pass/fail status, safe deployment version/alias labels, and check conclusions. Do not record Cloudflare account id values, API token values, headers, provider target metadata, liveChatId values, or browser storage payloads.

Abort if Wrangler selects an unexpected account/project/service, authentication fails, the output contains forbidden values, or the release owner has not approved the exact deploy/upload action in this thread.

### Phase 3: Production / Custom URL Smoke

Approval required before execution.

Minimum route checks:

1. `/tools/comment-translator`
2. `/account/integrations`
3. `/account/billing`
4. `/terms`
5. `/privacy`
6. `/legal/tokushoho`
7. `/api/comment-translator/session` negative check where safe
8. `/api/comment-translator/youtube/credential-status` negative check where safe

Record only route paths, HTTP status, pass/fail, browser width, console status, sanitized launch-gate labels, and safe deployment reference. Do not record full authenticated storage, tokens, owner values, provider channel values, provider target metadata, liveChatId values, or response bodies that contain private data.

Abort if required routes are stale/404, general-user private-gate denial fails, allowed-tester smoke cannot authenticate safely, console errors indicate route/runtime regression, output contains forbidden values, or the release owner has not approved the exact production smoke action in this thread.

### Phase 4: Optional Follow-Up Smokes

Separate approval required for each category:

- allowed-tester account/plan/session smoke;
- Stripe test-mode Checkout/Portal/webhook smoke;
- Stripe live-mode action;
- YouTube provider target lookup;
- liveChatId lookup;
- live/provider execution;
- translation provider API execution;
- remote mutation or schema migration.

These must use the narrowest available command/check and sanitized evidence only.

## Evidence Destination

If approval is later granted and execution succeeds, record sanitized evidence in:

- this preflight doc or a successor Task 28 completion evidence doc;
- `task.md`;
- PR body for the Task 28 completion PR.

If approval remains absent or any phase aborts, keep `public-release capable: no` and create only a readiness/blocker PR if the release owner approves that PR posture.

## Width Checks

Width checks skipped for this exact preflight/blocker PR. The change is docs, a Node contract script, and task-board notes only; it does not change UI, rendered text, CSS, route behavior, browser storage, or visible layout.
