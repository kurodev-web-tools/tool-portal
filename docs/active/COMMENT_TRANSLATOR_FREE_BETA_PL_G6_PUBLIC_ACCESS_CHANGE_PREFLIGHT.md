# Kuro Live Comment Translator Free Beta PL-G6 Public Access Change Preflight

Status: promotion, main-connected production deployment, login-only runtime activation, 11/11 post-activation browser verification, Google OAuth approval, edge deferral reconciliation, and the final public release declaration are complete. Final production/main-domain smoke remains separately approval-gated. Public-release capable: no.

PL-G6C production/main-domain env readiness is confirmed by operator-provided labels, and production/main-domain private-launch-only smoke is pass by operator-provided browser evidence.

The final public release declaration is complete. The later final production/main-domain smoke remains separate and approval-gated. Translator-specific Cloudflare Rate Limiting is an optional later load-shedding control, not a Free public beta release prerequisite.

Repository runtime support for the approved login-only policy is active through the separately approved production Worker deployment. The private-launch SHA-256 owner allowlist remains the compatibility path for existing allowed testers. The final public release declaration does not change this binding.

This document is the reconciled readiness, declaration, and approval surface after PL-G5, completed promotion, login-only activation, post-activation verification, and the final public release declaration. It identifies the remaining final-smoke approval boundary. It is not approval to mutate Cloudflare, deploy/upload, run final production smoke, or mark public capability complete.

## Preflight Labels

