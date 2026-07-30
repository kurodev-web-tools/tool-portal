# task.md

このファイルは現在の運用入口だけを置く。完了済みの詳細ログ、比較メモ、長い経緯、古い next-session prompt は `docs/archive` または各active authorityに置く。

## Current Task Index

| Priority | Tool / work | Current status | Detail authority |
| --- | --- | --- | --- |
| P0 | Comment Translator Creator public paid readiness | C12はPR #679でmerge・integration verified。CP1 local readinessはcompleteで、external evidenceはblocked / approval-gated。 | `docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md` and `docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md` |
| Completed | Comment Translator Free public beta | Google OAuth approval、login-only activation、final release declaration、final production/main-domain smokeまで完了し、`public_release_capable=yes`。 | `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md` and `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md` |
| P1 | 配信カンペボード | PR #660とdelete-dialog follow-up PR #663は`main`へmerge済み。MVPは完了し、post-MVP開発候補はactive authorityで継続する。 | `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md` |
| Workflow | New-tool preview development | Task PRs target a tool-specific preview/integration branch; promotion to `main` remains separately approval-gated. | `docs/active/TOOL_PREVIEW_DEVELOPMENT_WORKFLOW.md` |

- Current priority: P0 Creator public paid launch readiness.
- C1-C12 are merged / integration verified through C12 PR #679 at `097f369a47564b7a44d211c212580f993eddc71b`; CP1 local readiness is complete while external/deployed/browser/release-owner evidence remains blocked / approval-gated.
- P1 Prompt Board is MVP-complete and remains post-MVP work: `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`.

## Current Premises

- 作業は`main`直ではなく、最新の対象authority branchからfresh worktree / short-lived feature branchを作る。
- 1 feature / 1 fix / 1 cleanupを1 branch / 1 PRに閉じ、Comment Translator Creator各sliceとPrompt Board post-MVP実装を混ぜない。
- docs/task-only変更はfocused contract、baseline-aware comparator、diff、機密情報scanで確認し、runtime/UI変更時だけ追加のlint/typecheck/build/browser QAを行う。
- Creator paid初回価格の承認済み方向と将来2段階案は`docs/future/COMMENT_TRANSLATOR_CREATOR_TIER_PRICING_DIRECTION.md`を参照する。初回はCreator月額980円（税込）のmonthly-only、Creator Plus月額1,980円（税込）はfuture planning onlyであり、Stripe作成・設定authorityではない。
- secret、service_role key、private credential、OAuth token、authorization code、owner id、provider target metadata、liveChatId、billing identifierを表示・要求・保存しない。
- Provider target metadata and liveChatId are consumed only through server-only boundaries and must not appear in output, docs, PR bodies, browser storage, or handoff payloads.
- 新しい長文履歴をこのファイルへ追加せず、該当active authorityまたは日付付きarchiveへ記録する。

## Current Comment Translator Sequence

