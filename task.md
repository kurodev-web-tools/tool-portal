# task.md

このファイルには現在の運用タスクと継続的に守る境界だけを置く。完了済みの詳細ログ、旧branch/PR履歴、比較メモ、古いblocker、旧next-session promptは `docs/archive` または各active authorityを参照する。

## Current Task Index

| Priority | Tool / work | Current status | Detail authority |
| --- | --- | --- | --- |
| P0-implementation | Comment Translator Creator NC-H1 Seven-Day Safe History | Draft PR #744 is open from `codex/comment-translator-creator-build-fix` to `codex/comment-translator-free-public-beta-integration`. The #739-#743 automatic Cloudflare failures were reproduced and repaired locally across OBS, moderator, and history boundaries. Strict typecheck, lint, Next build, and OpenNext/Cloudflare build pass locally. Remote automatic build, review, merge, deploy, migration apply, live history/feed/entitlement read or write, activation, and cleanup remain unapproved or unverified. | `scripts/comment-translator-creator-nc-h1-history-contract.mjs`, `lib/comment-translator-creator-history-runtime.ts`, `components/comment-translator/CommentTranslatorCreatorHistoryPanel.tsx`, `supabase/migrations/20260802040000_comment_translator_creator_safe_history.sql` |
| P0-operations | Comment Translator Cloudflare legacy Durable Object retirement | PR #733 is merged at integration commit `db328816e0cb0d2e8e8235cc4716095070392451`; the user confirmed the automatic Cloudflare build and deployment succeeded. No further retirement operation is active here. | `docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_ARCHITECTURE.md`, `scripts/comment-translator-cloudflare-legacy-do-retirement-contract.mjs` |
| P1-operations | Comment Translator Free public beta | Released and final production smoke complete; `public_release_capable=yes`. No release-chain operator action remains. | `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md`, `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md` |
| P1-maintenance | 配信カンペボード | MVP and custom delete-dialog follow-up are merged to `main`; no active follow-up is recorded here. | `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md` |
| Workflow | New-tool preview development | Task PRs target a tool-specific preview/integration branch; promotion to `main` occurs only after readiness and explicit approval. | `docs/active/TOOL_PREVIEW_DEVELOPMENT_WORKFLOW.md` |

## Current Goal

```text
current_goal=comment-translator-creator-build-repair-draft-pr-open
current_pr=744
current_pr_state=draft-open
current_pr_merge_commit=none
current_pr_implementation_head=9df01c9414d19e71d0f5c2f0b0def35f7c53ec51
previous_pr=743
previous_pr_state=merged
previous_pr_merge_commit=3a0718c8707a8f53a25c93c0f87b3b909ef9bc6a
current_base=codex/comment-translator-free-public-beta-integration
current_branch=codex/comment-translator-creator-build-fix
feasibility_decision=conditional-go
selected_runtime=cloudflare-workers-open-next
selected_persistence=supabase-postgres-existing-server-only-boundary
container_disposition=rejected-not-a-candidate
current_approved_boundary=creator-build-repair-draft-pr-open
current_lane=NC-H1
implementation_status=local-build-repair-complete
publication_status=draft-pr-open
deploy_status=not-approved
```

