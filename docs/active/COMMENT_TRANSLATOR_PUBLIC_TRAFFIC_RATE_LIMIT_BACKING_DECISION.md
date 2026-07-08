# Comment Translator Public Traffic Rate-Limit Backing Decision

Status: Public Launch Next Flow Step 10 public traffic rate-limit backing decision. Public-release capable: no.

Decision: `public_traffic_rate_limit_backing_selected=cloudflare-edge`.

Rejected option: `supabase-durable-rate-limit-table`.

Risk acceptance: `rate_limit_risk_acceptance_status=not-selected`.

Current application guard: `in_app_rate_limit_guard_role=defense-in-depth`.

Cloudflare edge activation: not-run / approval-gated. Deploy/upload: not-run. Remote mutation: not-run. Public gate flip: not-run.

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
| `edge_activation_status` | `not-run-approval-gated` |
| `in_app_rate_limit_guard_role` | `defense-in-depth` |
| `supabase_rate_limit_table_status` | `not-created` |
| `public_release_capable` | `no` |
| `public_gate_flip_status` | `not-run` |
| `deploy_upload_status` | `not-run` |
| `remote_mutation_status` | `not-run` |

`cloudflare-edge` is selected because public Free beta should reject broad abusive traffic before it reaches application routes, provider execution, billing boundaries, or durable accounting. The existing server-only in-app abuse/rate-limit guard remains defense-in-depth for route/action/provider boundaries.

Supabase durable rate-limit state is rejected for this launch step because Step 11 still carries Supabase default-privileges support/risk acceptance work, and this slice should not introduce a new public-facing database object.

Explicit abuse-control risk acceptance is not selected.

## Protected Traffic Classes

The selected edge backing should cover public traffic classes before public exposure:

- session start;
- session status and heartbeat polling;
- credential status and disconnect calls;
- translation/provider boundary attempts;
- private launch denial retry traffic while the runtime gate remains closed;
- billing action boundary traffic.

## Boundary

This slice does not create or modify Cloudflare rules, Cloudflare WAF/rate-limit settings, Cloudflare environment variables, DNS/domain settings, deploy/upload state, production domain routing, Supabase tables, migrations, remote database state, public gate behavior, provider/live execution, OAuth live flow, Google target lookup, Stripe/billing live actions, Product/Price creation, Checkout/Portal redirect, webhook registration, or main promotion.

The current app-level in-memory guard remains only a local defense-in-depth mechanism until a separate reviewed operation activates the selected Cloudflare edge control.

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