- Free public betaはGoogle OAuth approval、login-only production activation、edge readiness reconciliation、no-mutation final release declaration、final production/main-domain smokeまで完了し、`public_release_capable=yes`。
- Cloudflare production control authority remains `codex/comment-translator-free-public-beta-integration`; Creator task PRs target that integration branch from short-lived branches.
- Creator closed betaのcurrent authorityは`docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md`。
- C1 establishes durable server-owned paid entitlement rows from signed billing evidence with sanitized output and safe Free / paid-inactive fallback; PR #668 is merged and integration verified at `c4b7bc4cd03ad400c737ae662e1e94c4462e9995`, while remote migration apply remains incomplete.
- C3 adds service-role-only paid counters, private event deduplication, and atomic reset only when signed entitlement evidence advances its period end; PR #669 is merged and integration verified at `5fc3cca2730a58f35279098ec0b2f5c804ce0076` with C3 head `85fa39896f63e223463a85000eb8e02f538754d4` contained in integration.
- C2 is merged through PR #670 at exact integration commit `4486c180f68369d6620b9f8f3df33518b7cadc38`; the integration tree matches C2 head `761f503f276a5a7e095c79be5f3ca31c26fe6fff`. Stripe live activation remains separately approval-gated.
- C4 is merged through PR #671 at exact integration commit `fa0d5582a296c2164bd3945c37cbec746315f357`; C4 head `5be49c1995f484145e5989384f0bfd36bbcbe1bb` is contained in integration and both trees are `414ad101c5bdaa56fe205a967a3e63bbb1e5f1b9`.
- C5 is merged through PR #672 at exact integration commit `f3bdf0d7400b479f6934f37af402d7ec5187c7c8`; C5 head `609786cca868c976bf33ee197fe069cf22b9ec40` is contained in integration and both trees are `2c5c762a99ac85343f1521c13aec81ede6a661f1`.
- C6 is merged through PR #673 at exact integration commit `05104fc2d4c6730be6aae772708a10cb2b39d2d6`; C6 head `60729f844b099d687e8c28ae794d38398d5a31ad` is contained in integration and both trees are `9090e9af7d2f20a1258eca5e2840895cb7e35c8b`. Authenticated safe-feed browser QA remains separately approval-gated.
- C7 is merged through PR #674 at exact integration commit `0307b5542c8ac9957370533228ec02893bd48c27`; C7 head `23369de66fe75d4068c923334b09712ef0bd9831` is contained in integration.
- C8 is merged through PR #675 at exact integration commit `1ec79ca222149626670ec6692c19356bc56bb2c6`; C8 head `b2bfc5e52ef529a626440334654738a1b4c0e799` is contained as the second merge parent and both trees are `5e06baefd75b8a00010581956953cb6547debff9`.
- C9 adds authenticated owner-only server CRUD for at most 30 language-scoped terms, a service-role-only durable store/migration, optimistic stale-write rejection, deterministic effective dictionary versioning, and C4 `glossaryTerms` / `glossaryVersion` cache integration. PR #676 is merged and integration verified at `6f9c2de4c1a14b91ae094987af46e0c46c99cfeb`; C9 head `10b48d524901c54e4c0402c05709d95bdfe92792` is contained in integration.
- C10 adds one browser-safe priority classification seam with deterministic `Super Chat -> Super Sticker -> owner -> moderator -> member -> standard` precedence, fail-safe malformed metadata handling, Creator and moderator Priority filters, and shared Creator/OBS/moderator category badges without adding an API or authority surface. PR #677 is merged and integration verified at `c0ac7152687dc0c91470037ec164fda57d7f4259`; C10 head `834284011252782d98139072c7a183c854f9302a` is contained in integration.
- C11 is merged through PR #678 at exact integration commit `d1ce9b0d063f65bac968c85f3242398be4b8317f`; C11 head `4bf598f7fca3f21175de7b3aeda0d001121b376b` is contained in integration. It adds authenticated, server-derived paid-active Creator-only seven-day browser-safe history, service-role-only durable snapshots, exact instant-based cutoff reads, owner-scoped cleanup readiness, strict deleted tombstones, and C10 priority preservation.
- C12 PR #679 is merged / integration verified at `097f369a47564b7a44d211c212580f993eddc71b`; C12 head `e93bfb77dc2017fd4a15e99e075f7e419c14a94d` is contained in integration.
- CP1 local readiness is complete through `docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md`. Five evidence lanes, 11 ordered stages, 72 independent approval units, and the later six-surface width sequence are defined without running external operations.
- A separately approved CP1 follow-up from integration revision `19eaa0fe0d52c4563ae1957d994c679d0b4bd0dc` adds source for one preview/integration-only, side-effect-free reference-presence GET route. Deploy, Worker invocation, configuration changes, billing activation, CP2, `main` promotion, and public paid launch remain separate approval gates.
- CP1-S2 C3 readiness distinguishes the trigger-internal entitlement-sync reference from the direct service-role usage-apply reference. Approved sanitized catalog evidence confirms the direct execution reference, reviewed trigger binding, and revoked direct client execution; no grant remediation was required or performed. Store behavior evidence remains separately approval-gated.
- PR #684 is merged at its reviewed integration tip `dd698bf093615c1741e25b73b37761a68804c45b`. Both C1 fail-closed read approvals stopped before a remote read, and the earlier runtime-source discovery remained fail-closed with two required roles, zero available roles, and zero eligible sources. The synthetic-only C1 runtime-role classifier harness is locally GREEN with fixed 14-field output and independent fail-closed fixtures. The first actual-authority classification approval is consumed and aborted with `required_count_mismatch` / `no_changes_applied`; the corrected trusted-factory handoff classification is consumed and passed with exactly two server-owned roles, one noncredential endpoint role, one privileged server-secret role, zero client-consumed or ambiguous roles, and one concrete constructor. The role-aware runtime-source presence discovery is consumed and aborted with `0 endpoint / 0 server-secret / 0 complete source`. The first `same-process-ephemeral` provisioning approval is consumed and blocked at attempt 0, and the initial opaque runner unit is consumed/aborted on input separation. `RETRY-1` is consumed and passed with `1 endpoint / 1 server-secret / 1 complete same-process source / held-idle`, but the runner exposes only presence/status/stop and has no adapter/read execution consumer. The stop-only approval is consumed and aborted after one stop action because termination status could not be confirmed; no retry or post-stop status inspection ran, so process retention is unchecked. The hash-bound stop-result static diagnosis is consumed/pass with zero runner controls and `contract-wrapper-drift`; it does not establish current process state. The contract-expectation remediation design is consumed/pass with one mismatch locus, one proposed contract-only edit, two synthetic fixture requirements, and no artifact change/execution. The contract-only remediation implementation is consumed/aborted because only one of two fixture outcomes matched; the exact pre-change contract hash was restored and no runner control ran. S2N is consumed/aborted before verifier execution because the negative fixture identity was ambiguous. S2O is consumed/aborted at design attempt 0 after local parser syntax failure and did not read artifacts. S2P RETRY-1 is consumed/aborted because its local driver did not reduce the nested tool result envelope. S2Q diagnosed `nested-tool-result-envelope-not-reduced`; S2R remediated the transient reducer with `2/2` synthetic fixtures and no persistent change. S2S RETRY-2 is consumed/aborted before artifact access because `TextEncoder` was unavailable. S2T then passed the full local encoding/decoding/single-envelope/fixed14 pipeline with `2/2` synthetic fixtures, zero artifact access, zero nested tool execution, and zero runner controls. S2U RETRY-3 is consumed/aborted before fixture design with `design_attempt_count=0`, `artifact_hash_match_count=0`, and `abort_status=triggered-artifact-read-command-failure`; it is not reusable. S2V static diagnosis is consumed/aborted as ambiguous with all artifact/nested-command/runner counts at zero and no proposed remediation. S2W synthetic command-construction design is consumed/pass with `3 placeholders / static tokenization pass / explicit positional binding / single sanitized result envelope / 0 artifact access / 0 nested command / 0 runner control`. S2X synthetic execution preflight is consumed/pass with `1 attempt / 0 artifact access / 1 nested command / 0 runner control / 3 arguments / binding pass / shell pass / single-envelope pass / sanitized payload pass / no persistent change`. RETRY-4 is consumed/aborted before its driver invocation with `design attempt 0 / artifact hash matches 0 / runner controls 0 / explicit path binding unavailable`; it did not access an artifact, execute a nested command, or design a fixture. S2Z explicit artifact-path positional binding is consumed/pass with `3 roles / explicit operator-supplied positional paths / no document-shell-env-metadata extraction / one sanitized result envelope / no persistent change`. RETRY-5 is consumed/aborted with design attempt 0 because private path inputs were absent; no driver, artifact access, nested command, fixture design, or runner control ran. S2AB repository-local artifact-path resolution is consumed/aborted with zero content/hash reads and ambiguous role binding. S2AC basename-predicate cardinality diagnosis is consumed/pass with `0 wrapper / 0 runner / 0 contract / all-role-zero-match`; S2AD is consumed/aborted before nested Git Bash or artifact access on local driver script parse failure, S2AE RETRY-1 is consumed/aborted at syntax-only preflight before actual-driver execution, S2AF RETRY-2 is consumed/aborted after one compiled-driver invocation returned `triggered-nested-command-failure`, and S2AG RETRY-3 is consumed/aborted after one syntax-passed transient-driver execution found zero unique reviewed-hash matches. The transient driver was deleted; historical hash binding and deterministic fixture-pair identity remained incomplete until the later S2AO/S2AP closeout. Runner extension, re-entry, client initialization, adapter invocation, and remote/deployed unreadable-state behavior remain unchecked / separately approval-gated.
- S2AH canonical-byte-source RETRY-4 is consumed/aborted after one syntax-passed transient-driver execution found zero reviewed-hash matches across the permitted tracked working-tree/index/LF/CRLF byte sources. The transient driver was deleted; fixture identity design, artifact execution/change, runner control, and external action remain not-run.
- S2AI ancestor-blob RETRY-5 is consumed/aborted after one syntax-passed transient-driver execution found zero reviewed-hash matches across permitted tracked `scripts/` blobs reachable from the reviewed revision. The transient driver was deleted; fixture identity design, artifact execution/change, runner control, and external action remain not-run.
- S2AJ original-untracked-artifact RETRY-6 is consumed/aborted after all three reviewed hashes bound uniquely and distinctly, because the six fixed-wrapper expectations did not reduce to one numeric-remediation ordinal. The transient driver was deleted; no transform, artifact execution/change, runner control, or external action ran.
- S2AK structure-reducer RETRY-7 is consumed/aborted after all three reviewed hashes again bound uniquely and distinctly, because the approved structure reducer still did not reduce the fixed-wrapper expectations to one numeric-remediation ordinal. The transient driver was deleted; no transform, artifact execution/change, runner control, or external action ran.
- S2AL balanced assert-match argument RETRY-8 is consumed/aborted after all three reviewed hashes again bound uniquely and distinctly, because the reducer did not produce one canonical first-argument binding and six-expectation candidate. The transient driver was deleted; no transform, dependency installation, artifact execution/change, runner control, or external action ran.
- S2AM ordered-regex-window RETRY-9 is consumed/aborted at its five-shape synthetic gate before artifact access. The transient driver was deleted; no artifact content/hash read, fixture design, transform, dependency installation, runner control, or external action ran.
- S2AN corrected ordered-regex-window RETRY-10 is consumed/aborted after its synthetic gate passed and all three reviewed hashes matched, because the candidate set remained ambiguous. The transient driver was deleted; no transform, artifact execution/change, runner control, or external action ran.
- S2AO goal-bound fixture identity design is consumed/pass with runtime remediation ordinal 4 retained and the negative fixture selected from three valid static-invariant candidates by lexicographically smallest negative SHA-256. Its fixed14 identity became the input authority for the later S2AP post-merge execution closeout.
- PR #689 is merged at `2888bb1a60fdd6851688e3e7b323a40b3c21869c`; reviewed head `05178a973dbec207a1082d79ff31816dd4bfd9ea` is contained in integration. The single-use Buffer-to-factory/store/read bridge remains `10/10` locally GREEN. Focused constructor compatibility characterization proves that the repository factory performs two immutable string normalizations before passing both strings to the service-client constructor, while Buffer zero-fill cannot clear either string copy. Production wiring remains disconnected because installed SDK source is absent and its internal retention/copy lifetime cannot be verified.
- PR #690 is merged at integration commit `4bd5dd09c4501a666bfc961104f3280bd66b8117`; reviewed head `c0f749ca5a6dc5ed5b8dab63b3c722a68835df6e` is contained in integration. It fixes the production-constructor compatibility blocker: the current factory requires two immutable normalized strings, so the Buffer zero-fill guarantee cannot cover constructor inputs or unverified SDK retention.
- PR #691 is merged at `340d6b0ec719e1e871205a03d48cda295f07068b`; reviewed head `60b0ec43f8fa4722b2830e8f99535348146e46f4` is contained in integration. The C1 single-use child-process decision preflight is locally GREEN with inert/synthetic-only construction/read, bounded parent transfer/write, deterministic construction/read-error and stop exit, fixed spawn/IPC error fail-closed handling, fixed sanitized results, and distinct in-flight / settled-without-exit / post-exit repeat suppression. It proves repository lifecycle counts and observed process exit only where an actual child reached an exit event; IPC/V8/runtime/OS cleanup and SDK internal retention/teardown remain unverified, so it is not adopted and production wiring stays disconnected.
- PR #692 is merged at `622a4804bfd42293ea6305d960b01e0cf7e35ba0`; reviewed head `6f09c2ca334bfac0d9187215aca0279efff575da` is contained in integration. It fixes the zeroizable-client boundary direction as repository-only synthetic evidence and does not adopt a production client.
- PR #693 is merged at `3ec35af019576bf199d8893c5fd856c87575d103`; reviewed head `e1f48e0cd6d0eeb94e4546b5c2d5c20487354e61` is contained in integration. The approved source-backed candidate feasibility preflight classifies four locally enumerable candidate classes with zero eligible and four rejected. It adds no production import, wiring, real constructor/read/input, dependency, or transport.
- PR #694 is merged at `9d64995dd30fe560a44cf4cf82a3cc67cf00b8d0`; reviewed candidate-audit head `0c3309d63a992decb083c95ce1ddffbd9fcadb4f` is contained in integration. No later integration commit or operator-provided exact source/revision is present, so the four-class candidate audit is not repeated. The governance decision selects exact source/revision waiting while preserving the current guarantee and disconnected production wiring.
- c1_guarantee_governance_base=9d64995dd30fe560a44cf4cf82a3cc67cf00b8d0
- c1_guarantee_governance_preflight_status=local-decision-pass-review-ready
- c1_guarantee_governance_route_count=3
- c1_guarantee_governance_recommendation=accept-process-isolation-residual-risk-and-change-guarantee
- c1_guarantee_governance_current_guarantee=parent-child-buffer-zero-fill-and-single-use-exit-containment
- c1_guarantee_governance_exact_source_status=absent
- c1_guarantee_governance_repeat_candidate_audit_status=prohibited-no-new-exact-source
- c1_guarantee_governance_process_isolation_risk_acceptance_status=consumed-exact-approval
- c1_guarantee_governance_next_approval_unit=C1-CLOUDFLARE-CONTAINER-RUNTIME-BOUNDARY-IMPLEMENTATION-1
- c1_guarantee_governance_approval_status=consumed-exact-process-isolation-guarantee-change
- c1_guarantee_governance_production_adoption_approval_status=absent
- c1_process_isolation_wiring_design_approval_status=consumed
- c1_process_isolation_wiring_design_execution_status=pass
- c1_process_isolation_wiring_implementation_readiness_status=blocked-current-worker-nonfunctional-child-process
- c1_process_isolation_wiring_parent_responsibility=authorize-derive-reference-own-three-input-buffers-spawn-once-validate-sanitized-result-wait-exit
- c1_process_isolation_wiring_child_responsibility=construct-once-read-once-return-status-only-zero-fill-three-input-buffers-exit
- c1_process_isolation_wiring_input_buffer_count=3
- c1_process_isolation_wiring_result_shape=execution-status-result-status-termination-status-fixed-counts-only
- c1_process_isolation_wiring_normal_boundary=parent-zero-fill-after-ipc-write-child-zero-fill-before-disconnect-parent-success-after-valid-result-and-observed-zero-exit
- c1_process_isolation_wiring_error_boundary=zero-fill-owned-buffers-fail-closed-no-success-without-valid-result-and-observed-zero-exit
- c1_process_isolation_wiring_stop_boundary=sigterm-child-zero-fill-exit-parent-zero-fill-fail-closed
- c1_process_isolation_wiring_repeat_boundary=single-use-inflight-and-post-settlement-suppressed-late-success-ignored
- c1_process_isolation_wiring_configuration_boundary=reference-names-only-next-public-supabase-url-and-supabase-service-role-key
- c1_process_isolation_wiring_runtime_target=opennext-cloudflare-worker
- c1_process_isolation_wiring_spawn_capability_status=blocked-workers-child-process-nonfunctional-stub
- c1_process_isolation_wiring_rollback=retain-disconnected-remove-future-wiring-only-under-separate-approval
- c1_process_isolation_wiring_abort=runtime-target-or-bundle-or-input-ownership-or-result-shape-mismatch
- c1_process_isolation_wiring_next_implementation_unit=C1-CLOUDFLARE-CONTAINER-RUNTIME-BOUNDARY-IMPLEMENTATION-1
- c1_process_isolation_wiring_next_implementation_unit_status=blocked-separate-implementation-approval
- c1_process_isolation_runtime_target_feasibility_approval_unit=C1-PROCESS-ISOLATION-RUNTIME-TARGET-FEASIBILITY-1
- c1_process_isolation_runtime_target_feasibility_approval_status=consumed-goal-authority
- c1_process_isolation_runtime_target_feasibility_status=blocked-current-worker-no-functional-child-process
- c1_process_isolation_runtime_target_current=opennext-cloudflare-worker
- c1_process_isolation_runtime_target_worker_compatibility_date=2026-05-27
- c1_process_isolation_runtime_target_worker_child_process_status=nonfunctional-stub
- c1_process_isolation_runtime_target_required=process-capable-isolated-node-host
- c1_process_isolation_runtime_target_alternative=separate-cloudflare-container-or-operator-node-service
- c1_process_isolation_runtime_target_topology_authority_status=selected-cloudflare-containers
- c1_process_isolation_runtime_target_production_implementation_status=blocked-separate-implementation-approval
- c1_process_isolation_runtime_target_next_unit=C1-CLOUDFLARE-CONTAINER-RUNTIME-BOUNDARY-IMPLEMENTATION-1
- c1_process_isolation_runtime_target_selection_base=7365b9e2940acd34e1d9960f55e08041efa0e632
- c1_process_isolation_runtime_target_selection_approval_unit=C1-PROCESS-ISOLATION-RUNTIME-TARGET-SELECTION-1
- c1_process_isolation_runtime_target_selection_status=selected-review-ready
- c1_process_isolation_runtime_target_candidate_count=2
- c1_process_isolation_runtime_target_selected_count=1
- c1_process_isolation_runtime_target_selected=cloudflare-containers
- c1_process_isolation_runtime_target_container_process_status=functional-exec-with-stdin-exitcode-and-kill
- c1_process_isolation_runtime_target_container_availability=general-availability
- c1_process_isolation_runtime_target_container_beta_status=not-beta
- c1_process_isolation_runtime_target_container_sla=container-specific-public-sla-not-established
- c1_process_isolation_runtime_target_container_cost_class=workers-paid-usage-based-container-durable-object-and-worker
- c1_process_isolation_runtime_target_operator_node_service_status=rejected-no-approved-platform-topology
- c1_process_isolation_runtime_target_parent_owner=container-single-use-node-parent
- c1_process_isolation_runtime_target_child_owner=container-single-use-node-child
- c1_process_isolation_runtime_target_secret_input=worker-to-container-rpc-byte-stream-to-parent-stdin-never-argv-or-environment
- c1_process_isolation_runtime_target_transport=worker-container-durable-object-rpc-stream-in-fixed-sanitized-result-out
- c1_process_isolation_runtime_target_lifecycle=durable-object-coordinates-one-exec-parent-coordinates-one-child-success-after-valid-result-and-observed-zero-exits
- c1_process_isolation_runtime_target_repeat_boundary=inflight-and-post-settlement-suppressed-late-success-ignored
- c1_process_isolation_runtime_target_stop_boundary=kill-parent-and-child-zero-fill-owned-buffers-observe-exits-fail-closed
- c1_process_isolation_runtime_target_deployment_topology=opennext-worker-to-container-durable-object-binding-to-versioned-node-image
- c1_process_isolation_runtime_target_rollback=keep-disconnected-until-separate-approval-then-revert-worker-version-with-image-retained
- c1_process_isolation_runtime_target_abort=stream-ownership-or-exec-or-exit-observation-or-sanitized-shape-or-image-retention-mismatch
- production_source_change_count=0
- production_configuration_change_count=0
- dependency_install_count=0
- configuration_binding_count=0
- remote_service_operation_count=0
- deploy_activation_cp2_public_launch_count=0
- result_marker=C1_PROCESS_ISOLATION_RUNTIME_TARGET_SELECTED
- C1 runtime-target selection is review-ready at exact integration `7365b9e2940acd34e1d9960f55e08041efa0e632`: Cloudflare Containers is the sole selected target because the current GA platform supplies a Worker-controlled Durable Object boundary, real process `exec`, byte-stream stdin, exit observation, and termination control. An operator-owned Node service remains unselectable without an approved platform, SLA, cost, deployment, and rollback authority. Selection adds no production source, dependency, binding, image, configuration, deploy, activation, or remote operation; production stays disconnected and Free / paid-inactive behavior is unchanged.
- `C1-CLOUDFLARE-CONTAINER-RUNTIME-BOUNDARY-IMPLEMENTATION-1` is locally reviewable from exact integration `41fec06419e271e61295bcc5672d9852bdb0c9d4`. It pins `@cloudflare/containers` `0.3.7`, a versioned Node 22.22.2 image, fixed Container/parent/child entrypoints, one SQLite Durable Object binding/migration, byte-stream-only stdin ownership, persistent opaque attempt-state suppression, parent/child Buffer zero-fill, and observed zero-exit success. The child remains inert/synthetic-only and the billing runtime does not import the boundary, so production paid reads stay disconnected and Free / paid-inactive behavior is unchanged.
- c1_cloudflare_container_boundary_status=reviewable-local-production-boundary-inert
- c1_cloudflare_container_dependency=@cloudflare/containers@0.3.7
- c1_cloudflare_container_image=node:22.22.2-bookworm-slim
- c1_cloudflare_container_attempt_state=opaque-key-inflight-settled-aborted-only
- c1_cloudflare_container_success=valid-fixed-sanitized-result-and-observed-zero-exits
- c1_cloudflare_container_rollback=retain-referenced-image-and-revert-worker-version-under-separate-approval
- c1_cloudflare_container_production_read=disconnected-fail-closed
- c1_cloudflare_container_worker_bundle_status=pass-before-container-image-build
- c1_cloudflare_container_image_build_status=blocked-local-docker-cli-unavailable
- `C1-CLOUDFLARE-CONTAINER-IMAGE-EXECUTION-EVIDENCE-1` is reviewable from exact integration `c7e320473da88d9fd3dc0354be27997912a5ef2c` and remains fail closed. Windows has zero existing Docker-compatible CLIs and engines, and WSL has zero installed distributions. Docker Desktop cannot be started without accepting its subscription agreement; the official Podman Windows engine path requires machine setup with administrator/restart prerequisites. Those actions are outside this unit, so no runtime was installed and no image build/run/stop occurred. The exact Dockerfile, fixed entrypoints, Worker/config/binding/migration, disconnected production read, and retained-image rollback requirement remain unchanged.
- c1_cloudflare_container_image_execution_evidence_base=c7e320473da88d9fd3dc0354be27997912a5ef2c
- c1_cloudflare_container_image_execution_evidence_status=blocked-fail-closed
- c1_cloudflare_container_image_execution_evidence_blocker=blocked-no-existing-engine-safe-install-requires-license-or-admin-restart
- c1_cloudflare_container_runtime_cli_count=0
- c1_cloudflare_container_runtime_engine_count=0
- c1_cloudflare_container_wsl_distribution_count=0
- c1_cloudflare_container_runtime_install_count=0
- c1_cloudflare_container_image_build_count=0
- c1_cloudflare_container_run_count=0
- c1_cloudflare_container_stop_signal_count=0
- c1_cloudflare_container_production_read=disconnected-fail-closed
- remote_service_operation_count=0
- deploy_activation_cp2_public_launch_count=0
- `C1-CLOUDFLARE-CONTAINER-IMAGE-EXECUTION-EVIDENCE-RETRY-1` is reviewable from exact integration `a8fb4e1953391f27ed06b6b05c89fb2b2d9b896d`. Official Podman 5.8.2 added a verified per-user Windows MSI path that required no elevation, restart, license interaction, authentication, secret, or account operation on the already-enabled WSL 2 host. One bounded WSL machine built the exact `node:22.22.2-bookworm-slim` Dockerfile and retained the fixed local image. Five image runs proved the default ENTRYPOINT start/SIGTERM/zero-exit path plus synthetic available, missing, unavailable, and malformed-frame parent paths. Container argv/environment/log/diff/metadata held no three-input fixture material, stdout was the fixed sanitized result only, and no volume mount existed. The focused runtime contract still proves Buffer zero-fill, persistent attempt suppression, Worker bundle/config/binding/migration consistency, and disconnected production read. Free and paid-inactive remain unchanged; IPC/V8/runtime/OS/SDK internal copy erasure and teardown remain accepted residual risk.
- c1_cloudflare_container_image_execution_retry_1_base=a8fb4e1953391f27ed06b6b05c89fb2b2d9b896d
- c1_cloudflare_container_image_execution_retry_1_status=local-image-execution-pass-review-ready
- c1_cloudflare_container_image_execution_retry_1_blocker=none
- c1_cloudflare_container_runtime_cli_count=1
- c1_cloudflare_container_runtime_engine_count=1
- c1_cloudflare_container_wsl_distribution_count=1
- c1_cloudflare_container_runtime_install_count=1
- c1_cloudflare_container_image_build_count=1
- c1_cloudflare_container_run_count=5
- c1_cloudflare_container_stop_signal_count=1
- c1_cloudflare_container_retained_image_count=1
- c1_cloudflare_container_input_exposure_count=0
- c1_cloudflare_container_production_read=disconnected-fail-closed
- remote_service_operation_count=0
- deploy_activation_cp2_public_launch_count=0
- C1 production source procurement is fixed at PR #695 integration tip `d206ff2c07cc10aeb701d0d2034a29b17f58d42b`. One new node-libcurl/libcurl Windows native envelope was researched from official metadata only and rejected with `0/7` proofs established; no PR #694 candidate class was re-audited, no archive was downloaded, and no dependency or production path was executed.
- CP1 remaining external-evidence reconciliation is current through exact integration base `d20add97f05fc4298043939049e8931c45b43500`. `CP1-A-STORE-READINESS`, `CP1-A-STORE-WRITE-READ`, and `CP1-A-STRIPE-PRODUCT-PRICE` are consumed/pass. The operator-returned sanitized Stripe envelope records complete Product/Price duplicate scans with `0 / 0` eligible candidates, followed by exactly one verified live Creator Product and one verified live monthly `980 JPY` tax-inclusive Price creation; `2` reads, `2` mutations, `0` retries, `0` rollback/cleanup, and `0` sensitive/private-identifier output. No private Product/Price reference is repository authority. The next ordered independent unit is `CP1-A-STRIPE-CHECKOUT`, but it is not executable until separately approved readiness work proves the required live runtime reference presence and the C1 durable billing-state read boundary. The exact process-isolation guarantee-change approval is consumed: repository-owned parent/child Buffer zero-fill plus single-use child-process exit containment is now the C1 design guarantee, while IPC/V8/runtime/OS/SDK copy erasure and teardown remain accepted residual risk. Production wiring remains `disconnected-fail-closed`; Checkout, Portal, webhook, configuration binding, billing activation, deploy, and public launch remain not-run.
- `CP1-A-STRIPE-CHECKOUT-RUNTIME-READINESS-PREFLIGHT-1` is consumed at exact clean integration `f5e81b21382b1d07b9d5dd20f78c2fbbceb9e5c5`. Production reference presence reduced to `route unavailable / 5 unreviewed`, while code and final PR #713 authority prove the C1 durable billing-state production read remains `disconnected-fail-closed`. The unit stops with one blocker `c1-durable-billing-state-read-disconnected`, unchanged Free / paid-inactive behavior, and zero Stripe SDK initialization, Customer, Checkout Session, remote mutation, deploy, activation, Portal, webhook, CP2, promotion, merge, or public-launch actions. `CP1-A-STRIPE-CHECKOUT` remains non-executable.
- `CP1-A-C1-PRODUCTION-DURABLE-READ-WIRING-1` is reviewable from exact integration `3a3dd3631d37ea5f5ab8bfffdc1318eb25f828a3`. OpenNext binding acquisition, single-use byte-stream Container RPC/exec transfer, one-row billing-state projection, fail-closed settlement, repeat/late-success suppression, and parent/child Buffer zero-fill are locally wired and verified. Production is `connected-unactivated`; the sole next blocker is `c1-production-activation-read-proof-pending`. Deploy, real production read, configuration apply, activation, Stripe/Checkout, Portal, webhook, CP2, merge, and public launch remain not-run.
- `CP1-A-C1-PRODUCTION-ACTIVATION-READ-PROOF-1` is locally reviewable from exact integration `b0fe19823e260d768749604affa57cf30d3c7329`, but its one sanitized Cloudflare metadata inspection stopped at `cloudflare-deployment-status-inspection-unavailable`. Exact deployed revision and remote binding/Container presence remain unproven; activation and production C1 read counts remain zero. Canonical detail is the external-evidence reconciliation authority.
- c1_source_procurement_base=d206ff2c07cc10aeb701d0d2034a29b17f58d42b
- c1_source_procurement_preflight_status=blocked-no-feasible-full-stack-candidate
- c1_source_procurement_candidate_envelope_count=1
- c1_source_procurement_candidate_id=node-libcurl-v5.1.2-libcurl-8.17.0-win32-x64-node-v127
- c1_source_procurement_candidate_commit=1e0bbefa8062043b34e89a7f04897304d7a7ffe7
- c1_source_procurement_candidate_tag=v5.1.2
- c1_source_procurement_tag_signature_status=unsigned-rejection-evidence-only-not-acquisition-authority
- c1_source_procurement_eligible_candidate_count=0
- c1_source_procurement_required_proof_count=7
- c1_source_procurement_proven_proof_count=0
- c1_source_procurement_pr694_repeat_audit_status=not-run
- c1_source_procurement_network_scope=official-metadata-read-only
- c1_source_procurement_transitive_source_closure_status=incomplete-no-sbom-or-license-closure
- c1_source_procurement_runtime_binding=node-v127-node22-v8-12.4-napi10-win32-x64
- c1_source_procurement_source_archive_download_status=not-run-not-approved
- c1_source_procurement_dependency_install_status=not-run-not-approved
- c1_source_procurement_guarantee_change_status=not-run-not-approved
- c1_source_procurement_residual_risk_acceptance_status=absent-not-in-this-approval
- c1_source_procurement_acquisition_procedure=future-rejection-evidence-preservation-only
- c1_source_procurement_rollback=discard-separate-evidence-worktree-retain-disconnected
- c1_source_procurement_evidence_preservation_abort_condition=revision-or-checksum-mismatch-or-new-provenance-discrepancy
- c1_source_procurement_eligibility_reject_condition=any-seven-proof-gap
- c1_source_procurement_final_blocker=missing-byte-only-api-and-full-stack-lifecycle-zeroization-attestation
- c1_source_procurement_next_approval_unit=none-no-feasible-source-acquisition
- production_constructor_compatibility_status=blocked-immutable-lifetime-unprovable
- production_wiring_status=disconnected-fail-closed
- sdk_internal_lifetime_status=dependency-blocked-unverified
- required_design_decision=consumed-process-isolation-guarantee-change
- process_isolation_preflight_status=local-synthetic-pass-adopted-as-design-candidate-only
- process_isolation_guarantee_decision=parent-child-buffer-zero-fill-and-single-use-exit-containment
- process_isolation_unverified_lifetime_status=accepted-residual-risk-ipc-v8-runtime-os-sdk-copy-erasure-teardown
- process_isolation_recommendation=adopted-design-candidate-production-wiring-still-disconnected
- process_isolation_explicit_approval_status=consumed-exact-guarantee-change
- zeroizable_client_boundary_preflight_status=local-synthetic-pass-not-adopted
- zeroizable_client_boundary_repository_contract_status=pass
- zeroizable_client_boundary_production_api_status=absent-unverified
- zeroizable_client_boundary_decision=retain-disconnected-fail-closed
- zeroizable_client_boundary_required_api=exclusive-zeroizable-byte-ownership-copy-free-construction-read-explicit-dispose-ack
- zeroizable_client_boundary_unverified_scope=node-v8-transport-os-sdk-internals
- zeroizable_client_boundary_explicit_approval_status=absent-required-for-production-api-change
- zeroizable_client_api_preflight_status=local-synthetic-pass-not-adopted
- zeroizable_client_api_repository_contract_status=pass
- zeroizable_client_api_production_candidate_status=absent-unverified
- zeroizable_client_api_decision=retain-disconnected-fail-closed
- zeroizable_client_api_required_shape=opaque-disjoint-ownership-synchronous-mutable-registry-single-read-synchronous-dispose-ack
- zeroizable_client_api_unverified_scope=node-v8-unregistered-allocation-transport-os-sdk-internals
- zeroizable_client_api_preflight_approval_status=consumed-design-synthetic-only
- zeroizable_client_api_production_adoption_approval_status=absent-required-after-full-stack-proof
- zeroizable_client_candidate_source_preflight_status=local-source-audit-pass-not-adopted
- zeroizable_client_candidate_source_inventory_status=4-classified-0-eligible-4-rejected
- zeroizable_client_candidate_source_decision=retain-disconnected-fail-closed
- zeroizable_client_candidate_source_required_proof=complete-source-review-immutable-copy-free-complete-mutable-registry-bounded-retention-synchronous-read-quiescence-synchronous-dispose-ack-complete-downstream-zeroization
- zeroizable_client_candidate_source_version_binding=supabase-js-2.106.2-undici-7.24.8-node-fetch-2.7.0-ws-8.20.1-node-v22.22.2
- zeroizable_client_candidate_source_unverified_scope=node-v8-native-transport-os-sdk-internals
- zeroizable_client_candidate_source_approval_status=consumed-feasibility-synthetic-only
- zeroizable_client_candidate_source_production_adoption_approval_status=absent-required-after-full-stack-proof
- Fixed comparison: same-process is rejected because immutable copies survive Buffer zero-fill; child-process proves bounded repository lifecycle and exit containment but not IPC/V8/runtime/OS/SDK copy erasure; zeroizable-client boundary is the recommended design direction but is not present or proven.
- Fixed recommendation: keep production wiring disconnected and preserve the current Buffer zero-fill guarantee. The synthetic zeroizable boundary proves only repository-side single-use counts, original Buffer identity, zero-fill/dispose ordering, stop/error fail-closed behavior, and repeat suppression. Adoption additionally requires a client/adapter API with exclusive mutable-byte ownership, no immutable decode/header/request/transport copy, audited internal retention, and explicit zeroization acknowledgement.
- Fixed zeroizable-client API lifecycle: repository-created disjoint Buffers -> opaque single-use ownership token -> synchronous secret-free factory with complete mutable-byte registration -> one exact-reference read transfer -> abort/stop or result -> synchronous full zero-fill dispose acknowledgement -> settlement -> in-flight/post-settlement repeat suppression.
- Fixed API proof boundary: the inert contract proves only registered repository/synthetic-client Buffers, exact original identity, bounded calls, prompt stop settlement, fallback zero-fill, and fixed sanitized results. It does not prove that Node/V8, a transport, the OS, or any SDK/client creates no unregistered mutable or immutable copy.
- Fixed API recommendation: retain `production_wiring_status=disconnected-fail-closed`. A production candidate must expose the same reviewable byte-only API, synchronously register every mutable allocation before read, forbid dynamic/unregistered allocation and immutable conversion, and acknowledge full zeroization synchronously; any incompatible layer fails the current guarantee.
- Fixed candidate-source comparison: the current SDK is rejected because its locked source is absent and its repository constructor creates immutable strings; lockfile-only alternatives are rejected because their sources are absent; Node built-in transport is rejected because reviewed JavaScript creates immutable headers and crosses buffered/native write boundaries without registration or synchronous zeroization acknowledgement; the custom byte-only boundary remains repository-only with no production transport.
- Fixed candidate-source lifecycle: repository Buffer ownership -> construction -> URL/header/auth/request serialization -> native/transport buffers -> read -> abort/stop -> read quiescence -> synchronous dispose acknowledgement -> all-downstream zeroization -> settlement. No current candidate proves this complete chain across repository, Node/V8, native transport, OS, and SDK/client.
- Next candidate audit approval status: blocked until one operator-provided candidate source is locally present and bound to an exact revision/hash.
- Exact approval required for a source-provided candidate follow-up: `承認します。C1 zeroizable-client production candidate source follow-upとして、operatorがrepository内に事前配置しexact revision/hashを提示した単一のadapter/client/transport sourceだけを対象に、production wiring、real input/constructor/readを追加しないsource-backed full-stack feasibility auditとinert/synthetic-only API compatibility preflightを開始することを承認します。source download、dependency install、network/remote operation、現行production SDK/clientの採用、秘密入力、auth/session、deploy/activation/CP2/public paid launchはこの承認に含めません。candidate source、revision/hash、Node/V8/native/OS対応sourceのいずれかが欠ける場合は実行せずproductionをdisconnected-fail-closedに維持します。`
- Exact approval required to change the guarantee: `承認します。C1 の現行保証を「runner が保持する全入力 Buffer の zero-fill」から「repository-owned parent/child Buffer の zero-fillとsingle-use child-process exit containment。IPC/V8/runtime/OS/SDK内部 copy の消去・teardownは未証明の残余リスクとして受容」へ変更し、process-isolation model をproduction wiring設計候補として採用することを承認します。production wiring、real constructor/client/read、dependency install、remote operation、deploy/activation/CP2/public paid launchはこの承認に含めません。`
- Exact approval required for a zeroizable-client API follow-up: `承認します。C1 の現行 Buffer zero-fill 保証を維持する zeroizable-client boundary 候補として、exclusive mutable-byte ownership、immutable string copy を伴わない construction/read、bounded stop/error termination、全内部 mutable byte の zero-fill と明示 dispose acknowledgement、late success/repeat suppressionを必須条件とする adapter/client API 変更の設計・synthetic implementation preflight を開始することを承認します。現行 production SDK/client の採用、production wiring、real input/constructor/read、dependency install、network/remote operation、deploy/activation/CP2/public paid launchはこの承認に含めません。`
- The exact zeroizable-client API follow-up approval above is consumed for design and synthetic implementation only. No production adoption approval exists; a later approval must bind an actual reviewed adapter/client/transport revision and its full-stack zeroization evidence.
- `CP1-A-MIG-C1` is consumed and passed: one attempt, one apply, and one committed transaction. No post-apply query, inspection, retry, remediation, rollback, or cleanup ran.
- `CP1-A-TARGET-DISCOVERY-C1-PREVIEW` is consumed with sanitized result `1 accessible / 1 active / 0 marker-qualified candidate`; no private project metadata was output or stored, no mapping was retained, and no mutation was run.
- `CP1-A-TARGET-MAP-C1-SOLE-ACTIVE` is consumed with sanitized result `1 accessible / 1 active`, mapping resolved, and execution pass. The opaque identifier is held only in trusted transient execution state; no project metadata, query, mutation, or migration apply was output or run.
- Free Azure translation route remains current; Creator/Paid routes to an OpenAI mini model first with Azure fallback only for recoverable provider errors.