- PR #743 merged final head `13b75bafa782d4bad1e3aa66d34cc3988243c680` at integration commit `3a0718c8707a8f53a25c93c0f87b3b909ef9bc6a`. GitHub records `Workers Builds: tool-portal` as failed for the #739 through #743 integration merge commits. The supplied #743 build log identifies `lib/comment-translator-creator-history-runtime.ts` nullable `historyStore` access as its first TypeScript failure; GitHub exposes no build-log annotations for the earlier four failures.
- Draft PR #744 was opened from implementation commit `9df01c9414d19e71d0f5c2f0b0def35f7c53ec51` against `codex/comment-translator-free-public-beta-integration`. The remote compare is one commit ahead, zero behind, and contains only the eight intended build-repair/task files with no deletion, manifest, lockfile, migration, or deployment configuration change.
- The local build repair adds separate read/write regression assertions that the authorized context carries the non-null history store proven by the authority boundary, routes both operations through that narrowed store, and rejects a future `recordedAtIso` relative to the authoritative DB evaluation clock. It also makes the existing OBS/moderator store unions directly discriminate `ready`, narrows the OBS denied helper to the denied result variant, separates OBS page data loading from JSX rendering for React purity/error-boundary lint, and moves a non-function contract export out of the `"use server"` action module. The fixes preserve the existing fail-closed reasons, retryability, feed projection, session checks, and O1/O2/M1/M2/H1 isolation.
- PR #742 merged final head `20c7b82b453f1b129c1e1f72321c1ddfb7deac35` at fetched integration tip `d0e0265b71e87e4855137f0804ebbd3c4ea6aa70`. The final head is contained in the fetched integration branch used as the NC-H1 base. This fresh task's `git fetch origin --prune` was policy-blocked, so the evidence is limited to the already-fetched exact local remote ref and successful ancestry check.
- NC-H1 adds one additive service-role-RPC-only safe-history migration, server-only correlation digests, source-time seven-day retention, current-session and paid-active atomic authorization, owner-wide prior-session reads, read/write-time expiry, monotonic tombstone propagation, and owner-derived idempotent disconnect/account-deletion cleanup seams. Plaintext message references, owner/session identifiers, RPC evaluation time, and private/provider authority are not returned to the panel.
- Focused NC-H1 RED/GREEN and root reruns pass. Inclusive UTC cutoff, malformed/future/stale source rows, owner/session isolation, Free/paid-inactive non-retention, safe-field whitelist, visible-to-tombstone replacement and non-resurrection, all-owner expiry beyond 100 rows, prior-session owner reads, concurrent atomic writes, DB-authoritative read clock, unavailable authority/store, cleanup idempotency, fixed production closure, RLS/grants/lock order, and O/M scope isolation are covered. No-container, NC-F1, NC-D1, NC-E1, NC-O1/O2, and NC-M1/M2 contracts also pass; syntax and diff checks pass.
- The user separately approved `npm clean-install --progress=false`; it installed the locked dependency tree without changing `package.json` or `package-lock.json` hashes. Strict TypeScript, lint, Next production build, and `npm run build:cloudflare` all pass locally through `OpenNext build complete`. Focused no-container/Free/Creator/O1/O2/M1/M2/H1 regression contracts pass 14/14. Seven broader historical contracts remain red because they pin superseded task labels, aggregate-action source shapes, or changed-file allowlists; they did not identify a current runtime/build regression and were not widened in this repair. A read-only Sol semantic review found the future recorded-time and regression-assertion gaps; both were corrected and the follow-up review reports no remaining concrete finding. Deterministic browser QA at `390 / 820 / 1024 / 1280 / 1366px` was not rerun because the repair changes no rendered UI or CSS.
- NC-H1 production activation remains fixed closed. The panel and cleanup functions are disconnected deterministic/server-orchestration seams; existing OAuth disconnect and request-only data-deletion flows were not changed. The retention/storage/read-volume budget required before activation is not authorized and remains an explicit blocker; no numeric product cap was invented.
- PR #743 was opened from remote implementation head `e3d03125119573f8b3023e1d64523a9fd78edaa7`, received final head `13b75bafa782d4bad1e3aa66d34cc3988243c680`, and merged into `codex/comment-translator-free-public-beta-integration` at `3a0718c8707a8f53a25c93c0f87b3b909ef9bc6a`. NC-M1/NC-M2 and NC-H1 migration apply, production database/history/token/capability read or write, live feed/entitlement/session use, authenticated browser smoke, deploy, activation, and cleanup remain separate approval boundaries. No remote Supabase, Cloudflare, provider, Stripe, or live account operation was performed.
- PR #741 merged final head `18c91bc0e0299f48bf16d84663496d4fa3476931` (implementation head `8b80cdb2e309950c6f6656b3d31dde30261afe31`) at integration commit `bcc65046e60a00cdfe55b532313cf52ac33bdaf1`. The final head is contained in the integration history used as the NC-M2 base.
- NC-M2 adds a moderator-only POST-body redemption route, separate digest-only browser capability store/RPC, token-free stable moderator page, Secure HttpOnly SameSite Strict path/expiry-bounded cookie, and read-only safe-feed UI. Moderator token/capability scope, table, RPC, cookie, and runtime remain separate from NC-O1/NC-O2 OBS authority.
- Each moderator read revalidates the consumed current NC-M1 token version/state plus durable owner/session/45-second heartbeat. Revocation, reissue, expiry, session replacement, replay, cross-scope input, unreadable authority, and unavailable safe feed fail closed. Existing safe translation/original/author/badge/purchase/source/moderation fields only are projected; no moderator identity, role, recipient, invite, delivery, browser-selected authority, moderation action, or NC-V1 priority/filter was added.
- Focused NC-M2 RED/GREEN and root reruns pass. NC-M1, NC-O1, NC-O2, executable no-container, NC-F1, NC-D1, NC-E1, login-only, NC-U1, NC-P1, and NC-C1 contracts pass. Syntax-supported checks, diff/whitespace, secret/private identifier, browser storage/query/log, suppression/debug, OBS ownership isolation, migration RLS/grant/atomicity/lock-order, and file-size checks pass. Initial Sol review findings for consumed plaintext validation and distinct deleted/moderation-state display were corrected; fresh final review has no concrete findings.
- Fresh worktree dependencies are absent. Dependency-backed public entitlement, durable session, session start/stop, safe-feed UI, and security/privacy contracts plus lint, TypeScript typecheck, Next build, OpenNext build, and deterministic browser QA at `390 / 820 / 1024 / 1280 / 1366px` are setup-blocked. No dependency installation or manifest/lockfile change was performed.
- NC-M1/NC-M2 migration apply, production database read/write, live token issue/redemption/share, authenticated real feed/browser smoke, deploy, activation, and cleanup remain separate approval boundaries. No remote Supabase, Cloudflare, provider, Stripe, or live account operation was performed. NC-M2 commit, push, and Draft PR have not been authorized or performed.
- PR #739 merged implementation head `05e449a7b4a3f38b8ace9827f96231724a4ef670` at `e538b954b4801ded9a3f9ab25ea65f4f1d0ba264`. PR #740 merged head `caf14565bb4399a6f6ba4f6cfd16a8e7b295a062` at fetched integration tip `2477e687449866d3812c04580a85df83cff778b5`. Both heads and merge commits are contained in the fetched integration branch used as the NC-M1 base.
- NC-M1 adds a distinct `moderator-share-read` digest-only token table, service-role RPC store, and server-only runtime. Authenticated owner and current durable session are server-derived; issue returns plaintext once, while read/revoke/validation expose only sanitized metadata and never infer moderator identity, email, recipient, or delivery state.
- One current token is enforced per owner/current-session scope. Same-session duplicate/concurrent issue has one winner and a deterministic fail-closed loser; revoked, expired, replaced-session, reissued-old, cross-token, and cross-scope inputs are rejected. A newly authoritative session can atomically replace the old session's invalid token row.
- All four NC-M1 RPCs enforce the durable 45-second heartbeat boundary and use session-parent-first lock order. The token table has only the session FK cascade, preventing session/account cleanup lock inversion while exact owner/session integrity remains RPC-enforced.
- Focused NC-M1 RED/GREEN and root reruns pass. Executable no-container, NC-F1, NC-D1, NC-E1, login-only/session access, NC-O1, and NC-O2 contracts also pass. Syntax, scope, ownership/import, secret/private identifier, browser authority, OBS authority isolation, debug/suppression, migration RLS/grant/atomicity/lock-order, file-size, and whitespace checks pass. Final Sol semantic review has no concrete findings.
- Fresh worktree dependencies are absent. Dependency-backed public entitlement, durable session, session start/stop, and security/privacy contracts plus lint, TypeScript typecheck, Next build, and OpenNext build are setup-blocked; no dependency installation or manifest/lockfile change was performed.
- PR #741 was opened from implementation commit `8b80cdb2e309950c6f6656b3d31dde30261afe31`, received final task follow-up head `18c91bc0e0299f48bf16d84663496d4fa3476931`, and is merged into `codex/comment-translator-free-public-beta-integration` at `bcc65046e60a00cdfe55b532313cf52ac33bdaf1`. NC-M1 migration apply, production database read/write, live token issue/validation/share, authenticated browser smoke, deploy, activation, and cleanup remain separate approval boundaries. No remote Supabase, Cloudflare, provider, Stripe, or live account operation was performed.
- PR #737 is merged, and the user confirmed its NC-O1 token-read discriminant repair built successfully in the real deployment environment. PR #738 is merged and supplies the repository agent workflow configuration used by this lane.
- NC-O2 adds a POST-body-only one-time NC-O1 redemption boundary, atomic service-role RPC for token consumption plus digest-only browser capability replacement, token-free stable overlay URL, HttpOnly/SameSite Strict/path- and expiry-bounded cookie, and per-refresh current token/session revalidation before safe-feed reads.
- The overlay renders only the existing sanitized translated/original/source/badge/purchase projection on a transparent canvas and refreshes through the server authorization boundary. Production/live redemption and GET feed reads remain fixed closed.
- Focused NC-O2 and NC-O1 plus executable no-container/NC-F1/NC-D1/NC-E1/NC-U1/NC-C1/NC-P1 contracts pass locally. Syntax, diff, ownership, secret/private-identifier, browser-storage/query/log, migration RLS/grant/atomicity, and file-size checks pass. Sol semantic review found and verified fixes for live refresh, production GET gate, variable session expiry, atomic redemption, dynamic heartbeat expiry, and SQL heartbeat enforcement; the final review has no concrete findings.
- Fresh worktree dependencies remain absent. Dependency-backed durable-session/session/feed/security contracts, lint, TypeScript typecheck, Next build, OpenNext build, and transparent-canvas width/console/overflow/focus browser QA are setup-blocked; no dependency installation or manifest/lockfile change was performed. Two historical contracts still pin the superseded aggregate action source and old `task.md` DB/Auth/RLS audit prose.
- Migration apply, production database read/write, live token issue/redemption, authenticated browser smoke, deploy, merge, activation, and cleanup remain separate approval boundaries. No remote Supabase, Cloudflare, provider, Stripe, or live account operation was performed.
- PR #734 merged the disconnected NC-P1 Paid provider orchestration seam. Provider/live operation, paid activation, and deployment remain unapproved.
- PR #733 is merged, and the user confirmed its automatic Cloudflare build and deployment succeeded. No Cloudflare or Supabase state was queried in NC-O1.
- NC-C1 adds a disconnected service-role-RPC-only owner glossary with a 30-term bound, NFKC/case/language normalization, optimistic write version, content-derived effective version, note-free provider projection, and glossary-version cache separation. Missing or unreadable authority fails closed; activation remains fixed closed, no existing runtime route invokes the unapplied store, and existing Free behavior remains unchanged.
- Cloudflare Containers, Docker images, managed registry, Container bindings, Container-backed Durable Objects, paid Container permission, and Container fallback remain excluded.