| Item | Status |
| --- | --- |
| `pl_g6_public_access_change_preflight_status` | `complete` |
| `pl_g6_public_access_change_preflight_doc` | `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md` |
| `pl_g6_public_access_change_status` | `declared-free-public-beta` |
| `public_release_capable` | `no` |
| `public_gate_flip_status` | `complete-release-declaration-no-mutation` |
| `deploy_upload_status` | `complete-main-connected-and-activation-deployments` |
| `deploy_upload_evidence_source` | `operator-provided` |
| `preview_deployment_target` | `cloudflare-preview-domain` |
| `preview_deployment_status` | `deployed-operator-provided` |
| `production_env_apply_status` | `applied-login-only-runtime` |
| `production_main_domain_smoke_status` | `pass-post-activation-browser-11-of-11` |
| `pl_g6c_production_main_domain_env_readiness_status` | `complete` |
| `pl_g6c_production_env_operator_action_status` | `complete-for-login-only-activation` |
| `pl_g6c_production_env_apply_readiness_confirmation_approval_status` | `present` |
| `pl_g6c_production_env_apply_readiness_confirmation_status` | `recorded-no-mutation` |
| `pl_g6c_production_smoke_approval_status` | `present` |
| `operator_start_to_translation_smoke_status` | `pass-production-main-domain-private-launch` |
| `live_provider_execution_status` | `pass-operator-provided-private-launch-smoke` |
| `main_promotion_status` | `complete-pr-640-merged-main-contained` |
| `main_connected_deployment_status` | `pass` |
| `main_connected_workers_build_status` | `success` |
| `main_connected_workers_build_evidence_source` | `github-check-run-cloudflare-workers-and-pages` |
| `release_owner_decision_status` | `accepted-promotion-readiness-only` |
| `release_owner_exact_approval_status` | `present-promotion-readiness-only` |
| `release_owner_missing_approval_scope` | `promotion-operation-and-post-deploy-verification` |
| `operator_remaining_external_verification_status` | `action-required-final-smoke` |
| `operator_production_harness_block_status` | `pass-production-404` |
| `operator_production_api_managed_challenge_status` | `not-selected` |
| `google_auth_verification_status` | `approved` |
| `unverified_app_warning_status` | `not-observed-after-fresh-reconnect` |
| `oauth_reconnect_verification_status` | `pass` |
| `final_public_gate_target` | `free-public-beta-release-declaration` |
| `final_public_gate_mutation_target` | `none` |
| `final_public_release_declaration_approval_status` | `present-in-thread` |
| `final_public_release_declaration_preflight_status` | `pass` |
| `final_public_release_declaration_status` | `complete` |
| `final_public_release_declaration_evidence_source` | `operator-confirmed-main-build-active-deployment-and-read-only-harness` |
| `final_production_smoke_status` | `not-run-approval-gated` |
| `login_only_runtime_binding_action` | `unchanged` |
| `edge_protection_operation_boundary` | `optional-control-deferred-no-activation-required-for-free-beta` |
| `edge_rate_limiting_disposition` | `deferred-existing-free-slot-reserved-for-leaked-credential-protection` |
| `cloudflare_free_rate_limiting_slot_status` | `occupied-leaked-credential-protection` |
| `app_enforcement_authority` | `durable-quotas-session-caps-rate-guards` |
| `edge_activation_status` | `deferred-not-required-for-free-public-beta` |
| `edge_protection_readiness_status` | `pass-with-optional-edge-control-deferred` |
| `optional_limit_proof_disposition` | `accepted-deterministic-evidence` |
| `post_activation_browser_verification_status` | `pass-11-of-11` |
| `post_activation_browser_failure_count` | `0` |
| `production_main_domain_health_status` | `pass` |
| `unauthenticated_access_status` | `pass-blocked` |
| `auth_unavailable_access_status` | `pass-fail-closed` |
| `authenticated_free_access_status` | `pass-allowed` |
| `existing_allowed_tester_parity_status` | `pass` |
| `preview_rate_limit_override_boundary_status` | `pass-tester-only` |
| `privileged_boundaries_status` | `pass-unchanged` |
| `youtube_connect_no_autostart_status` | `pass` |
| `production_route_api_harness_status` | `pass-404` |
| `browser_output_sanitization_status` | `pass` |
| `public_beta_access_gate_selected` | `login-only` |
| `public_beta_waitlist_boundary` | `creator-paid-beta-only` |
| `login_only_runtime_implementation_status` | `activated-login-only` |
| `login_only_runtime_default` | `login-only-with-private-tester-parity` |
| `login_only_runtime_activation_status` | `complete-production-worker-deployment` |
| `login_only_runtime_activation_target` | `cloudflare-production-worker-runtime` |
| `login_only_runtime_activation_preflight_status` | `pass` |
| `login_only_runtime_activation_approval_status` | `present-separate-production-deployment` |
| `login_only_runtime_activation_apply_status` | `complete` |
| `preview_rate_limit_smoke_tester_boundary` | `private-launch-allowlisted-tester-only` |
| `public_traffic_rate_limit_backing_selected` | `cloudflare-edge` |
| `pl_g6_first_operational_target` | `production-route-api-harness-block-removal` |
| `pl_g6_first_operational_target_status` | `complete-repository-side-not-deployed` |
| `pl_g6_first_operational_target_approval_status` | `approved-in-thread` |
| `pl_g6a_repository_route_api_harness_block_status` | `complete` |
| `pl_g6a_repository_route_api_harness_block_evidence` | `production-deployment-env-guard` |
| `support_response_status` | `pending` |
| `risk_acceptance_scope` | `future-public-object-default-privileges-only` |
| `new_public_db_object_review_status` | `required-before-work` |
| `post_pr_637_runtime_status` | `activated-login-only` |
| `integration_to_main_promotion_readiness_status` | `complete-promoted` |
| `main_connected_deployment_activation_state` | `login-only-active` |
| `post_deploy_private_default_verification_status` | `pass-before-activation` |

## Post-Activation Reconciliation

The reviewed PR #640 merge is contained in `origin/main`, the main-connected production deployment completed, and login-only runtime activation was applied through its separately approved production Worker deployment. The later browser verification completed with 11/11 pass and zero failures.

Verified behavior is limited to sanitized labels: main-domain health passed; unauthenticated and auth-unavailable access remained blocked/fail-closed; authenticated Free access passed; existing allowed-tester parity passed; the preview override remained tester-only; Creator/paid waitlist, billing, admin, and privileged boundaries remained unchanged; YouTube connection alone did not start polling, translation, persistence use, or quota consumption; the production route/API harness returned 404; and browser-visible output remained sanitized.

No public release declaration, edge-rule mutation, Google Auth publishing, final production smoke, Start, provider/live execution, target lookup, Supabase action, Stripe action, paid/Creator runtime, or OBS runtime is implied by those completed operations. Historical activation and promotion instructions below remain an audit trail and are not current next actions.

## Required Same-Thread Approval Surface

The final public release declaration received exact same-thread approval naming the declaration target, prerequisites, evidence shape, and non-actions. Its declaration preflight passed.

