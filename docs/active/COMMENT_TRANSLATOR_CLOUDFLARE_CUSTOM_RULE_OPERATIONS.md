# Comment Translator Cloudflare Custom Rule Operations

Status: active operational guidance for Free public launch and later Creator/Paid launch. Public-release capable: yes after the completed final production/main-domain smoke.

This document records how to operate Cloudflare Custom Rules, Turnstile, and Rate Limiting around Kuro Live Comment Translator. It is a docs/contract slice only. It does not approve or perform Cloudflare dashboard changes, environment mutation, deploy/upload, public gate flip, live/provider execution, OAuth live flow, Google target lookup, remote Supabase mutation, Stripe live action, paid entitlement runtime, or main promotion.

Sanitization boundary: record only status labels, route-class labels, pass/fail, counts, and safe public file references. Do not record secrets, tokens, cookies, Authorization headers, Cloudflare token values, Cloudflare account ids, zone ids, rule ids, browser storage payloads, owner/internal ids, provider target metadata, provider private identifiers, liveChatId, raw provider payloads, raw comments, private account values, support ticket ids, private owner role values, or raw SQL output.

## Current Labels

| Item | Status |
| --- | --- |
| `cloudflare_custom_rule_operations_doc_status` | `complete` |
| `operator_cloudflare_preview_custom_rule_status` | `configured-preview-only-managed-challenge` |
| `operator_cloudflare_preview_rule_scope` | `preview-host-translator-integrations-comment-translator-api-route-classes` |
| `operator_production_api_managed_challenge_status` | `not-selected` |
| `operator_production_harness_block_status` | `pass-production-404` |
| `comment_translator_edge_rate_limiting_reference` | `COMMENT_TRANSLATOR_EDGE_RATE_LIMITING` |
| `comment_translator_edge_rate_limiting_runtime_role` | `control-reference-label-not-parsed-behavior-flag` |
| `cloudflare_free_rate_limiting_slot_status` | `occupied-leaked-credential-protection` |
| `edge_rate_limiting_disposition` | `deferred-existing-free-slot-reserved-for-leaked-credential-protection` |
| `edge_activation_status` | `deferred-not-required-for-free-public-beta` |
| `edge_protection_readiness_status` | `pass-with-optional-edge-control-deferred` |
| `app_enforcement_authority` | `durable-quotas-session-caps-rate-guards` |
| `free_public_launch_default` | `login-turnstile-app-quotas-no-constant-ordinary-route-challenge` |
| `api_protection_preference_order` | `app-quotas-session-caps-rate-guards-then-cloudflare-rate-limiting-then-managed-challenge-emergency-or-html-only` |
| `turnstile_pre_clearance_status` | `later-improvement-not-free-launch-requirement` |
| `managed_challenge_passage_guidance` | `about-45-minutes-if-html-managed-challenge-is-used` |
| `paid_creator_boundary_authority` | `app-side-entitlement-session-usage-quota-not-cloudflare-clearance` |
| `traffic_growth_response_ladder_status` | `documented` |
| `public_release_capable_status` | `yes` |

## Operating Principles

1. Free public beta access is `login-only`; Creator/Paid waitlist remains Creator/Paid-only until a separate entitlement launch.
2. YouTube connection alone must not start monitoring, polling, translation, target lookup, or quota consumption.
3. Start is the first provider-affecting action. Server-owned session, usage, quota, and credential readiness checks remain the authority before provider work.
4. Normal Free public launch should not challenge every ordinary route constantly.
5. Login Turnstile and app server-owned quotas/session limits are the primary Free launch controls.
6. Production route/API harness remains blocked with HTTP 404.
7. API Managed Challenge can break fetch, heartbeat, credential-status, OAuth, and server-action-like traffic by returning challenge HTML. It is not the production default.
8. Cloudflare Rate Limiting Rules are preferred for API load shedding when available.
9. Managed Challenge is reserved for HTML route protection, targeted suspicious traffic, or temporary emergency response.
10. Cloudflare clearance is not an entitlement, session, quota, or paid-plan boundary.

Cloudflare edge protection is a separate approval-gated operation and is not the final public gate declaration itself. The final release declaration does not create or change a Worker binding and must not be used to bundle an otherwise unapproved edge-rule mutation.

## Free Rule Slot Deferral Decision

The available Free Cloudflare Rate Limiting rule slot remains reserved for leaked-credential protection. That existing security control must not be replaced or weakened to create capacity for a Translator-specific rule.

Translator-specific Cloudflare Rate Limiting is deferred until traffic or revenue justifies a separately reviewed and approved operation. This optional outer load-shedding layer is not a Free public beta release prerequisite. App-side durable quotas, session caps, and rate guards remain the enforcement authority for provider cost and session behavior.

The deferral does not select production API Managed Challenge. It does not create a Custom Rule, move the leaked-credential control between rule types, change `COMMENT_TRANSLATOR_EDGE_RATE_LIMITING`, or mutate any Cloudflare rule, binding, environment value, secret, or deployment.

## Phase Guidance

### Preview Period

The preview-only Managed Challenge custom rule can remain as an external-flow guard while the preview browser flow is known to work. The current preview label is `configured-preview-only-managed-challenge`.

Preview may temporarily include translator, integrations, and comment-translator API route classes when the release operator has browser-checked the flow. That preview success must not be copied as the production default for API traffic.

