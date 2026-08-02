# task.md

このファイルには現在の運用タスクと継続的に守る境界だけを置く。完了済みの詳細ログ、旧branch/PR履歴、比較メモ、古いblocker、旧next-session promptは `docs/archive` または各active authorityを参照する。

## Current Task Index

| Priority | Tool / work | Current status | Detail authority |
| --- | --- | --- | --- |
| P0-implementation | Comment Translator Creator NC-M1 Moderator Share Token Runtime | Draft PR #741 is open from `codex/comment-translator-creator-nc-m1` to `codex/comment-translator-free-public-beta-integration`. Local RED/GREEN implementation and root verification are complete. Migration apply, live share, deploy, merge, activation, and cleanup remain unapproved. | `scripts/comment-translator-creator-nc-m1-moderator-token-contract.mjs`, `lib/comment-translator-creator-moderator-token-runtime.ts`, `supabase/migrations/20260802020000_comment_translator_creator_moderator_tokens.sql` |
| P0-operations | Comment Translator Cloudflare legacy Durable Object retirement | PR #733 is merged at integration commit `db328816e0cb0d2e8e8235cc4716095070392451`; the user confirmed the automatic Cloudflare build and deployment succeeded. No further retirement operation is active here. | `docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_ARCHITECTURE.md`, `scripts/comment-translator-cloudflare-legacy-do-retirement-contract.mjs` |
| P1-operations | Comment Translator Free public beta | Released and final production smoke complete; `public_release_capable=yes`. No release-chain operator action remains. | `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md`, `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md` |
| P1-maintenance | 配信カンペボード | MVP and custom delete-dialog follow-up are merged to `main`; no active follow-up is recorded here. | `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md` |
| Workflow | New-tool preview development | Task PRs target a tool-specific preview/integration branch; promotion to `main` occurs only after readiness and explicit approval. | `docs/active/TOOL_PREVIEW_DEVELOPMENT_WORKFLOW.md` |

## Current Goal

```text
current_goal=comment-translator-creator-nc-m1-moderator-share-token-runtime-local-complete
current_pr=741
current_pr_state=draft-open
current_pr_merge_commit=none
current_pr_implementation_head=8b80cdb2e309950c6f6656b3d31dde30261afe31
previous_pr=740
previous_pr_state=merged
previous_pr_merge_commit=2477e687449866d3812c04580a85df83cff778b5
current_base=codex/comment-translator-free-public-beta-integration
current_branch=codex/comment-translator-creator-nc-m1
feasibility_decision=conditional-go
selected_runtime=cloudflare-workers-open-next
selected_persistence=supabase-postgres-existing-server-only-boundary
container_disposition=rejected-not-a-candidate
current_approved_boundary=nc-m1-draft-pr-open
current_lane=NC-M1
implementation_status=local-complete
publication_status=draft-pr-open
deploy_status=not-approved
```

- PR #739 merged implementation head `05e449a7b4a3f38b8ace9827f96231724a4ef670` at `e538b954b4801ded9a3f9ab25ea65f4f1d0ba264`. PR #740 merged head `caf14565bb4399a6f6ba4f6cfd16a8e7b295a062` at fetched integration tip `2477e687449866d3812c04580a85df83cff778b5`. Both heads and merge commits are contained in the fetched integration branch used as the NC-M1 base.
- NC-M1 adds a distinct `moderator-share-read` digest-only token table, service-role RPC store, and server-only runtime. Authenticated owner and current durable session are server-derived; issue returns plaintext once, while read/revoke/validation expose only sanitized metadata and never infer moderator identity, email, recipient, or delivery state.
- One current token is enforced per owner/current-session scope. Same-session duplicate/concurrent issue has one winner and a deterministic fail-closed loser; revoked, expired, replaced-session, reissued-old, cross-token, and cross-scope inputs are rejected. A newly authoritative session can atomically replace the old session's invalid token row.
- All four NC-M1 RPCs enforce the durable 45-second heartbeat boundary and use session-parent-first lock order. The token table has only the session FK cascade, preventing session/account cleanup lock inversion while exact owner/session integrity remains RPC-enforced.
- Focused NC-M1 RED/GREEN and root reruns pass. Executable no-container, NC-F1, NC-D1, NC-E1, login-only/session access, NC-O1, and NC-O2 contracts also pass. Syntax, scope, ownership/import, secret/private identifier, browser authority, OBS authority isolation, debug/suppression, migration RLS/grant/atomicity/lock-order, file-size, and whitespace checks pass. Final Sol semantic review has no concrete findings.
- Fresh worktree dependencies are absent. Dependency-backed public entitlement, durable session, session start/stop, and security/privacy contracts plus lint, TypeScript typecheck, Next build, and OpenNext build are setup-blocked; no dependency installation or manifest/lockfile change was performed.
- Draft PR #741 was opened from commit `8b80cdb2e309950c6f6656b3d31dde30261afe31` against `codex/comment-translator-free-public-beta-integration`. NC-M1 migration apply, production database read/write, live token issue/validation/share, authenticated browser smoke, deploy, merge, activation, and cleanup remain separate approval boundaries. No remote Supabase, Cloudflare, provider, Stripe, or live account operation was performed.
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

1. NC-M1 local implementation and root verification are complete in Draft PR #741. Review and merge require separate approval.
2. Keep NC-M1 migration apply, production token read/write, live issue/validation/share, authenticated browser smoke, activation, deploy, merge, and cleanup blocked behind their own explicit approvals. Keep the existing NC-O1/NC-O2 external-operation gates unchanged.
3. NC-M2 remains out of scope and not started. Treat production/Creator activation and all live token/share operations as closed until their authority explicitly opens them.
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
