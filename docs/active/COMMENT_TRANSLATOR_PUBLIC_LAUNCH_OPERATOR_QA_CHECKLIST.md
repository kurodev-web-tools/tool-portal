# Comment Translator Public Launch Operator QA Checklist

Status: active public-launch verification split. Public-release capable: no.

This checklist separates operator-owned external checks from Codex-owned local deterministic checks before PL-G5 and PL-G6. It does not approve Cloudflare changes, deploy/upload, public gate flip, live/provider execution, OAuth live flow, Google target lookup, remote Supabase mutation, Stripe live action, or main promotion.

Sanitization boundary: record only labels, route paths, pass/fail, counts, stop reasons, and safe deployment references. Do not record secrets, tokens, cookies, Authorization headers, Cloudflare token or zone values, browser storage payloads, owner/internal ids, provider target metadata, provider private identifiers, liveChatId, raw provider payloads, raw comments, support ticket ids, private owner role values, or raw SQL output.

## Current Decision Labels

| Item | Status |
| --- | --- |
| `public_release_capable_status` | `no` |
| `public_beta_access_gate_selected` | `login-only` |
| `public_beta_waitlist_boundary` | `creator-paid-beta-only` |
| `public_traffic_rate_limit_backing_selected` | `cloudflare-edge` |
| `edge_activation_status` | `not-run-approval-gated` |
| `operator_external_verification_status` | `partial-pass-preview-browser` |
| `operator_remaining_external_verification_status` | `action-required` |
| `operator_cloudflare_preview_custom_rule_status` | `configured-preview-only-managed-challenge` |
| `operator_cloudflare_env_reference_status` | `present-enabled-label` |
| `operator_free_beta_login_browser_smoke_status` | `pass-preview-browser` |
| `operator_waitlist_boundary_browser_smoke_status` | `pass-preview-browser` |
| `operator_youtube_connect_no_autostart_smoke_status` | `pass-preview-browser` |
| `operator_production_api_managed_challenge_status` | `not-selected` |
| `operator_production_harness_block_status` | `action-required-before-production` |
| `cloudflare_custom_rule_operations_doc_status` | `complete` |
| `cloudflare_custom_rule_operations_doc` | `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md` |
| `api_protection_preference_order` | `app-quotas-session-caps-rate-guards-then-cloudflare-rate-limiting-then-managed-challenge-emergency-or-html-only` |
| `supabase_future_default_privileges_risk` | `accepted-for-pl-g5-evaluation` |
| `public_gate_flip_status` | `not-run` |
| `deploy_upload_status` | `not-run` |
| `live_provider_execution_status` | `not-run-approval-gated` |

## Operator Update 2026-07-09

The release operator reported the following external checks with sanitized evidence only. This update records preview/browser confidence, not production edge activation or public release capability.

| Check | Sanitized status |
| --- | --- |
| `operator_cloudflare_preview_custom_rule_status` | `configured-preview-only-managed-challenge` |
| `operator_cloudflare_preview_rule_scope` | `preview-host-translator-integrations-comment-translator-api-route-classes` |
| `operator_cloudflare_env_reference_status` | `present-enabled-label` |
| `operator_free_beta_login_browser_smoke_status` | `pass-preview-browser` |
| `operator_waitlist_boundary_browser_smoke_status` | `pass-preview-browser` |
| `operator_youtube_connect_no_autostart_smoke_status` | `pass-preview-browser` |
| `operator_production_api_managed_challenge_status` | `not-selected` |
| `operator_production_harness_block_status` | `action-required-before-production` |

`COMMENT_TRANSLATOR_EDGE_RATE_LIMITING` is treated as a safe control reference label for the Cloudflare-backed policy. The current app/runtime contracts do not parse its value as a behavior flag, so the operator-provided `enabled` presence label is sufficient for this checklist.

The preview Managed Challenge rule may include `/api/comment-translator/` only as a preview-specific verification measure because the operator confirmed the current browser flow still works. Production should not use API Managed Challenge as the default API protection; prefer a production harness block plus API rate limiting / app-side limits for API traffic, and keep Managed Challenge as an emergency or HTML-route-only control.

Operational guidance for Free public launch, Creator/Paid transition, traffic-growth response, and API-vs-HTML boundaries is centralized in `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md`.

## User-Owned External Checks

These checks require browser access, Cloudflare dashboard/account access, or approved live/provider operation. They should not be run by Codex without same-thread approval and a ready preflight.