- CP1-S2C adds a Windows operator-controlled local runner that captures two runtime inputs through non-echoing TTY prompts, holds them only inside one long-running Node process, exposes fixed wrapper actions for presence / sanitized status / single-use read / stop, and wipes the held buffers on termination. The read action is fail-closed without an injected adapter; local contracts use only synthetic/non-sensitive injection. No runtime input value leaves process memory, and real client initialization, adapter/service invocation, remote access, query/RPC, authentication/session work, Worker invocation, configuration changes, and deploy remain not-run / separately approval-gated.

## Account Limits / Entitlement Control

- Per-account judgment is server-owned: authenticated caller authorization binds work to the owner account, and browser-readable output must not expose owner ids, provider channel ids, provider target metadata, liveChatId, OAuth values, tokens, or billing identifiers.
- Free public beta limit authority is the Free entitlement baseline plus durable usage/session state.
- Current Free caps: 30 minutes per user per day, 30 minutes per session, 1 active session per user, 30 translated messages per minute, and 20,000 provider-input/source characters per month. Translated-output character estimates are analytics metadata only and are not monthly cap authority.
- Enforcement happens before Start, while the session is active, during status/heartbeat/feed usage checks, and before provider translation execution.
- If durable usage/session state is unavailable or unreadable, the safe behavior is fail closed with sanitized stop/status output.
- Free beta usage accounting uses a fixed UTC quota day for enforcement and ledger accounting. UI timestamp display can use local/JST preference, but quota/rate-limit reset authority stays UTC until an explicitly approved policy change.
- Paid access after C1/C2/C3 is controlled by the closed-beta server activation marker, authenticated owner-hash allowlist for Checkout/Portal, signed Stripe webhook evidence, configured private Price reference, durable paid entitlement rows, paid usage counters, signed-period reset state, and server-owned fallback/stop reasons. Missing/incomplete/stale/unconfigured state fails closed; local C2 fixtures are not live billing evidence and no monthly cadence is claimed.
- Paid entitlement fallback: missing / unreadable / incomplete / inactive -> Free / paid-inactive.

