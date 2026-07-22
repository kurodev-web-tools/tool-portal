# Kuro Live Comment Translator Stripe Live Readiness

Status: active Task 21 billing operations readiness record.

This document prepares Stripe billing for private-gated production. It is not approval for Stripe live-mode action, Customer Portal redirect execution, webhook registration, Product or Price creation, billing setting mutation, deploy/upload, remote mutation, schema migration, live/provider execution, or provider target lookup.

## Purpose

Record the operator checklist and local contract evidence needed before private-gated Stripe billing can be enabled without unexpected live mutations.

Completion evidence for this task is local runtime, documentation, and contract verification only. Dashboard and live-mode actions remain blocked unless the same thread contains all approval gates and the exact approved action.

## Approval Gate

Stripe live-mode or dashboard actions require all of the following in the same thread before execution:

- same-thread/operator-local ready preflight;
- sanitized output review;
- explicit in-thread approval for the exact action.

This Task 21 branch did not run live-mode actions. The only allowed values in readiness output are sanitized metadata, route/action names, status labels, check names, and reference name only environment labels. Stripe secret key values, webhook signing secret values, Customer or Subscription values, payment method details, OAuth values, owner user id values, provider channel id values, liveChatId values, Authorization header values, service-role key values, and provider target metadata values must not be requested, printed, stored, placed in PR text, written to browser storage, or included in handoff payloads.

## Product Price Checkout Portal Readiness

Operator-local checklist before any approved private-gated Stripe action:

1. Confirm the live Stripe Product exists for Kuro Stream Kit Pro or create it only after explicit approval.
2. Confirm the live Stripe Price configuration for the intended monthly/yearly public copy. Record only reference name presence, not Price values.
3. Confirm `COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID` points to the approved live Price reference in the operator-local environment. Do not paste the value.
4. Confirm `STRIPE_SECRET_KEY` is present only in the server/operator-local command process. Do not paste the value.
5. Confirm `COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS` remains unset until a separately approved activation and is set only to the exact reviewed marker during that approved action. Record presence/state only, never unrelated environment values.
6. Confirm `COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES` contains only the approved closed-beta account hashes through its existing approved process. Do not paste hash or owner values.
7. Confirm `NEXT_PUBLIC_SITE_URL` points to the approved private-gated site before Checkout execution. Record only the route label or host label if safe.
8. Confirm Checkout success/cancel routes remain `/account/billing?billing=checkout-returned` and `/account/billing?billing=checkout-canceled`.
9. Confirm Customer Portal settings are configured in Dashboard only after approval. Portal redirect execution is not run in this task.
10. Confirm Free remains permanently available and billing setup failures leave Checkout/Portal unavailable instead of weakening session limits.

Task 21 local status: Product, Price, Checkout live execution, Customer Portal redirect, and billing setting mutation were not run. They remain blockers pending same-thread approval and sanitized evidence.

## Signed Webhook Entitlement Evidence

The existing Task 15 billing runtime keeps the webhook route server-owned and signed:

- route: `/api/comment-translator/billing/webhook`;
- signature header: `stripe-signature`;
- webhook secret reference name: `STRIPE_WEBHOOK_SECRET`;
- closed-beta activation reference name: `COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS`;
- verifier boundary: `createCommentTranslatorStripeWebhookVerifier`;
- entitlement application boundary: `readCommentTranslatorStripeWebhookResult`;
- client-readable output: sanitized billing metadata only.

Local deterministic evidence verifies that a signed subscription update can activate paid limits, while unsigned, missing-config, or invalid-signature payloads are rejected without returning secret values. Live webhook registration and live Stripe webhook delivery were not run for Task 21.

## Failed Canceled Expired State Review

Launch behavior for subscription states:

| Stripe status | Billing state | Session entitlement | Launch handling |
| --- | --- | --- | --- |
| `active` | paid-active | Paid | allow paid limits after signed webhook evidence |
| `trialing` | paid-inactive by default | Free | require a separately reviewed exact server-owned trial policy before paid limits may activate |
| `past_due` | paid-inactive | Free | degrade to safe Free limits |
| `unpaid` | paid-inactive | Free | degrade to safe Free limits |
| `canceled` | paid-inactive | Free | degrade to safe Free limits |
| `incomplete` | paid-inactive | Free | degrade to safe Free limits |
| `incomplete_expired` | paid-inactive | Free | degrade to safe Free limits |
| `paused` | paid-inactive | Free | degrade to safe Free limits |

Failed, canceled, expired, incomplete, unpaid, or paused states must not block Free access. They also must not grant paid provider routing, paid session limits, or paid entitlement copy.

## Safe Rollback Notes

Rollback is an operator action and must be approved before execution.

- Keep Free available while disabling new paid Checkout entry when live Product or Price evidence is wrong.
- Disable or remove live webhook endpoint registration only after preserving sanitized failure counts and route names.
- Revert Customer Portal settings only from Dashboard after approval; do not run a Portal redirect as a rollback probe.
- Treat payment failure, cancellation, expiration, incomplete, unpaid, and paused states as Free or paid-inactive while investigating.
- Do not export or paste Stripe secret key, webhook signing secret, Customer values, Subscription values, payment method details, OAuth values, owner values, provider target metadata, liveChatId values, service-role values, or Authorization header values.

## Evidence Record Template

```text
Task: Stripe live readiness and billing operations
Stripe live-mode action: not-run | approved action name
Product/Price readiness: blocked-pending-operator-evidence | sanitized reference-present evidence
Checkout execution: not-run | approved redirect evidence
Customer Portal redirect: not-run | approved redirect evidence
Webhook registration: not-run | approved endpoint presence evidence
Signed webhook entitlement evidence: local deterministic contract
Failed/canceled/expired review: safe Free or paid-inactive degradation
Billing setting mutation: not-run | approved dashboard mutation label
Output policy: sanitized-metadata-only
Sensitive values: not requested, not printed, not stored
Rollback: not-run | approved rollback action label
Residual risk: account/dashboard-specific evidence still pending
```