## Current Repository And Release State

- Comment Translator production-control branch remains `codex/comment-translator-free-public-beta-integration`. Do not work directly on `main` or push directly to protected branches.
- Free public beta promotion, login-only activation, Google OAuth approval, edge deferral reconciliation, no-mutation release declaration, and final production smoke are complete.
- The legacy `codex/comment-translator-preview` history is frozen by annotated tag `archive/comment-translator-preview-2026-07-21`. Any remote branch deletion or other cleanup remains a separate explicit operation.
- Prompt-board PR #663 is merged. Its old open-PR handoff and production QA details are historical and no longer belong in the active board.
- New detailed status belongs in the linked authority for that tool or lane. Do not append chronological branch history to this file.

## Standing Product And Security Boundaries

- Per-account authorization is server-owned. Browser input must not select owner, entitlement, provider target, `liveChatId`, billing reference, or paid state.
- Current Free caps remain 30 minutes/user/day, 30 minutes/session, 1 active session/user, 30 translated messages/minute, and 20,000 provider-input/source characters/month.
- Free uses durable usage/session state plus the public entitlement baseline. Missing or unreadable authority fails closed with sanitized status.
- Cache hits remain visible but do not count as provider execution or provider/AI usage.
- Paid access may only derive from signed Stripe webhook evidence, durable entitlement/usage state, and server-owned fallback/stop reasons.
- Raw comments/provider payloads, secrets, tokens, cookies, OAuth values, authorization headers, private identifiers, browser storage payloads, and private URLs must not enter docs, PR bodies, logs, handoffs, or tool output.
- Existing Free auth, quota, privacy, provider, release, and fail-closed behavior must not be weakened by Creator work.