## Approval-Gated Actions

Do not perform live/external operations without same-thread ready preflight, sanitized output review, and exact explicit approval.

- C1 merge / integration verification is complete at `c4b7bc4cd03ad400c737ae662e1e94c4462e9995`; remote migration apply and production data access remain approval-gated and were not run.
- C3 merge / integration verification is complete through PR #669 at `5fc3cca2730a58f35279098ec0b2f5c804ce0076`; `CP1-A-MIG-C3` apply and post-apply structural readiness are complete, while store write/read behavior remains approval-gated.
- C2 merge / integration verification is complete through PR #670 at `4486c180f68369d6620b9f8f3df33518b7cadc38`; Stripe live action and activation remain separate approval-gated steps.
- C4 merge / integration verification is complete through PR #671 at `fa0d5582a296c2164bd3945c37cbec746315f357`; provider live execution remains separately approval-gated.
- C5 merge / integration verification is complete through PR #672 at `f3bdf0d7400b479f6934f37af402d7ec5187c7c8`; `CP1-A-MIG-C5` apply and post-apply structural readiness are complete, while store/token behavior remains separately approval-gated.
- C6 merge / integration verification is complete through PR #673 at `05104fc2d4c6730be6aae772708a10cb2b39d2d6`; `CP1-A-MIG-C6` apply and post-apply structural readiness are complete, while store/redemption/authenticated-browser behavior remains separately approval-gated.
- C7 merge / integration verification is complete through PR #674 at `0307b5542c8ac9957370533228ec02893bd48c27`; `CP1-A-MIG-C7` apply and post-apply structural readiness are complete, while token/store/browser behavior remains separately approval-gated. `CP1-A-MIG-C8` apply and post-apply structural readiness are also complete, while store/redemption/deployed authenticated-feed browser behavior remains separately approval-gated.
- C8 merge is complete at `1ec79ca222149626670ec6692c19356bc56bb2c6`; Cloudflare configuration, deploy, activation, and any live token/session operation remain separate approval-gated steps.
- C9 merge / integration verification is complete through PR #676 at `6f9c2de4c1a14b91ae094987af46e0c46c99cfeb`; remote migration apply and production persistence remain separately approval-gated.
- C10 merge / integration verification is complete through PR #677 at `c0ac7152687dc0c91470037ec164fda57d7f4259`.
- C11 merge / integration verification is complete through PR #678 at `d1ce9b0d063f65bac968c85f3242398be4b8317f`; remote migration apply and catalog/schema-only structural readiness are consumed/pass at reviewed base `6bf0db74a1774b70e1bd95dc0ece9b7b4105080e`. Production persistence, history row read/expiry, cleanup, and authenticated browser history verification remain separately approval-gated.
- C12 merge / integration verification is complete through PR #679 at `097f369a47564b7a44d211c212580f993eddc71b`; C12 head `e93bfb77dc2017fd4a15e99e075f7e419c14a94d` is contained in integration.
- CP1 local readiness is complete. Remote/deployed/billing/provider/token/cleanup/authenticated-browser operations each retain a separate approval unit; deploy, activation, CP2, promotion to `main`, and public paid launch remain out of scope / separately approval-gated.
- Out of scope: Stripe mutation.
- Out of scope: Supabase mutation.
- Out of scope: provider mutation.
- Out of scope: manual deploy.
- Also approval-gated: OAuth connect/code exchange/token persistence, provider target or liveChatId lookup, session/live-provider smoke, real `liveChatMessages.list`, Cloudflare configuration/binding/environment changes, production/custom deployed smoke, remote schema migration, Product/Price/Checkout/Portal/webhook/billing changes, public gate flip, and promotion to `main`.