The exact paste-ready approval text is recorded under `Final Public Gate Definition`. It did not approve edge activation, deployment, final smoke, or any already completed operation to be rerun. Keep `public_release_capable=no` until the separately approved final production/main-domain smoke passes.

## Final Public Release Declaration 2026-07-16

The release owner approved `final_public_gate_target=free-public-beta-release-declaration` in this thread. The declaration preflight recorded `main_connected_workers_build_status=success`, `active_deployment_matches_latest_successful_main_build=yes`, and a same-process read-only production route/API harness result of HTTP 404. Production API Managed Challenge was not observed in that request path, and the recorded production API Managed Challenge selection remains `not-selected`.

Declaration result:

- `final_public_release_declaration_approval_status=present-in-thread`;
- `final_public_release_declaration_preflight_status=pass`;
- `final_public_release_declaration_status=complete`;
- `pl_g6_public_access_change_status=declared-free-public-beta`;
- `public_gate_flip_status=complete-release-declaration-no-mutation`;
- `final_public_gate_mutation_target=none`;
- `login_only_runtime_binding_action=unchanged`;
- `operator_remaining_external_verification_status=action-required-final-smoke`;
- `final_production_smoke_status=not-run-approval-gated`;
- `public_release_capable=no`.

The declaration created no Cloudflare rule, binding, environment, secret, version, deployment, database, billing, OAuth, provider/live, paid/Creator, admin, or OBS mutation. Evidence remains labels/counts/pass-fail/status only. The only current unrun release operation in this chain is the final production/main-domain smoke.

## Completed Login-Only Runtime Activation And Later Final Public Release Declaration

The separately approved production Worker activation is complete. It changed Free runtime eligibility for authenticated users without approving a final public release declaration or any adjacent Cloudflare, provider, database, billing, paid/Creator, or OBS operation.

Before that completed operation, the operator had to confirm these sanitized preflight labels:

- target environment is exactly `cloudflare-production-worker-runtime`;
- fetched integration revision contains the reviewed login-only runtime merge;
- worktree and branch match the reviewed activation slice;
- current runtime state is `private-launch-default` before apply;
- production route/API harness is blocked;
- required production auth, session, provider, Turnstile, site URL, and edge-control references are present by label only;
- public traffic edge protection is configured or the operation stops blocked;
- activation input is exact and server-owned without printing or persisting its value;
- evidence output is restricted to labels/counts/pass-fail/status only.

Historical approval text for the completed login-only runtime activation only:

> I approve the login-only runtime activation environment apply for the Kuro Stream Kit / Comment Translator Free public beta integration line in the Cloudflare production Worker environment only. Run the apply only after same-process sanitized preflight passes. Keep evidence to labels/counts/pass-fail/status only. Do not expose or persist activation values, secrets, tokens, cookies, Authorization headers, browser storage, raw responses, raw comments, owner/internal ids, hashes, provider metadata, liveChatId, Cloudflare ids, support ids, raw SQL, or raw provider payloads. Do not run deploy/upload, Cloudflare edge-rule mutation, public gate flip, production browser smoke, live/provider execution, OAuth live flow, Google target lookup, Supabase query/mutation/migration, Stripe action, paid/Creator runtime, OBS runtime, Google Auth publishing, main promotion, or any operation outside this named target.

After an approved activation, verification remains a separate operation unless the same-thread approval names the production browser smoke and any required live/OAuth/provider boundaries. Required sanitized checks are: unauthenticated and auth-unavailable blocked; authenticated Free user allowed; existing allowed tester allowed; preview 5/min override tester-only; Creator/paid waitlist, billing, admin, and privileged surfaces unchanged; YouTube connection alone produces no polling, translation, or quota use; browser output sanitized.

The later public gate flip is a separate release declaration and must not be inferred from login-only activation approval. It is not a second Worker binding mutation. Paste-ready approval for that later declaration:

> I approve the PL-G6 final public release declaration for the Kuro Stream Kit / Comment Translator Free public beta integration line only after the separately approved login-only runtime activation and required post-activation checks are recorded pass, Google OAuth verification is approved, production edge protection readiness is confirmed, the production route/API harness remains blocked with HTTP 404, and the required same-process sanitized preflight passes. Keep the existing login-only runtime binding unchanged. This declaration does not approve a Worker binding change, Cloudflare mutation, deploy/upload, or final production smoke. Keep evidence to labels/counts/pass-fail/status only and keep public_release_capable=no until the separately approved final production/main-domain smoke passes.

