# task.md

このファイルには現在の運用タスク、次の選択点、継続的に守る境界だけを置く。完了済みの詳細ログ、旧 branch / PR 履歴、比較メモ、古い blocker、旧 next-session prompt は `docs/archive` または各 active authority を参照する。

## Current Task Index

| Priority | Tool / work | Current status | Detail authority |
| --- | --- | --- | --- |
| P0-implementation | Comment Translator Creator NC-X2B Capacity Decision Preflight | NC-X2A PR #756 は merge/integration tip `3bb4b4c4ba6f7ce76fda082f12cdefbcd41d5d1c` に含まれる。NC-X2B は local/docs-only の容量判断であり、30-day retention switch は未承認・未実装。 | `docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_IMPLEMENTATION_TASK_BOARD.md`, `docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_ARCHITECTURE.md`, `scripts/comment-translator-creator-nc-x2-thirty-day-history-search-contract.mjs`, `docs/active/COMMENT_TRANSLATOR_CREATOR_NC_X2B_RETENTION_CAPACITY_DECISION.md`, `scripts/comment-translator-current-task-roadmap-reconciliation-contract.mjs`, `scripts/comment-translator-creator-nc-x2b-retention-capacity-decision-contract.mjs` |
| P1-readiness | Comment Translator Creator Paid launch readiness | NC-R1 control planeはmerged済みだが、Paid launch readinessはpaused NO-GO。Current NC-X2B-P0 boundaryからPaid launch、activation、NC-L1は進めず、Free permanentとNC-L1 not-startedを維持する。 | `docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md` |
| P1-operations | Comment Translator Free public beta | Released and final production smoke complete; `public_release_capable=yes`。release-chain operator action は残っていない。 | `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md` |
| P1-maintenance | 配信カンペボード | MVP と custom delete-dialog follow-up は `main` へ merged。active follow-up は未選択。 | `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md` |
| Workflow | New-tool preview development | Task PR は tool-specific preview / integration branch を対象とし、promotion は readiness と明示承認後に行う。 | `docs/active/TOOL_PREVIEW_DEVELOPMENT_WORKFLOW.md` |

## Current Goal

```text
current_goal=comment-translator-creator-nc-x2b-capacity-decision-preflight
current_branch=HEAD-detached-on-merged-integration-tip
current_base=origin/codex/comment-translator-free-public-beta-integration
current_base_tip=3bb4b4c4ba6f7ce76fda082f12cdefbcd41d5d1c
current_pr=756
current_pr_state=merged
current_pr_implementation_head=9f5e456ae05e47e7043cd63d3d93d41bd51cc0e4
current_pr_base=codex/comment-translator-free-public-beta-integration
current_pr_final_head=9f5e456ae05e47e7043cd63d3d93d41bd51cc0e4
current_pr_merge_integration_tip=3bb4b4c4ba6f7ce76fda082f12cdefbcd41d5d1c
previous_pr=755
previous_pr_state=merged
previous_pr_final_head=c0f7108867080af65bd0f407e98ea9b253207d77
previous_pr_merge_integration_tip=e79944142cf0fcb817895ba7ead2fbe5db8e277b
previous_pr_deployment_status=not-confirmed
current_pr_deployment_status=not-confirmed
implementation_baseline=merged-through-nc-x2a
readiness_control_plane=merged-through-pr751
paid_launch_readiness=paused-no-go
next_implementation_status=nc-x2b-capacity-decision-preflight-local-docs-only
selected_lane=NC-X2B-P0
selected_lane_scope=capacity-preflight-only-no-retention-switch
search_query_fields=author_display_name,original_text,translated_text
search_normalization=rpc-owned-utf8-trim-collapse-whitespace-lower-c-collation
search_bound=50-rows-fetch-51-next-cursor-no-total-count
search_retention=inclusive-seven-days-server-clock-unchanged
search_cursor=opaque-random-pagination-key-owner-query-bound-stale-fail-closed
search_storage=additive-local-migration-not-applied
cleanup_wiring=oauth-disconnect-owner-derived-cleanup-wired-account-deletion-seam-missing
browser_search_authority=props-only-fixed-closed-optional-server-callback
implementation_parent_profile=gpt-5.6-luna/max
implementation_child=none-direct-owner
retention_switch=unapproved-unimplemented
retention_decision=eligible-for-separate-switch-approval
retention_decision_authority=local-design-preflight-not-production-or-account-evidence
current_staged_rows_satisfied=0/8
current_unresolved_hard_requirements=9
activation_status=closed
free_behavior=permanent
nc_l1_status=not-started
deployment_status=unconfirmed
deploy_status=not-confirmed
migration_apply_status=unconfirmed
production_activation=closed
account_headroom=unconfirmed
provider_stripe_cloudflare_supabase_state=unconfirmed
dependencies=absent-no-install-approved
```

## Current Creator State

