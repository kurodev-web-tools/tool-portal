# Comment Translator Public Traffic Rate-Limit Backing Decision

Status: Public Launch Next Flow Step 10 public traffic rate-limit backing decision. Public-release capable: no.

Decision: `public_traffic_rate_limit_backing_selected=cloudflare-edge`.

Rejected option: `supabase-durable-rate-limit-table`.

Risk acceptance: `rate_limit_risk_acceptance_status=not-selected`.

Current application authority: `app_enforcement_authority=durable-quotas-session-caps-rate-guards`.

Cloudflare Translator edge activation: deferred and not required for Free public beta. Deploy/upload: not-run. Remote mutation: not-run. Public gate flip: not-run.

## Purpose

Step 10 selects the distributed public-traffic abuse-control backing before PL-G5 can record broad public capability and before PL-G6 performs any public access change. This is a policy/contract/documentation slice only.

## Decision

| Item | Status |
| --- | --- |
| `public_traffic_rate_limit_backing_status` | `complete` |
| `public_traffic_rate_limit_backing_selected` | `cloudflare-edge` |
| `public_traffic_rate_limit_backing_rejected` | `supabase-durable-rate-limit-table` |
| `rate_limit_risk_acceptance_status` | `not-selected` |
| `edge_control_reference` | `COMMENT_TRANSLATOR_EDGE_RATE_LIMITING` |
| `edge_activation_status` | `deferred-not-required-for-free-public-beta` |
| `edge_protection_readiness_status` | `pass-with-optional-edge-control-deferred` |
| `edge_rate_limiting_disposition` | `deferred-existing-free-slot-reserved-for-leaked-credential-protection` |
| `cloudflare_free_rate_limiting_slot_status` | `occupied-leaked-credential-protection` |
| `app_enforcement_authority` | `durable-quotas-session-caps-rate-guards` |
| `supabase_rate_limit_table_status` | `not-created` |
| `public_release_capable` | `no` |
| `public_gate_flip_status` | `not-run` |
| `deploy_upload_status` | `not-run` |
| `remote_mutation_status` | `not-run` |

`cloudflare-edge` remains the preferred optional outer load-shedding backing. The available Free Rate Limiting rule slot remains reserved for leaked-credential protection, so the Translator-specific rule is deferred until traffic or revenue justifies a separately approved operation. App-side durable quotas, session caps, and rate guards remain the enforcement authority for route, action, session, and provider-cost boundaries.

Supabase durable rate-limit state is rejected for this launch step because Step 11 still carries Supabase default-privileges support/risk acceptance work, and this slice should not introduce a new public-facing database object.

Explicit abuse-control risk acceptance is not selected.

## Protected Traffic Classes

If a later traffic/revenue review approves Translator-specific edge activation, the optional edge backing should cover:

- session start;
- session status and heartbeat polling;
- credential-status reads;
- Free translation action attempts before provider execution.

That later optional operation must exclude Creator/Paid, billing/webhook, admin, privileged, Supabase, Stripe, OBS, OAuth callback/reconnect, provider/live, and Google Auth mutation classes. It must not replace or weaken the existing leaked-credential protection.

## Boundary

This slice does not create or modify Cloudflare rules, Cloudflare WAF/rate-limit settings, Cloudflare environment variables, DNS/domain settings, deploy/upload state, production domain routing, Supabase tables, migrations, remote database state, public gate behavior, provider/live execution, OAuth live flow, Google target lookup, Stripe/billing live actions, Product/Price creation, Checkout/Portal redirect, webhook registration, or main promotion.

The current app-side durable quota, session-cap, and rate-guard surfaces remain authoritative without a Translator-specific Cloudflare rule. The optional edge layer can be added later without changing those authorities.

Operational handling for Cloudflare Custom Rules, Turnstile, API-vs-HTML Managed Challenge boundaries, Creator/Paid transition, and traffic-growth response is recorded in `docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md`. Cloudflare edge remains the preferred optional outer layer, Translator-specific activation is deferred, the existing leaked-credential protection remains unchanged, and API Managed Challenge is not the production default.

## Sanitized Evidence Shape

Allowed evidence fields:

- safe branch label;
- selected backing label;
- rejected backing label;
- edge activation status label;
- in-app guard role label;
- public-release capable label;
- public gate flip status;
- pass/fail/count labels.

Forbidden output/storage:

- Cloudflare API token values or zone id values;
- secrets, tokens, cookies, or Authorization header values;
- browser storage payloads;
- raw request IP values;
- owner/internal user id values;
- provider target metadata;
- provider private identifiers;
- liveChatId;
- raw provider payloads;
- raw comments;
- private account values;
- support ticket ids;
- private owner role values;
- raw SQL output.

## Verification Boundary

Width checks skipped because this slice changes only server-only policy labels, docs, deterministic scripts, and `task.md`. There is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or client behavior change.