Historical blocked attempt, superseded by the later separately approved activation deployment: same-process local preflight passed, but that narrower attempt stopped before remote mutation because deploy/upload was not approved. Sanitized result: `activation_apply_status=blocked-deploy-upload-not-approved`, `remote_mutation_count=0`, `deploy_upload_count=0`, `public_gate_flip_count=0`.

## Final Public Gate Definition

The final public gate does not create, remove, or change a Worker binding.

`COMMENT_TRANSLATOR_FREE_BETA_RUNTIME_ACCESS` remains unchanged at the separately activated login-only runtime policy. The private-launch allowlist remains the compatibility path for existing allowed testers and is not a second public-release switch.

Cloudflare production edge protection activation or confirmation remains a separate approval-gated operation when required. Cloudflare edge protection is a traffic-control prerequisite, not the final release declaration itself. Production API Managed Challenge remains `not-selected` unless an explicit emergency exception is approved.

The final public gate is a release declaration after the separately approved login-only activation and required post-activation checks are recorded pass, Google OAuth verification is approved, production edge protection is confirmed ready, and the production route/API harness remains blocked with HTTP 404. Google OAuth verification is approved, production edge readiness passes, the active deployment matches the latest successful main build, and the same-process production route/API harness recheck returned HTTP 404. The final release declaration is complete.

Final production/main-domain smoke remains a later separate approval-gated task after the release declaration. The declaration alone keeps `public_release_capable` at `no`; that status can change only after the separately approved final smoke passes and no stop condition is observed.

## Completed Integration-To-Main Promotion Sequence

This sequence is retained as a historical audit trail. All promotion, main-connected deployment, private-default verification, login-only activation, and final release declaration steps below are complete; only final production/main-domain smoke remains later and separate.

The operational order is fixed:

1. merge the integration branch to `main` through a separate promotion PR;
2. allow the main-connected automatic production deployment with login-only activation unset;
3. separately verify that the main domain remains healthy and private-allowlist by default;
4. only afterward consider a separate production deployment that activates login-only runtime access;
5. keep the public gate flip as a still-later separate operation.

Paste-ready promotion approval:

> I approve creating and merging the integration-to-main promotion PR for the reviewed Kuro Stream Kit / Comment Translator Free public beta integration tip, and I approve the resulting main-connected automatic production deployment only. Keep the login-only activation control unset, retain the private-launch allowlist as the production default, keep public_release_capable=no, and do not flip the public gate. Keep evidence to labels/counts/pass-fail/status only. Do not expose or persist secrets, tokens, cookies, Authorization headers, browser storage, raw responses, raw comments, owner/internal ids, hashes, activation values, provider metadata, liveChatId, Cloudflare ids, support ids, raw SQL, or raw provider payloads. Do not run environment apply, login-only activation, public gate flip, production browser smoke, live/provider execution, OAuth live flow, Google target lookup, Supabase query/mutation/migration, Stripe action, paid/Creator runtime, OBS runtime, Google Auth publishing, or branch deletion.

Paste-ready post-deploy private-default verification approval:

> I approve post-deploy private-default production verification for the main-connected deployment only. Confirm the main domain is healthy, unauthorized access remains blocked by the private allowlist, the production route/API harness returns 404, and browser-visible output remains sanitized. Record labels/counts/pass-fail/status only. Do not expose or persist secrets, tokens, cookies, Authorization headers, browser storage, raw responses, raw comments, owner/internal ids, hashes, activation values, provider metadata, liveChatId, Cloudflare ids, support ids, raw SQL, or raw provider payloads. Do not run environment apply, login-only activation, public gate flip, live/provider execution, OAuth live flow, Google target lookup, Supabase query/mutation/migration, Stripe action, paid/Creator runtime, OBS runtime, Google Auth publishing, or branch deletion.

Approval for the promotion does not approve the post-deploy verification. Approval for the verification does not approve login-only activation. Login-only activation does not approve the later public gate flip.

## Completed First Operational Target

This section records the historical first target and is not a current next action.

The smallest safe first PL-G6 operational target is `production-route-api-harness-block-removal`.

Reason:

- local source inspection confirms the route/API harness file still exists at `app/api/comment-translator/free-beta/route-api-harness/route.ts`;
- production route/API harness exposure is already labeled `action-required-before-production`;
- blocking or removing that harness exposure is narrower than public gate flip, deploy/upload, Cloudflare edge activation, production smoke, or main promotion;
- this target does not approve public access, provider execution, OAuth, Google target lookup, Supabase work, Stripe live action, paid entitlement runtime, OBS overlay runtime, or support follow-up.

Do not start with public gate flip, production/main deploy/upload, production env apply, production/main-domain smoke, live/provider execution, OAuth live flow, Google target lookup, or Supabase support/database work. Those are separate approval-required operations and remain not-run.

PL-G6A repository-side block status: complete.

The route now returns `blocked-production-route-api-harness` with HTTP 404 when the production deployment label is present.

This does not prove deployed production behavior until a later approved deploy/upload and production confirmation.

PL-G6B preview deploy evidence status: recorded.

Operator-provided sanitized evidence states that PR #628 is merged and Cloudflare preview domain deployment is complete. This records preview deploy/upload as `complete-auto-preview-after-merge` only; it is not production/main-domain smoke, production env apply, public gate flip, public access change, or main promotion evidence.

## Completed PL-G6C Production/Main-Domain Env Readiness And Smoke Gate

This section is retained as the historical readiness and private-launch smoke approval trail. Its env-readiness, private-default smoke, and later login-only activation steps are complete.

PL-G6C prepares the next approval gate only. It does not apply production environment variables, mutate Cloudflare, deploy/upload, smoke the production/main domain, run live/provider flows, or change public access.

Smallest safe next action: request exact approval for production env apply readiness confirmation only, or ask the operator to add/confirm the listed labels in Cloudflare without exposing values. If operator-side values must be added, do not paste them in chat, docs, PR bodies, shell output, or screenshots.

### Sanitized Operator Instructions

| Variable name or label | Target environment label | Required / optional / smoke-only | Where the operator should add or confirm it |
| --- | --- | --- | --- |
| `COMMENT_TRANSLATOR_EDGE_RATE_LIMITING` | Cloudflare production Worker runtime | required-for-public-traffic-control-reference | Cloudflare dashboard production variables/secrets for the Worker service |
| `NEXT_PUBLIC_SITE_URL` | Cloudflare production Worker runtime | required-main-domain-url-reference | Cloudflare dashboard production variables/secrets for the Worker service |
| Supabase public auth variables | Cloudflare production Worker runtime | required-auth-runtime-reference | Cloudflare dashboard production variables/secrets for the Worker service |
| Supabase service role secret | Cloudflare production Worker runtime | required-server-only-status-session-reference | Cloudflare dashboard production secrets for the Worker service |
| YouTube credential resolution controls | Cloudflare production Worker runtime | required-reconnect-and-token-resolution-reference | Cloudflare dashboard production variables/secrets for the Worker service |
| Azure Translator provider references | Cloudflare production Worker runtime | required-free-translation-provider-reference | Cloudflare dashboard production variables/secrets for the Worker service |
| Turnstile public/secret references | Cloudflare production Worker runtime | required-login-abuse-control-reference | Cloudflare dashboard production variables/secrets for the Worker service |
| Stripe and paid entitlement references | Cloudflare production Worker runtime | optional-not-required-for-free-public-beta-smoke | Cloudflare dashboard production variables/secrets for the Worker service |
| live/provider smoke fixture references | operator-local smoke environment only | smoke-only-explicit-approval-required | operator-local shell or approved smoke runner environment |

Do not ask the user to paste values in chat. The operator should add or confirm the labels in the Cloudflare dashboard for the production Worker environment and report only presence labels.

### Exact Approval Text Needed

For production env apply readiness confirmation only:

> I approve PL-G6C production/main-domain env apply readiness confirmation for the Free public beta integration line only. Keep evidence sanitized to labels/counts/pass-fail/status only. Do not expose secrets, tokens, cookies, Authorization headers, browser storage, raw responses, raw comments, owner/internal ids, provider target metadata, liveChatId, Cloudflare token/zone/account/rule ids, support ticket ids, raw SQL output, or raw provider payloads. Do not run production/main-domain smoke, live/provider execution, OAuth live flow, Google target lookup, Supabase query/mutation/migration, Stripe live action, paid entitlement runtime, OBS overlay route/token runtime, public gate flip, public access change, deploy/upload, or main promotion.