- PR #725 から PR #747 までに、NC-A0、NC-F1、NC-D1、NC-E1、NC-U1、NC-C1、NC-P1、NC-O1、NC-O2、NC-M1、NC-M2、NC-H1、NC-V1、NC-B1、NC-Q1 の repository implementation chain が merged 済みである。
- PR #748 から PR #751 までに NC-R1 Paid launch readiness authority と staged-resolution control plane が merged 済みである。merge、CI、build、fixture、local evidence から deployment success や production activation を推測しない。
- PR #753 は NC-X4 Overlay Templates、PR #754 は NC-X3 Safe CSV Export、PR #755 は NC-X5 Bounded CSV Import、PR #756 は NC-X2A Seven-Day History Search として merged 済みである。PR #756 head `9f5e456ae05e47e7043cd63d3d93d41bd51cc0e4` は integration tip `3bb4b4c4ba6f7ce76fda082f12cdefbcd41d5d1c` に含まれる。
- NC-R1 は `0/8`、unresolved hard requirements `9`、decision=no-go、activation=closed、Free permanent、NC-L1 not-started のまま paused とする。deployment success、migration apply、production activation、account headroom、provider/Stripe/Cloudflare/Supabase state は未確認である。
- deployment success, migration apply, production activation, account headroom, and provider/Stripe/Cloudflare/Supabase state remain unconfirmed.
- NC-X2B thirty-day retention switch remains unapproved and unimplemented; this task records only a local capacity preflight.
- 別 worktree の未公開 A3 successor draft は repository authority ではなく、この task へ取り込まない。account-specific pricing document の存在、manual read、result、row closure を推測しない。
- NC-L1 は NC-R1 explicit GO と zero unresolved hard requirements が揃うまで開始しない。

## Current Implementation Selection

NC-X2B-P0 は capacity decision の local/docs-only preflight として選択されている。NC-X2A、NC-X3、NC-X4、NC-X5 は merged/closed であり、未実装候補ではない。NC-X2B thirty-day retention switch は未承認・未実装で、このtaskから実装権限を得ない。

| Unselected candidate | Gate before selection or implementation |
| --- | --- |
| NC-X1 | NC-L1 or separate explicit post-MVP approval |
| NC-X6 | product decision first; production implementation remains out of scope until approved |
| NC-X7 | exact provider、cost/data-use boundary、and each live call require separate approval |

NC-X8 / NC-X9 は current paused readiness と追加 product decision に依存する。NC-X2B の runtime/schema/apply/switch はこのtaskでは実装せず、`1 reviewable goal = 1 PR` を維持する。

## Standing Product And Security Boundaries

- Per-account authorization は server-owned。browser input は owner、entitlement、provider target、`liveChatId`、billing reference、paid state を選択しない。
- Free limits は 30 minutes/user/day、30 minutes/session、1 active session/user、30 translated messages/minute、20,000 provider-input/source characters/month を維持する。
- Missing / unreadable authority は fail closed。cache hit は provider execution や provider usage に数えない。
- Paid access は compatible signed Stripe webhook evidence と durable server-owned entitlement / usage state からのみ導出する。Checkout redirect / completion は Paid evidence ではない。
- Raw comments、provider payload、secrets、tokens、cookies、OAuth values、authorization headers、private identifiers、browser storage payload、private URLs を docs、PR、logs、handoff、tool output に残さない。
- Existing Free auth、quota、privacy、provider、release behavior を Creator work で弱めない。
- Container、Docker、managed registry、Container binding、Container-backed Durable Objects、paid Container permission、Container fallback は引き続き除外する。

## Active Authorities

### Creator no-container

- Architecture: `docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_ARCHITECTURE.md`
- Current implementation roadmap: `docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_IMPLEMENTATION_TASK_BOARD.md`
- Legacy crosswalk: `docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_LEGACY_CROSSWALK.md`
- Paused NC-R1 readiness authority: `docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md`
- Paused NC-R1 operator checklist: `docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_OPERATOR_CHECKLIST.md`
- NC-X2B-P0 capacity decision: `docs/active/COMMENT_TRANSLATOR_CREATOR_NC_X2B_RETENTION_CAPACITY_DECISION.md`

### Other active state

- Free public beta: `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md`
- Public access boundary: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md`
- Preview workflow: `docs/active/TOOL_PREVIEW_DEVELOPMENT_WORKFLOW.md`

## Archived Context

- Pre-reconciliation task history: `docs/archive/task-board-pre-2026-08-10-current-state-reconciliation.md`
- Completed temporary visual review note: `docs/archive/PUBLIC_PRELAUNCH_VISUAL_REVIEW_NOTES.md`
- Completed Thumbnail Editor Phase 5 clip plan: `docs/archive/THUMBNAIL_EDITOR_PHASE5_CLIP_PLAN.md`

Archive は履歴参照専用であり、current approval、runtime authority、deployment proof、次 task selection を作らない。

## Operating Rules

- Start work with `git fetch origin --prune`、then read `AGENTS.md`、this file、and the selected active authority。
- Independent task は exact fetched integration tip から fresh isolated worktree / feature branch を作る。
- Current task selection、standing boundary、active authority が変わる場合だけこのファイルを更新し、詳細実行ログは authority または archive へ置く。
- Dependency installation、manifest / lockfile change、remote query / mutation、migration apply、binding / env / secret change、live provider / Stripe / browser operation、deploy、activation、public gate、commit / push / PR / merge、branch / worktree deletion はそれぞれ明示された scope に従う。
- NC-X2B-P0 は S1 を design assumption として記録するだけであり、retention switch、migration apply、remote read/write、deploy、activation、NC-L1 permission を認可しない。
- UI / CSS change があるNC-X4では、transparent OBS canvasと390 / 820 / 1024 / 1280 / 1366幅、overflow、console、keyboard/focusを該当範囲で確認する。
