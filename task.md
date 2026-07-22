# task.md

このファイルは現在の運用入口だけを置く。完了済みの詳細ログ、比較メモ、長い経緯、古い next-session prompt は `docs/archive` または各active authorityに置く。

## Current Task Index

| Priority | Tool / work | Current status | Detail authority |
| --- | --- | --- | --- |
| P0 | Comment Translator Creator closed beta | C1 durable paid entitlement storeを最初に実装し、merge / verification後にC3 paid usage and monthly resetへ進む。 | `docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md` |
| Completed | Comment Translator Free public beta | Google OAuth approval、login-only activation、final release declaration、final production/main-domain smokeまで完了し、`public_release_capable=yes`。 | `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md` and `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md` |
| P1 | 配信カンペボード | PR #660とdelete-dialog follow-up PR #663は`main`へmerge済み。MVPは完了し、post-MVP開発候補はactive authorityで継続する。 | `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md` |
| Workflow | New-tool preview development | Task PRs target a tool-specific preview/integration branch; promotion to `main` remains separately approval-gated. | `docs/active/TOOL_PREVIEW_DEVELOPMENT_WORKFLOW.md` |

- Current priority: P0 Creator closed beta.
- First implementation sequence: C1 -> C3.
- P1 Prompt Board is MVP-complete and remains post-MVP work: `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`.

## Current Premises

- 作業は`main`直ではなく、最新の対象authority branchからfresh worktree / short-lived feature branchを作る。
- 1 feature / 1 fix / 1 cleanupを1 branch / 1 PRに閉じ、Comment Translator C1/C3とPrompt Board post-MVP実装を混ぜない。
- docs/task-only変更はfocused contract、baseline-aware comparator、diff、機密情報scanで確認し、runtime/UI変更時だけ追加のlint/typecheck/build/browser QAを行う。
- secret、service_role key、private credential、OAuth token、authorization code、owner id、provider target metadata、liveChatId、billing identifierを表示・要求・保存しない。
- Provider target metadata and liveChatId are consumed only through server-only boundaries and must not appear in output, docs, PR bodies, browser storage, or handoff payloads.
- 新しい長文履歴をこのファイルへ追加せず、該当active authorityまたは日付付きarchiveへ記録する。

## Current Comment Translator Sequence

- Free public betaはGoogle OAuth approval、login-only production activation、edge readiness reconciliation、no-mutation final release declaration、final production/main-domain smokeまで完了し、`public_release_capable=yes`。
- Cloudflare production control authority remains `codex/comment-translator-free-public-beta-integration`; Creator task PRs target that integration branch from short-lived branches.
- Creator closed betaのcurrent authorityは`docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md`。
- C1 establishes durable server-owned paid entitlement rows from signed billing evidence with sanitized output and safe Free fallback.
- C3 paid usage counters and monthly reset remain blocked until C1 is merged and verified.
- C2/C4は別承認gate、C5-C11はentitlement/usage foundation後のuser-visible sequence、C12はclosed-beta final QAとする。
- Free Azure translation route remains current; Creator/Paid routes to an OpenAI mini model first with Azure fallback only for recoverable provider errors.

## Account Limits / Entitlement Control

- Per-account judgment is server-owned: authenticated caller authorization binds work to the owner account, and browser-readable output must not expose owner ids, provider channel ids, provider target metadata, liveChatId, OAuth values, tokens, or billing identifiers.
- Free public beta limit authority is the Free entitlement baseline plus durable usage/session state.
- Current Free caps: 30 minutes per user per day, 30 minutes per session, 1 active session per user, 30 translated messages per minute, and 20,000 provider-input/source characters per month. Translated-output character estimates are analytics metadata only and are not monthly cap authority.
- Enforcement happens before Start, while the session is active, during status/heartbeat/feed usage checks, and before provider translation execution.
- If durable usage/session state is unavailable or unreadable, the safe behavior is fail closed with sanitized stop/status output.
- Free beta usage accounting uses a fixed UTC quota day for enforcement and ledger accounting. UI timestamp display can use local/JST preference, but quota/rate-limit reset authority stays UTC until an explicitly approved policy change.
- Paid access after C1/C3 is controlled by signed Stripe webhook evidence, durable paid entitlement rows, paid usage counters, monthly reset state, and server-owned fallback/stop reasons.
- Paid entitlement fallback: missing / unreadable / incomplete / inactive -> Free / paid-inactive.