## Operating Rules

- Start repository work with `git fetch origin --prune`, then read `AGENTS.md`, this file, and the relevant active authority.
- Use a fresh isolated worktree and feature branch for independent reviewable work. Keep `1 reviewable goal = 1 PR`.
- Preserve unrelated user-owned changes. Do not clean or rewrite the shared root checkout for preview/integration work.
- Run the smallest targeted verification first, then expand according to changed scope.
- UI changes require width checks at `390 / 820 / 1024 / 1280 / 1366px`, unless the authority gives a narrower justified matrix.
- Keep evidence sanitized and label fixture/local/readiness evidence separately from live/deployed proof.
- Update this file only when the current task index, a standing boundary, or the next approved lane changes. Put detailed execution evidence in the lane authority.

## Approval-Gated Operations

The following require a separately stated target, ready preflight where applicable, sanitized evidence, and explicit approval:

- dependency installation or manifest/lockfile change;
- Cloudflare/Supabase/Google/YouTube/Stripe/provider account observation or mutation;
- environment, secret, binding, schema, migration, role, grant, or default-privilege change;
- OAuth connect/disconnect, target lookup, session start, live polling, translation/provider call, token issue/redeem, Checkout/Portal/webhook, or authenticated live browser smoke;
- deploy/upload, production smoke, gate flip, public release, promotion/merge, or branch/worktree deletion.