If preview exposure needs to be tighter, prefer a preview-host or preview HTML-route Managed Challenge over broad production API challenge policy. Keep evidence to status labels and counts only.

### Free Public Launch Period

Default Free launch posture:

- keep Free public beta access `login-only`;
- keep login Turnstile as the human-verification entry control where enabled;
- rely on server-owned durable session and usage state for daily, per-session, per-minute, and monthly provider-input character limits;
- keep one active session per user for the Free baseline;
- require Start before provider-affecting work;
- block or remove route/API harness exposure before production traffic;
- avoid constant Managed Challenge on every ordinary route.

If HTML Managed Challenge is used around Free public launch, scope it to HTML route classes such as `/tools/comment-translator` and `/account/integrations`. A Challenge Passage near 45 minutes is reasonable for the initial Free launch because it covers sign-in, connection readiness, and a 30 minute session without tying Cloudflare clearance to the session limit.

Do not tie Cloudflare clearance duration to Free plan duration. The app-side session and usage model remains the enforcement authority.

### Creator/Paid Launch Transition

Creator/Paid launch should reduce challenge friction for entitled users. Paid or Creator status must be controlled by app-side signed entitlement evidence, durable usage/session state, quota limits, billing state, and stop reasons.

Do not make Cloudflare clearance, Challenge Passage, or Managed Challenge success the plan boundary. Do not lengthen Challenge Passage to match paid session duration. Cloudflare remains an outer traffic-control layer; entitlement and cost controls remain app-side.

For entitled users, prefer targeted abuse handling over broad repeated challenge prompts. If entitlement state is unavailable, the app should degrade safely according to the approved paid entitlement policy rather than treating a Cloudflare clearance cookie as proof of plan access.

### Traffic Growth Response

Monitor these signals as user count and traffic increase:

- session starts;
- session heartbeat volume;
- credential-status request spikes;
- Start failures per user;
- login and signup attempts;
- durable session/usage fail-closed counts;
- provider quota stops;
- global budget stops;
- AI budget stops;
- Azure Translator usage;
- Supabase Auth failures;
- Cloudflare Security Events.

Escalate controls in this order:

1. Observe and record sanitized baselines.
2. Tune app-side Start, heartbeat, credential-status, session, and quota guards.
3. Add or tune Cloudflare Rate Limiting Rules for API load shedding when available.
4. Add targeted HTML Managed Challenge for suspicious route classes or short incidents.
5. Consider Start-adjacent Turnstile or Turnstile Pre-clearance as a later UX improvement.
6. Use temporary emergency Managed Challenge or access controls only when targeted controls are not enough.
7. Remove broad emergency controls after the incident and record the rollback label.

## API And HTML Boundary

HTML route classes can tolerate Managed Challenge better than API route classes because the user can complete an interactive challenge in the browser.

API route classes should not use Managed Challenge as the normal production control because challenge HTML can break:

- session start and session heartbeat fetches;
- credential status and disconnect fetches;
- OAuth callback or reconnect flow assumptions;
- server-action-like traffic;
- polling or feed/status refresh behavior.

Production API protection preference order:

1. app-side durable quotas, session caps, and rate guards;
2. Cloudflare Rate Limiting Rules for load shedding when available;
3. targeted WAF/Custom Rule blocks for known harness or abusive route classes;
4. Managed Challenge only for emergency, temporary response or HTML routes.

## Release Operator Checks

Before PL-G5 or PL-G6, the release operator should verify:

- this document is linked from `task.md`;
- production route/API harness remains blocked with HTTP 404;
- production API Managed Challenge remains `not-selected` unless an emergency exception is recorded;
- login Turnstile is present where the approved auth flow expects it;
- Free public beta remains login-only and waitlist remains Creator/Paid-only;
- YouTube connection alone does not start provider-affecting work;
- Start remains the first provider-affecting action;
- app-side durable session/usage/quota limits are still the authority;
- Cloudflare Rate Limiting Rules remain an optional later API load-shedding layer when available and justified by traffic or revenue;
- Managed Challenge, if used for Free launch, is scoped to HTML routes or temporary emergency response;
- Challenge Passage, if changed, is not used as an entitlement or plan-duration boundary;
- traffic-growth monitoring covers the signals listed in this document.

Evidence should be pass/fail/count/status-label only. Do not export browser storage, raw request payloads, raw comments, Cloudflare identifiers, or provider/private values.

## Non-Actions

This document does not run or approve:

- Cloudflare Custom Rule creation or mutation;
- Cloudflare Rate Limiting Rule creation or mutation;
- Cloudflare environment variable or secret changes;
- production edge activation;
- deploy/upload;
- public gate flip;
- public access runtime change;
- route/API harness runtime deletion;
- remote Supabase query or mutation;
- migration or `db push`;
- live/provider execution;
- OAuth live flow;
- Google target lookup;
- Stripe live-mode action;
- Product/Price creation;
- Checkout or Portal execution;
- webhook registration;
- paid entitlement runtime implementation;
- OBS overlay route or token runtime;
- promotion to `main`.

## Verification Boundary

This guide is verified by `node scripts/comment-translator-cloudflare-custom-rule-operations-contract.mjs` and the related public-launch docs contracts. UI/browser width QA is not required for this slice because it changes only docs, deterministic scripts, and `task.md`; there is no rendered UI, CSS, route, layout, browser storage, or client behavior change.