PL-G6C env apply readiness confirmation approval is present for readiness confirmation only.

This confirmation records operator-action instructions and approval status only; it does not apply production env vars or confirm values.

For production/main-domain smoke after production env readiness is confirmed:

> I approve PL-G6C production/main-domain smoke for the Free public beta integration line only after production env apply readiness is confirmed. Keep evidence sanitized to route labels, width labels, pass/fail/count/status, stop reasons, and unavailable reasons only. Do not expose secrets, tokens, cookies, Authorization headers, browser storage, raw responses, raw comments, owner/internal ids, provider target metadata, liveChatId, Cloudflare token/zone/account/rule ids, support ticket ids, raw SQL output, or raw provider payloads. Do not run live/provider execution, OAuth live flow, Google target lookup, Supabase query/mutation/migration, Stripe live action, paid entitlement runtime, OBS overlay route/token runtime, public gate flip, public access change, deploy/upload, or main promotion.

PL-G6C production/main-domain private-launch smoke approval is present in-thread for the deployed Free public beta integration line. The approval allows the allowed-tester browser flow, YouTube OAuth live flow if needed, Google target lookup, bounded live/provider execution, Azure translation execution, and sanitized usage/status verification only. It does not approve Supabase query/mutation/migration, Stripe live action, paid entitlement runtime, OBS overlay route/token runtime, public gate flip, public access change, or main promotion.

### Production/Main-Domain Private-Launch Smoke Evidence

Sanitized evidence source: operator-provided browser screenshots and Codex route-status checks. Evidence is recorded as labels/counts/pass-fail/status only; raw comments, raw responses, provider target metadata, live target values, browser storage, tokens, cookies, and private ids are not recorded.

| Check | Sanitized result |
| --- | --- |
| `production_main_domain_page_status` | `pass-200-after-redirect` for tool, account integrations, admin, Comment Translator admin, and Creator waitlist admin routes |
| `production_route_api_harness_status` | `pass-blocked-404` |
| `private_launch_boundary_status` | `pass-allowed-tester-only-assumption` |
| `youtube_connection_status` | `pass-available` |
| `target_broadcast_status` | `pass-ready` |
| `free_plan_status` | `pass-available` |
| `pre_start_session_status` | `pass-not-active-no-usage` |
| `start_session_status` | `pass-running` |
| `usage_timer_status` | `pass-session-and-day-timers-decrement` |
| `live_comment_fetch_status` | `pass-count-1` |
| `azure_translation_status` | `pass-translated-count-1` |
| `per_minute_usage_status` | `pass-count-1-of-30` |
| `monthly_input_usage_status` | `pass-increment-observed` |
| `stop_status` | `pass-user-stop` |
| `stopped_preview_retention_status` | `pass-count-1` |
| `preview_clear_status` | `pass` |
| `restart_status` | `pass-session-and-day-timers-decrement` |
| `target_language_selection_status` | `pass-operator-provided-private-launch-browser` |
| `short_reaction_filter_status` | `pass-operator-provided-private-launch-browser` |
| `unauthorized_admin_visibility_status` | `pass-hidden-for-non-admin-account` |
| `unauthorized_translator_access_status` | `pass-blocked-for-non-allowed-account` |
| `transient_unavailable_reason_observed` | `live-provider-polling-not-approved` before translated comment evidence; final Start-to-translation evidence is pass |
| `codex_computer_use_browser_smoke_status` | `inconclusive-stale-browser-state` |

## Execution Boundary

The repository implementation separates Free runtime authority from preview-smoke tester eligibility. Exact login-only activation allows authenticated Free users through the normal tool, integrations/OAuth, credential, disconnect, session, feed, and retention path. Billing mutations, Creator/paid waitlist, admin authorization, and the route/API harness retain their existing privileged gates. The fixed preview 5 translated-messages/min override still requires its exact marker, the Cloudflare preview channel, and private-launch allowlisted tester eligibility.

YouTube connection remains readiness-only. It does not start monitoring, polling, translation, persistence usage, or quota consumption; Start remains the first provider-affecting action.

Cloudflare route-class and traffic-growth operation guidance remains centralized in `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md`.

Allowed after future exact approval only:

- public access policy change for the selected `login-only` Free public beta boundary;
- later Translator-specific Cloudflare edge rate-limit activation or route-class protection change only after separate approval and when traffic or revenue justifies it;
- production/main deploy/upload for the approved target;
- production env apply for the approved target;
- public gate flip for the approved target;
- integration-to-main promotion;
- final production/main-domain smoke with sanitized labels/counts/pass-fail/status only.

Still separate unless explicitly named in the same approval:

- live/provider execution;
- OAuth live flow;
- Google target lookup;
- Supabase query, mutation, or migration;
- Stripe live action;
- paid entitlement runtime;
- OBS overlay route/token runtime;
- support follow-up.

Do not run Cloudflare mutation, production/main deploy/upload, production env apply, public gate flip, production/main-domain smoke, live/provider execution, OAuth live flow, Google target lookup, Supabase query/mutation/migration, Stripe live action, paid entitlement runtime, OBS overlay route/token runtime, or main promotion from this preflight slice.

## Public Capability Result

Public capability can remain `no` through this preflight. The preflight result is:

- PR #640 promotion and main-connected production deployment complete;
- main-connected Workers Build completed successfully;
- separately approved login-only production Worker activation complete;
- post-activation production browser verification passed 11/11 with zero failures;
- Google OAuth verification is approved, the unverified-app warning was not observed after a fresh reconnect, and reconnect verification passed;
- Translator-specific Cloudflare Rate Limiting is deferred because the available Free rule slot remains reserved for leaked-credential protection;
- app-side durable quotas, session caps, and rate guards remain the enforcement authority;
- production edge readiness passes with the optional edge control deferred;
- production route/API harness remains verified as 404 and must be rechecked in the final-declaration preflight;
- final public release declaration complete with no mutation target;
- final production/main-domain smoke remains later and separately approval-gated;
- `public_release_capable=no`.

## Operator Checks Still Required

The release owner closed the declaration surfaces: same-thread approval was present, the active deployment matched the latest successful main build, the production route/API harness returned HTTP 404 in the declaration preflight, and production API Managed Challenge remained `not-selected`.

Start-to-translation evidence and deterministic burst, 30-minute session, and monthly 20,000 provider-input-character proof are already accepted. Final production/main-domain smoke is the only remaining release-chain operation and remains separately approval-gated.

No new `public` database object work may proceed without explicit object-level grant/RLS/default-privileges review.

## Sanitized Evidence Shape

Allowed evidence fields:

- command label;
- doc path;
- safe branch label;
- public gate state label;
- public-release capable label;
- approval status label;
- route class label;
- count;
- pass/fail;
- status label;
- stop reason;
- unavailable reason.

Evidence stays labels/counts/pass-fail/status only.

Forbidden output/storage:

- secret/token/OAuth values;
- cookie values;
- Authorization header values;
- Cloudflare token, account, zone, or rule values;
- support ticket values;
- private owner role values;
- owner/internal user values;
- provider channel values;
- credential reference values;
- provider target metadata;
- live target values;
- liveChatId;
- raw provider payloads;
- raw comments;
- server-only cursor values;
- browser storage payloads;
- raw action payloads;
- Stripe secret/billing identifiers;
- raw SQL output;
- handoff payload expansion.

## Non-Actions

This preflight slice did not run or implement:

- Cloudflare mutation;
- manual deploy/upload by Codex;
- production/main deploy/upload;
- production env apply;
- public gate flip;
- public access change;
- production/main-domain smoke;
- live/provider execution;
- OAuth live flow;
- Google target lookup;
- Supabase query/mutation/migration;
- support follow-up;
- Stripe live action;
- paid entitlement runtime;
- OBS overlay route/token runtime;
- main promotion.

## Completion Verification

Required local closeout checks for this docs/contract preflight slice:

- `node scripts/comment-translator-free-beta-pl-g6-public-access-change-preflight-contract.mjs`
- `node scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs`
- `node scripts/comment-translator-public-launch-remaining-task-board-contract.mjs`
- `node scripts/comment-translator-public-launch-operator-qa-checklist-contract.mjs`
- `node scripts/comment-translator-public-traffic-rate-limit-backing-contract.mjs`
- `node scripts/comment-translator-cloudflare-custom-rule-operations-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `git diff --check`
- changed-files high-confidence no-secret scan
- changed TS/TSX type-suppression scan

UI/browser width QA is skipped because this slice changes only docs, deterministic contracts, and `task.md`. There is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or client behavior change.