## Active Authorities

### Creator no-container

- Architecture: `docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_ARCHITECTURE.md`
- Dependency-ordered task board: `docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_IMPLEMENTATION_TASK_BOARD.md`
- Legacy C1-C12 / CP1-CP2 / P1-1-P1-9 crosswalk: `docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_LEGACY_CROSSWALK.md`

### Free public beta

- Remaining/current release state: `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md`
- Public access/promotion boundary: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md`
- Operator QA baseline: `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md`
- Supabase future-default-privileges accepted risk: `docs/active/COMMENT_TRANSLATOR_SUPABASE_DEFAULT_PRIVILEGES_RISK_ACCEPTANCE.md`

### Other tools/workflow

- Prompt-board MVP: `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`
- Preview development workflow: `docs/active/TOOL_PREVIEW_DEVELOPMENT_WORKFLOW.md`

## Next Reviewable Candidates

1. Review Draft PR #744 and use its automatic Cloudflare check as the remote confirmation of the locally green strict typecheck, lint, Next build, and OpenNext build. Merge remains separately approval-gated.
2. Keep NC-M1/NC-M2/NC-H1 migration apply, production token/capability/history read/write, live issue/redemption/share/feed/entitlement operations, authenticated real-feed/browser smoke, activation, deploy, merge, and cleanup blocked behind their own explicit approvals. Keep the existing NC-O1/NC-O2 external-operation gates unchanged.
3. Roadmap work beyond NC-H1 remains not started in this branch. Treat NC-V1, production/Creator activation, live token/share/history operations, and any retention/storage/read-volume budget as closed until their authority explicitly opens them.
4. Continue to monitor the Supabase future-default-privileges support/risk boundary. New `public` database objects still require explicit object-level grants/RLS/default-privileges review.
5. Do not reopen completed Free release or prompt-board history unless new evidence creates a current action.

## Verification Baseline

- Docs/task-board only: targeted content/link inspection, changed-file secret/private-identifier scan, Markdown structure check, focused authority contract, `git diff --check`.
- Runtime/code: relevant RED/GREEN or characterization contract, lint, strict typecheck, build/OpenNext build where applicable, secret/suppression/debug scans, `git diff --check`.
- UI: deterministic UI/action contract plus required width, overflow, console, keyboard/focus, and relevant authenticated-state checks.
- Live/provider/external operation: same-thread ready preflight, exact target, sanitized output review, explicit approval, sanitized evidence only.
- Missing dependencies in a fresh worktree are environment/setup drift until proven otherwise; do not install without approval.

## Archive And Retention Record

- Exact pre-cleanup snapshot: `docs/archive/task-board-pre-2026-08-01-creator-no-container-cleanup.md`
- Snapshot SHA-256: `086a4c9c9877cd1ee132ff6bedffd505661590e3ee3c66529c92b680e342118b`
- Archived from the active board: completed branch/PR histories, detailed Free launch evidence, superseded blockers, old approval-unit lists, the legacy contract compatibility ledger, and the old C1-C12/CP1-CP2/P1 roadmap tables.
- Deleted from the active board: duplicate status paragraphs, stale “current branch” labels, completed next-session handoffs, superseded readiness claims, and repeated canonical-document listings.
- No runtime source, migration, active authority, evidence document, or existing archive file was deleted.
- Historical contracts that assert old `task.md` prose are archival compatibility checks, not current authority. When such a contract is next maintained, repoint its historical evidence input to the dated snapshot instead of restoring old prose here.