## Canonical Documents

- Creator closed beta current authority: `docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md`
- Creator closed beta final QA/readiness: `docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_FINAL_QA_READINESS.md`
- Creator public paid launch readiness preflight: `docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md`
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
| C1 | Durable paid entitlement store | merged / integration verified at `c4b7bc4cd03ad400c737ae662e1e94c4462e9995` |
| C2 | Stripe live Checkout / Portal / webhook closed-beta gate | merged / integration verified at `4486c180f68369d6620b9f8f3df33518b7cadc38` |
| C3 | Paid usage and monthly reset | merged / integration verified; migration applied and structural readiness pass |
| C4 | AI natural translation provider route | merged / integration verified at `fa0d5582a296c2164bd3945c37cbec746315f357` |
| C5 | OBS overlay token runtime | merged / integration verified; migration applied and structural readiness pass |
| C6 | OBS overlay UI route | merged / integration verified; migration applied and structural readiness pass; authenticated feed QA pending / gated |
| C7 | Moderator share token runtime | merged / integration verified at `0307b5542c8ac9957370533228ec02893bd48c27` |
| C8 | Moderator share UI route | merged / integration verified at `1ec79ca222149626670ec6692c19356bc56bb2c6`; authenticated feed QA pending / gated |
| C9 | Custom dictionary minimum | merged / integration verified at `6f9c2de4c1a14b91ae094987af46e0c46c99cfeb` |
| C10 | Priority display polish | merged / integration verified at `c0ac7152687dc0c91470037ec164fda57d7f4259` |
| C11 | Simple 7-day history | merged / integration verified; migration applied and structural readiness pass |
| C12 | Creator closed beta final QA | local readiness complete; operational readiness blocked / approval-gated |

### Creator Public Paid Launch

| ID | Task | Status |
| --- | --- | --- |
| CP1 | Creator paid launch readiness | local readiness complete; external evidence blocked / approval-gated |
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
- C12 width QA at `390 / 820 / 1024 / 1280 / 1366px` is dependency-blocked because this worktree has no installed dependencies, local Next binary, or existing local server. Authenticated C6/C8/C11 rendering remains separately approval-gated.
- CP1 browser QA at `390 / 820 / 1024 / 1280 / 1366px` is planned but not run; remote store readiness, exact deployed revision, allowed-tester state, sanitized capture policy, and separate exact approval are required first.

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