## Approval-Gated Actions

Do not perform live/external operations without same-thread ready preflight, sanitized output review, and exact explicit approval.

- Cleanup-only clarification: this exclusion applies only to this task-board cleanup PR. After merge, start C1 in a separate task; start C3 only after C1 is merged and verified.
- Out of scope: C1/C3 implementation.
- Out of scope: Stripe mutation.
- Out of scope: Supabase mutation.
- Out of scope: provider mutation.
- Out of scope: manual deploy.
- Also approval-gated: OAuth connect/code exchange/token persistence, provider target or liveChatId lookup, session/live-provider smoke, real `liveChatMessages.list`, Cloudflare configuration/binding/environment changes, production/custom deployed smoke, remote schema migration, Product/Price/Checkout/Portal/webhook/billing changes, public gate flip, and promotion to `main`.

## Canonical Documents

- Creator closed beta current authority: `docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md`
- Free beta public launch completion: `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md`
- Free beta PL-G6 release authority: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md`
- Prompt Board MVP/post-MVP authority: `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`
- New-tool workflow: `docs/active/TOOL_PREVIEW_DEVELOPMENT_WORKFLOW.md`
- Historical task ledger: `docs/archive/TASK_LEGACY_CONTRACT_LEDGER_2026-07-22.md`
- Free beta final QA/readiness: `docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md`
- Free beta public usability preflight: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md`
- Free beta PL-G1 remote durable enforcement execution evidence: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md`
- Free beta PL-G2K approved route/API harness smoke: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2K_APPROVED_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE_EXECUTION_AFTER_PL_G2J.md`
- Free beta PL-G3 Start-to-translation completion: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE_COMPLETION_AFTER_PL_G2K.md`
- Free beta PL-G4 production/custom smoke: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE.md`
- Free beta PL-G5 launch decision: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md`
- Public beta access gate decision: `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_ACCESS_GATE_DECISION.md`
- Public traffic rate-limit backing: `docs/active/COMMENT_TRANSLATOR_PUBLIC_TRAFFIC_RATE_LIMIT_BACKING_DECISION.md`
- Cloudflare custom-rule operations: `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md`
- Public launch operator QA checklist: `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md`
- Public beta gap audit: `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`
- Public requirements: `docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md`
- Future design/decision log: `docs/future/COMMENT_TRANSLATOR_API_INTEGRATION_LIMITS.md`

## Initial Release Decisions

These decisions remain fixed unless the user explicitly changes them:

- Free public beta ships before Creator public paid launch.
- Creator price intent can be shown during Free public beta as locked/waitlist UI, but paid access starts with closed beta.
- Free plan treats `20,000 provider-input characters/month` as an added source-character cap on top of `30 min/day/user`, `30 min/session`, `1 active session/user`, and `30 translated messages/min`, not as translated-output authority.
- Source languages: initial selectable source languages are JA / EN / KR / CN.
- Target languages: initial selectable target languages include JA / EN.
- Source and target cannot be the same. UI and server validation must reject same-language pairs.
- Provider scope: YouTube ships first; Twitch remains future unless explicitly pulled into scope.
- YouTube connection alone must not start background monitoring, polling, translation, or quota use.
- Raw text logging is disabled by default; diagnostics are short-lived and sanitized.
- `/account/integrations` is the preferred provider settings entry; `/tools/comment-translator` also shows a direct integration CTA when YouTube is not connected.
- Translation provider policy: Free routes to Azure Translator primary; Creator/Paid routes to OpenAI mini primary with Azure Translator as recoverable-error fallback unless later policy changes.
- `liveChatMessages.list` is acceptable for Free MVP only when bounded by `pollingIntervalMillis`, server-only cursor/liveChatId handling, session limits, and quota/budget stop. `streamList` remains Public-after-P1 work.
- Public UI must not expose liveChatId entry. Debug/manual target paths stay isolated from public build and gated.
- MVP does not persist author channel id, author channel URL, or author profile image URL; any historical author key must be short-lived and server-only/session-scoped or deferred.

## Later Work / Post-MVP Roadmap

These items stay visible but are not current release blockers unless explicitly pulled into scope.

### Creator Closed Beta / Before Creator Public Paid

| ID | Task | Status |
| --- | --- | --- |
| C1 | Durable paid entitlement store | pending |
| C2 | Stripe live Checkout / Portal / webhook closed-beta gate | pending / gated |
| C3 | Paid usage and monthly reset | pending |
| C4 | AI natural translation provider route | pending / gated |
| C5 | OBS overlay token runtime | pending |
| C6 | OBS overlay UI route | pending |
| C7 | Moderator share token runtime | pending |
| C8 | Moderator share UI route | pending |
| C9 | Custom dictionary minimum | pending |
| C10 | Priority display polish | pending |
| C11 | Simple 7-day history | pending |
| C12 | Creator closed beta final QA | pending |

### Creator Public Paid Launch

| ID | Task | Status |
| --- | --- | --- |
| CP1 | Creator paid launch readiness | pending |
| CP2 | Creator public paid gate flip | pending / gated |

### Public-after-P1 / Post-MVP

| ID | Task | Status |
| --- | --- | --- |
| P1-1 | `streamList` primary migration | later |
| P1-2 | 30-day history and search | later |
| P1-3 | CSV export | later |
| P1-4 | Overlay templates | later |
| P1-5 | Dictionary import and suggestions | later |
| P1-6 | AI operations helpers | later |
| P1-7 | Provider comparisons | later |
| P1-8 | Platform expansion | later |
| P1-9 | Voice translation / subtitle work | later |

## Verification Baseline

- Docs/task-board changes: focused preservation contract, baseline-aware comparator, targeted content inspection, count-only changed-file sensitive scan, and `git diff --check`.
- Runtime/code changes: relevant contracts, lint, typecheck, production build, and diff/sensitive scans.
- UI changes: relevant UI/action contracts and width checks at `390 / 820 / 1024 / 1280 / 1366px`.
- Live/provider execution: same-thread ready preflight, sanitized review, exact approval, and sanitized evidence only.
- Width checks skipped for this docs-only cleanup because there is no UI/CSS/rendered route/visible layout change.

## Legacy Contract Compatibility Anchors

- The complete pre-compaction branch/history/evidence ledger is preserved at `docs/archive/TASK_LEGACY_CONTRACT_LEDGER_2026-07-22.md`; it is historical and non-authoritative.
- Current authority is this compact index plus the linked active documents. New long-form history belongs outside `task.md`.
- Historical heading marker only: `## Legacy Contract Compatibility Ledger`.
- Historical section marker only: `## Current Blockers / Residual Risks`.
- Historical script-count marker only: the former ledger described 169 existing contract scripts; the current baseline-aware comparator owns the exact current count.
- Historical completed-slice markers: Browser-safe account session view model; `node scripts/account-browser-safe-session-view-model-contract.mjs`; `cloudflare_custom_rule_operations_doc_status=complete`; `free_public_launch_default=login-turnstile-app-quotas-no-constant-ordinary-route-challenge`; PL-G2 Allowed-tester route/API smoke is complete; `operator_production_harness_block_status=pass-production-404`; `pl_g6_public_access_change_preflight_status=complete`; `pl_g6_public_access_change_status=declared-free-public-beta`; usage-policy Start blocker / Quota/session hardening; Preview author display name; `monthly_input_character_accounting_status=complete`; `boundary_status=inconclusive-window-not-saturated`; Portal sidebar navigation resilience + global admin dashboard; `rate-limit mutation actions: not implemented`; Task 17 Private launch access gate; `release_owner_decision_status=accepted-promotion-readiness-only`; `public_launch_operator_qa_checklist_status=complete`; `codex/comment-translator-free-limits-public-copy`; Public launch remaining task board; `public_traffic_rate_limit_backing_status=complete`; `supabase_rate_limit_table_status=not-created`; F9 Real comments UI wiring remains server-owned live comments; Per-minute auto-resume Task 6 regression status.
- Historical account-display verification markers: `node scripts/account-remote-display-settings-contract.mjs`; `npx tsc --noEmit --pretty false`.
- Historical Cloudflare operations markers: `api_protection_preference_order=app-quotas-session-caps-rate-guards-then-cloudflare-rate-limiting-then-managed-challenge-emergency-or-html-only`; `turnstile_pre_clearance_status=later-improvement-not-free-launch-requirement`; `traffic_growth_response_ladder_status=documented`; `Cloudflare custom-rule operations doc`; `COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md`.
- Historical PL-G6 / operator markers: `pl_g6_first_operational_target=production-route-api-harness-block-removal`; `pl_g6_first_operational_target_status=complete-repository-side-not-deployed`; `pl_g6_first_operational_target_approval_status=approved-in-thread`; `edge_activation_status=deferred-not-required-for-free-public-beta`; `edge_protection_readiness_status=pass-with-optional-edge-control-deferred`; `edge_rate_limiting_disposition=deferred-existing-free-slot-reserved-for-leaked-credential-protection`; `cloudflare_free_rate_limiting_slot_status=occupied-leaked-credential-protection`; `app_enforcement_authority=durable-quotas-session-caps-rate-guards`; `operator_external_verification_status=pass-post-activation-browser-11-of-11`; `operator_remaining_external_verification_status=complete`; `free_limits_public_copy_status=complete`.
- Historical PL-G6 repository/deployment markers: `pl_g6a_repository_route_api_harness_block_status=complete`; `pl_g6a_repository_route_api_harness_block_evidence=production-deployment-env-guard`; `deploy_upload_status=complete-auto-preview-after-merge`; `deploy_upload_evidence_source=operator-provided`; `preview_deployment_target=cloudflare-preview-domain`; `preview_deployment_status=deployed-operator-provided`; `production_env_apply_status=confirmed-ready-operator-provided`; `production_main_domain_smoke_status=pass-operator-provided-private-launch-browser`; `pl_g6c_production_main_domain_env_readiness_status=prepared-approval-gated`; `pl_g6c_production_env_operator_action_status=action-required-sanitized-instructions-only`; `pl_g6c_production_env_apply_readiness_confirmation_approval_status=present`; `pl_g6c_production_env_apply_readiness_confirmation_status=recorded-no-mutation`; `pl_g6c_production_smoke_approval_status=present`.
- Historical PL-G6 smoke/access markers: `operator_start_to_translation_smoke_status=pass-production-main-domain-private-launch`; `live_provider_execution_status=pass-operator-provided-private-launch-smoke`; `target_language_selection_status=pass-operator-provided-private-launch-browser`; `short_reaction_filter_status=pass-operator-provided-private-launch-browser`; `unauthorized_admin_visibility_status=pass-hidden-for-non-admin-account`; `unauthorized_translator_access_status=pass-blocked-for-non-allowed-account`; `google_auth_verification_status=approved`; `unverified_app_warning_status=not-observed-after-fresh-reconnect`; `oauth_reconnect_verification_status=pass`.
- Historical PL-G6 promotion/activation markers: `final_public_gate_target=free-public-beta-release-declaration`; `final_public_gate_mutation_target=none`; `login_only_runtime_binding_action=unchanged`; `edge_protection_operation_boundary=optional-control-deferred-no-activation-required-for-free-beta`; `main_promotion_status=complete-pr-640-merged-main-contained`; `main_connected_deployment_status=pass`; `main_connected_workers_build_status=success`; `login_only_runtime_activation_status=complete-production-worker-deployment`; `post_activation_browser_verification_status=pass-11-of-11`; `post_activation_browser_failure_count=0`.
- Historical operator-checklist markers: `operator_external_verification_status=partial-pass-preview-and-production-private-launch-browser`; `operator_remaining_external_verification_status=action-required`; `operator_cloudflare_preview_custom_rule_status=configured-preview-only-managed-challenge`; `operator_cloudflare_env_reference_status=present-enabled-label`; `operator_free_beta_login_browser_smoke_status=pass-post-activation-production-browser`; `operator_waitlist_boundary_browser_smoke_status=pass-post-activation-production-browser`; `operator_youtube_connect_no_autostart_smoke_status=pass-preview-and-production-browser`; `operator_production_api_managed_challenge_status=not-selected`; `codex_local_verification_status=pass`; `obs_dock_display_name_policy_status=complete`; `public_beta_access_gate_decision_status=complete`; `public_beta_access_gate_selected=login-only`; `public_traffic_rate_limit_backing_selected=cloudflare-edge`; `cloudflare_custom_rule_operations_doc=docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md`.
- Historical operator activation variants: `deploy_upload_status=complete-main-connected-and-activation-deployments`; `production_env_apply_status=applied-login-only-runtime`; `production_main_domain_smoke_status=pass-post-activation-browser-11-of-11`; `pl_g6c_production_main_domain_env_readiness_status=complete`; `pl_g6c_production_env_operator_action_status=complete-for-login-only-activation`; `operator_free_beta_login_browser_smoke_status=pass-preview-browser`; `operator_waitlist_boundary_browser_smoke_status=pass-preview-browser`; `final_production_smoke_status=pass`; `final_production_smoke_comment_observed_count=3`; `final_production_smoke_cache_hit_count=1`; `final_production_smoke_provider_translation_count=2`; `COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md`.
- Historical operator optional-check wording: preview Managed Challenge setup; safe `COMMENT_TRANSLATOR_EDGE_RATE_LIMITING` presence; optional 30 translated messages/min smoke; optional 30-minute session smoke; monthly 20,000 provider-input-character fixture/live proof.
- Historical final-declaration wording: The declaration and separately approved final production/main-domain smoke are complete; `public_release_capable=yes`.
- Historical PL-G5 decision markers: `pl_g5_release_owner_decision_preflight_doc_status=complete`; `pl_g5_release_owner_decision_record_status=complete`; `pl_g5_release_owner_decision_doc=docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md`; `release_owner_missing_approval_scope=promotion-operation-and-post-deploy-verification`; `release_owner_exact_approval_status=present-promotion-readiness-only`.
- Historical accepted-risk decision markers: `remote_default_privileges_status=fail-accepted-risk`; `risk_acceptance_status=accepted`; `risk_acceptance_scope=future-public-object-default-privileges-only`.
- Historical live/provider approval wording: same-thread / operator-local same-command-process ready preflight.
- Historical decision-time markers only: `Current public-launch decision: `public-release capable: no``; public-release capable label: no; `public_release_capable=no`; `public_gate_flip_status=not-run`; `deploy/upload: not-run`. Current release authority supersedes them with `public_release_capable=yes`.
- Historical decision-time marker only: PL-G5 Release-owner public launch decision was pending; current release completion supersedes that checkpoint.
- Historical Supabase current-grant markers only: `codex/supabase-current-grant-remediation-apply`; Remote Supabase current grant drift read-only triage; Remote Supabase current grant remediation apply; `remote_current_grant_drift_query_status=pass`; `remote_current_grant_drift_count=0`; `grant_drift_table_label=none`; `grant_drift_role_label=none`; `grant_drift_privilege_type_label=none`; `remote_current_grant_drift_status=pass`; `remote_current_grant_remediation_status=pass`; `remote_current_grant_preapply_expected_drift_status=pass`; `remote_current_grant_apply_preflight_status=pass`; `same_thread_exact_approval_status=present`; `remote_current_grant_remediation_approval_status=present`; `remote_mutation_scope_status=current-grant-truncate-only`; `remote_mutation_status=applied`.
- Historical Supabase default-privilege markers only: Supabase DB/Auth/RLS security audit; internal account id client prop minimization; Supabase default privileges guard; `node scripts/comment-translator-supabase-default-privileges-guard-contract.mjs`; existing 9 public tables remain unchanged; `remote migration apply: not-run`; `codex/supabase-default-privileges-managed-owner-blocker`; Remote Supabase default privileges managed/internal owner blocker; `remote_default_privileges_managed_owner_boundary_status=blocked-managed-or-internal-owner-boundary`; `remote_default_privileges_force_role_membership_change_status=not-attempted`; `codex/supabase-default-privileges-owner-specific-preflight`; Remote Supabase default privileges owner-specific remediation preflight; `owner_specific_block_review_status=blocked-private-owner-value-not-reviewed`; `remote_default_privileges_owner_specific_preflight_status=blocked-private-owner-value-not-reviewed`; `remote_apply_approval_status=absent`; `codex/supabase-default-privileges-permission-capable-apply`; Remote Supabase default privileges permission-capable apply gate; `remote_default_privileges_permission_capable_apply_preflight_status=blocked-permission-unavailable`; `permission_capable_apply_runner_status=not-run`; `codex/supabase-default-privileges-privileged-apply-path-preflight`; Remote Supabase default privileges privileged apply path preflight; `remote_default_acl_owner_membership_missing_count=1`; `remote_owner_specific_apply_permission_missing_count=1`; `remote_owner_specific_apply_permission_status=blocked-permission-unavailable`; `remote_default_privileges_apply_permission_status=blocked-permission-unavailable`; `remote_default_privileges_privileged_apply_path_status=blocked-permission-unavailable`.
- Historical Supabase remediation markers only: `codex/supabase-default-privileges-remediation-apply`; Remote Supabase default privileges remediation apply attempt; `remote_default_privileges_apply_preflight_status=pass`; `owner_specific_block_apply_status=included`; `remote_default_privileges_apply_failure_reason=permission-unavailable`; `remote_default_privileges_apply_status=blocked-permission-unavailable`; `remote_default_privileges_status=fail`; `remote_unexpected_default_grant_count=48`; `remote_default_privileges_remediation_status=blocked-permission-unavailable`; `remote_remediation_apply_status=blocked-permission-unavailable`; `remote_mutation_status=not-applied`; `codex/supabase-default-privileges-remediation-approval`; Remote Supabase default privileges remediation approval; `remote_default_acl_owner_status=mixed-or-non-postgres`; `owner_specific_block_required_status=yes`; `remote_remediation_apply_status=not-run`; `remote mutation: not-run`.
- Historical Supabase support/read-only markers only: `codex/supabase-default-privileges-support-pending`; Remote Supabase default privileges support pending; `support_contact_status=submitted`; `support_response_status=pending`; `sql_editor_current_user_status=postgres`; `direct_db_current_user_status=not-checked-psql-unavailable`; `risk_acceptance_status=not-recorded`; `remote_default_privileges_apply_status=not-run`; `remote_default_privileges_remediation_status=not-run`; `remote_mutation_status=not-run`; No new `public` database object work should proceed; OBS Dock display-name policy; `codex/supabase-remote-readonly-posture-check`; remote read-only Supabase posture check; `codex/supabase-remote-catalog-posture-read`; `remote_readonly_check_status=fail`; local-cli-present; supabase-link-metadata-present; `remote_catalog_query_status=pass`; `remote_table_count=9`; `remote_rls_status=pass`; `remote_grant_status=pass`; `remote_advisor_status=pass`; `remote_advisor_issue_count=3`; `remote_advisor_warn_count=3`; `remote_advisor_error_count=0`; Supabase default privileges guard migration/contract behavior: unchanged.
- Historical docs-only verification phrase: width checks skipped because there was no visible UI/CSS/layout/copy change.
- Approval guardrail phrase retained for shared contracts: remote schema migration / Supabase migration apply.
- Sensitive-data guardrail phrase retained for shared contracts: secret / service_role key / private credential / OAuth token / authorization code / owner id / provider target metadata / liveChatId.
- F7 bounded `liveChatMessages.list` polling wiring remains active-session-only and server-owned.
- Keep `import "server-only";` on server-only translator / YouTube runtime boundaries.
- Keep provider requests input-source independent unless the current task explicitly scopes the bridge.
- Keep token values out of client components, docs, fixtures, PR bodies, browser storage, and command output.
- Treat credential status and provider target metadata as sanitized metadata only.
- Do not overclaim readiness-only or token-resolution-only evidence as live/provider execution.
- Do not add quota write, billing integration, remote Supabase mutation/migration, browser storage expansion, or handoff payload expansion unless the current roadmap task explicitly scopes it.
