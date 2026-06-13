# Kuro Live Comment Translator Provider Legal Copy Refresh

Status: Task 25 provider terms, privacy, and legal copy refresh for the pre-main launch hardening roadmap.

## Purpose

Align public legal and visible product/account copy with the final translation provider policy before public release.

This document is copy/readiness evidence only. It does not approve live/provider execution, deploy/upload, remote mutation, Stripe live-mode action, Customer Portal redirect, webhook registration, billing setting mutation, remote schema migration, Supabase migration apply, provider target lookup, or liveChatId lookup.

## Surfaces Refreshed

- `/terms`
- `/privacy`
- `/legal/tokushoho`
- `/tools/comment-translator`
- `/account/integrations`
- `/account/billing`
- private-launch unavailable copy shown on the same Comment Translator surfaces

## Provider Copy Policy

- Free plan primary: Azure Translator.
- Paid plan primary: OpenAI mini.
- Paid recoverable fallback: Azure Translator.
- DeepL / Gemini Flash/Lite / Cloudflare Workers AI: comparison-only for the initial launch, not current production routing.
- YouTube API reads and AI translation run only after an explicit session Start.
- YouTube connection alone does not start background monitoring, polling, translation, or quota use.

## Data Use, Retention, And Training Copy

User-visible copy now states:

- provider processing is limited to the explicit translation session scope;
- raw comment logging is disabled by default;
- diagnostics are short-lived and sanitized when needed;
- OpenAI API/business data is not used for model training by default;
- Azure Translator customer data is handled under the no-persistent-storage posture recorded in the provider policy;
- provider terms, region, price, training, and retention posture must be rechecked before live/provider execution or paid launch.

## Sensitive Metadata Boundary

The refreshed copy does not expose provider target metadata, liveChatId values, owner values, OAuth values, Authorization headers, Stripe secrets, webhook signing secrets, service-role values, provider credentials, Customer values, Subscription values, or payment method details.

Required environment and dashboard values remain reference-name-only and operator-local/server-only.

## Billing Copy Policy

- Free remains available.
- Paid plan wording starts from Comment Translator limit expansion.
- Stripe Product, Price, Checkout, Customer Portal, webhook registration, and billing setting mutation remain approval-gated.
- Failed, canceled, expired, incomplete, unpaid, or paused billing states continue to degrade to Free or paid-inactive behavior, as recorded in Task 21 readiness.

## Out Of Scope

No live/provider execution, deploy/upload, remote mutation, Stripe live-mode action, or remote schema migration was run.

No live/provider execution, deploy/upload, remote mutation, Stripe live-mode action, Customer Portal redirect, webhook registration, billing setting mutation, remote schema migration, or Supabase migration apply was run.

No provider routing runtime, browser storage, handoff payload, quota write, durable persistence, RLS policy, or SQL migration behavior changed in this task.