| Check | Owner | When | Evidence to record |
| --- | --- | --- | --- |
| `operator_cloudflare_edge_rate_limit_activation_status` | Release operator | Before PL-G6 public exposure | `not-run`, `configured`, or `blocked`; protected route classes; pass/fail/count only |
| `operator_cloudflare_env_reference_status` | Release operator | With edge activation | whether `COMMENT_TRANSLATOR_EDGE_RATE_LIMITING` is present for the intended environment; no value |
| `operator_free_beta_login_browser_smoke_status` | Release operator | After approved access gate change or preview smoke | signed-in Free user can reach `/tools/comment-translator`; unauthenticated user is not granted tool use |
| `operator_waitlist_boundary_browser_smoke_status` | Release operator | With login smoke | Free public beta is login-only; waitlist remains Creator/paid-only |
| `operator_youtube_connect_no_autostart_smoke_status` | Release operator | When live OAuth browser smoke is approved | connecting YouTube does not start monitoring, polling, translation, or quota use |
| `operator_start_to_translation_smoke_status` | Release operator | Only after approved live/provider smoke | Start, bounded polling, translation, feed display, usage, and Stop pass with sanitized counts only |
| `operator_burst_comment_smoke_status` | Release operator | Optional late smoke after contracts pass | 30 translated messages/min behavior observed with pass/fail/count only |
| `operator_session_30_min_smoke_status` | Release operator | Optional late smoke after fake-clock contract | session stops or refuses continuation with sanitized `session-time-limit` state |
| `operator_monthly_20000_character_limit_smoke_status` | Release operator | Prefer fixture; live smoke only with explicit approval | fixture proves 19,999 / 20,000 / over-limit states; do not burn real quota by default |

### Cloudflare Edge Rate-Limit Check

Minimum operator check:

1. Confirm the selected public backing remains `cloudflare-edge`.
2. Confirm edge rate limiting protects the translator public route/action classes before broad public traffic reaches the app.
3. Confirm `COMMENT_TRANSLATOR_EDGE_RATE_LIMITING` is present as a safe control reference in the intended Cloudflare environment if the deployment path uses it.
4. Run only a small synthetic burst against an approved preview or production target after approval.
5. Confirm production API Managed Challenge remains `not-selected` unless a temporary emergency exception is explicitly recorded.
6. Confirm production route/API harness exposure is blocked or removed before production traffic.
7. Record only status labels, route class labels, blocked/allowed counts, and pass/fail.

Do not record Cloudflare API tokens, account ids, zone ids, rule ids unless they are intentionally safe public references, raw request IPs, headers, cookies, or request bodies.

Preferred API protection order is app-side durable quotas/session caps/rate guards, Cloudflare Rate Limiting Rules for load shedding when available, targeted blocks for known abusive route classes, and Managed Challenge only for HTML routes or temporary emergency response.

### Browser Smoke Check

Minimum operator browser check:

1. Unauthenticated visitor reaches a safe sign-in or unavailable state, not active tool use.
2. Logged-in Free beta user can reach the normal Comment Translator UI after the approved public access change.
3. Waitlist approval is not required for Free public beta, and waitlist remains Creator/paid-only.
4. `/account/integrations` shows YouTube connection/reconnect/disconnect state without token, owner, provider target, or live target values.
5. YouTube connection alone does not start monitoring, polling, translation, or quota use.
6. Pressing Start is the first provider-affecting user action.
7. Stop works and evidence remains sanitized.

Do not export browser storage or save screenshots containing raw comments unless a later task explicitly scopes sanitized visual evidence.

### Limit Behavior Checks

The limit checks should be ordered from deterministic to live:

1. Contract/fixture first.
2. Preview/staging synthetic check second.
3. Live YouTube smoke last, only if the release owner still wants real-world proof.

For `30 translated messages/min`, do not start with one person manually typing 30 comments into production. Use a synthetic or approved preview smoke first. If a live YouTube smoke is later approved, keep it short, use safe test comments, stop immediately after the cap behavior is observed, and record only count/status/stop labels.

For `30 min/session`, fake-clock or server-fixture coverage is the primary proof. A real 30-minute browser smoke is useful only as a final confidence check because it is slow and can be invalidated by connection or stream noise.

For `20,000 provider-input characters/month`, do not consume real monthly quota just to prove the cap. Use fixture states around 19,999 / 20,000 / over-limit first. Live cap proof should require a dedicated test account/month and explicit approval.

## Codex-Owned Local Checks

Codex can complete these without external mutation or live/provider execution:

| Check | Status |
| --- | --- |
| `codex_operator_qa_checklist_contract_status` | `complete-in-this-slice` |
| `codex_public_traffic_rate_limit_contract_status` | `covered-by-existing-contracts` |
| `codex_session_30_min_contract_status` | `covered-by-session-start-stop-contract` |
| `codex_per_minute_message_cap_contract_status` | `covered-by-provider-execution-contract` |
| `codex_monthly_20000_input_character_contract_status` | `covered-by-monthly-input-accounting-contract` |
| `codex_public_access_policy_contract_status` | `covered-by-public-beta-access-gate-contract` |
| `codex_sanitization_contract_status` | `covered-by-this-checklist-and-existing-contracts` |

Codex checks must stop at deterministic source/docs/contract verification unless the user separately approves external operations.

## Completion Labels

This checklist is complete when local docs/contract verification passes. It does not make public release capable by itself.

Required closeout labels:

- `public_launch_operator_qa_checklist_status=complete`
- `cloudflare_custom_rule_operations_doc_status=complete`
- `codex_local_verification_status=pass`
- `operator_external_verification_status=partial-pass-preview-browser`
- `operator_remaining_external_verification_status=action-required`
- `edge_activation_status=not-run-approval-gated`
- `public_gate_flip_status=not-run`
- `deploy_upload_status=not-run`
- `live_provider_execution_status=not-run-approval-gated`
- `public_release_capable_status=no`
