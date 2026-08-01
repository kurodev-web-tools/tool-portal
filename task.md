# task.md

このファイルには現在の運用タスクと継続的に守る境界だけを置く。完了済みの詳細ログ、旧branch/PR履歴、比較メモ、古いblocker、旧next-session promptは `docs/archive` または各active authorityを参照する。

## Current Task Index

| Priority | Tool / work | Current status | Detail authority |
| --- | --- | --- | --- |
| P0-operations | Comment Translator Cloudflare legacy Durable Object retirement | PR #730-#732 are merged and the latest Cloudflare build completes, but deployment is blocked with API code `10064` because the remote Worker still owns the retired `CommentTranslatorC1Container` namespace. The current branch adds only the explicit legacy delete migration and its local contract; applying it remains a destructive deployment operation. | `docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_ARCHITECTURE.md`, `scripts/comment-translator-cloudflare-legacy-do-retirement-contract.mjs` |
| P1-operations | Comment Translator Free public beta | Released and final production smoke complete; `public_release_capable=yes`. No release-chain operator action remains. | `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md`, `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md` |
| P1-maintenance | 配信カンペボード | MVP and custom delete-dialog follow-up are merged to `main`; no active follow-up is recorded here. | `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md` |
| Workflow | New-tool preview development | Task PRs target a tool-specific preview/integration branch; promotion to `main` occurs only after readiness and explicit approval. | `docs/active/TOOL_PREVIEW_DEVELOPMENT_WORKFLOW.md` |

## Current Goal

```text
current_goal=cloudflare-legacy-c1-durable-object-retirement
current_pr=not-created
current_pr_state=not-created
current_pr_merge_commit=none
current_base=codex/comment-translator-free-public-beta-integration
feasibility_decision=conditional-go
selected_runtime=cloudflare-workers-open-next
selected_persistence=supabase-postgres-existing-server-only-boundary
container_disposition=rejected-not-a-candidate
current_approved_boundary=legacy-do-retirement-config-contract-and-draft-pr
first_designated_implementation_pr=NC-F1
implementation_status=local-green-pr-pending
publication_status=not-approved
deploy_status=blocked-delete-migration-not-applied
```

- Current branch: `codex/comment-translator-retire-c1-durable-object` from integration merge `d8417d6363fb0b7a8ddb75af30c04cc0f2fd42dd`.
- PR #730-#732 are merged. The latest Cloudflare run completes Next.js compilation, TypeScript, static generation, and OpenNext bundling, then fails during `wrangler deploy --name tool-portal --keep-vars` because the remote Worker still depends on the legacy `CommentTranslatorC1Container` Durable Object class.
- The local fix preserves the already-applied `c1-container-v1` migration tag and appends `c1-container-retired-v2` with `deleted_classes`, while keeping the Container code, class export, and Durable Object binding absent. Deploying this migration permanently deletes that legacy namespace and its stored data; no remote deploy or migration apply is performed by this branch preparation.
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

1. Review the legacy Durable Object retirement Draft PR and its irreversible data-deletion boundary before merge or automatic deployment.
2. After an explicitly approved deployment, verify that the `CommentTranslatorC1Container` namespace/binding is retired and that Worker version creation no longer returns code `10064`.
3. Keep NC-P1, production usage/entitlement store wiring/read/write, paid provider execution, activation, and later no-container lanes blocked behind their own explicit approvals.
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
