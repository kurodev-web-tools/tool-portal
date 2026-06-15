# Kuro Live Comment Translator Durable Persistence And Schema Migration Readiness

Status: active durable persistence readiness record. Public-release capable: no.

This document records durable-vs-in-memory decisions for public operation. It is docs/contract readiness only. It does not add SQL migration files, apply remote Supabase migration, run remote mutation, execute live/provider calls, run Stripe live-mode actions, deploy/upload, change browser storage, or expand handoff payloads. Remote Supabase migration apply is not run in Task 23.

## Purpose

Task 23 decides what state must be durable before public operation and keeps every schema change behind explicit approval. The current app has useful server-only contracts for sessions, usage ledger, admin visibility, billing, provider execution, and abuse/rate-limit handling, but several required enforcement surfaces still rely on in-memory state or local deterministic evidence.

Public launch must not depend on undocumented in-memory-only state for required enforcement. Until a durable store or approved edge-backed control is implemented and verified, the launch gate remains blocked.

## Durable Decisions

| Surface | Current state | Decision | Public blocker | Client-readable output |
| --- | --- | --- | --- | --- |
| usage ledger durability | Local F4 migration/adapter exists in `comment_translator_usage_ledger_events`; remote apply not run | Remote migration apply and deployed durable enforcement evidence remain approval-gated | Yes | Sanitized usage metadata only |
| active session state | Local F3 migration/adapter exists in `comment_translator_sessions`; remote apply not run | Remote migration apply and deployed durable enforcement evidence remain approval-gated | Yes | Sanitized session metadata only |
| session history | Local F3 session-history rows exist in `comment_translator_sessions`; remote apply not run | Remote migration apply and deployed durable enforcement evidence remain approval-gated | Yes | Sanitized session metadata only |
| entitlement persistence | Local F5 public entitlement baseline resolver exists for Free; Paid durable entitlement remains future C1 | Free public beta uses safe Free degradation and adds 20,000 characters/month on top of existing time/per-minute/active-session caps; Durable Paid rows are required before Paid limits can be relied on publicly | Yes | Sanitized plan/limit metadata only |
| admin aggregates | Derived aggregate/reference-only snapshots | Durable event-derived aggregates are required for public operations | Yes | Sanitized aggregate/reference-only |
| abuse/rate-limit buckets | In-memory app-side buckets plus edge-control reference name | Durable or approved edge-backed buckets are required for distributed public traffic | Yes | Sanitized rate-limit metadata only |
| provider target metadata | Operator-local/server-only consumption | Do not persist as app-readable public state in this readiness proposal | No | Forbidden |

## Required Before Public Operation

- Durable usage ledger records for session starts/stops, provider request estimates, AI message/character/cost estimates, and quota/budget stop events. F4 adds the local `comment_translator_usage_ledger_events` migration and trusted server adapter; remote Supabase apply remains not-run/approval-gated.
- Durable active-session and session-history rows that can enforce one active session per user, heartbeat timeout, daily/session caps, and stop reasons across restarts and distributed runtimes.
- F5 public entitlement baseline resolver for Free plan limits: 30 min/day/user, 30 min/session, 1 active session/user, 30 translated messages/min, and 20,000 characters/month. Missing or unreadable durable usage state fails closed before public session start; non-durable Paid entitlement state degrades to safe Free limits until C1/C2.
- Durable entitlement persistence for Paid plan limits, with missing or unreadable Paid entitlement degrading to safe Free limits.
- Durable admin aggregates derived from sanitized ledger/session events for active sessions, completed minutes, provider request estimates, AI cost estimates, stop counts, and provider/translation error classes.
- Durable or approved edge-backed abuse/rate-limit buckets before public traffic relies on repeated-attempt protection.
- Remote Supabase migration apply readiness must stay not-applied-readiness-only until same-thread/operator-local ready preflight, sanitized output review, and explicit in-thread approval are all present.

## In-Memory Fallback Boundaries

- In-memory usage ledger and session state are acceptable for deterministic local contracts and private-gated preview only.
- For public enforcement reads, missing durable state must fail closed or degrade to safe Free/inactive limits rather than silently trusting empty memory.
- In-memory active-session state may be retained only as a cache after durable session rows exist.
- In-memory abuse/rate-limit buckets are not sufficient for distributed public traffic. Use an approved durable backing store or approved edge rate-limit control before public exposure.
- Provider target metadata and live target references remain operator-local/server-only inputs. They must not be written to client-readable output, docs evidence, PR bodies, browser storage, or handoff payloads.

## Approval-Gated Schema Proposal

Reference-only schema proposal. No SQL file is added by Task 23 and no remote Supabase migration apply is run.

Proposed durable tables, subject to separate final review:

- `comment_translator_sessions`: sanitized session reference, account/user reference, plan entitlement reference, status, start/stop timestamps, heartbeat timestamp, stop reason, and credential reference only when already allowed as opaque non-secret metadata.
- `comment_translator_usage_ledger_events`: sanitized event rows for usage ledger durability, monthly/daily/session counters, provider request estimates, AI usage estimates, provider/translation error classes, and quota/budget stop events.
- `comment_translator_entitlements`: server-owned Free/Paid entitlement rows and limit values derived from approved billing/webhook evidence.
- `comment_translator_admin_daily_aggregates`: derived sanitized daily aggregates for operator visibility and incident review.
- `comment_translator_abuse_rate_limit_buckets`: sanitized request identity bucket metadata, or an approved edge rate-limit control if selected instead.

Approval gate for any actual schema migration:

- final schema review;
- rollback review;
- same-thread/operator-local ready preflight;
- sanitized output review;
- explicit in-thread approval.

## Migration Ordering

1. `freeze-new-public-sessions`: keep public launch disabled and avoid starting new public sessions during migration.
2. `create-durable-tables-and-policies`: create reviewed durable tables, policies, indexes, and server-only access boundaries in a separate approved migration PR.
3. `dual-write-server-owned-events`: write sanitized session/usage/entitlement events to durable storage while preserving current local contract behavior.
4. `backfill-sanitized-history-from-available-local-evidence`: backfill only sanitized evidence that already exists; do not reconstruct private identifiers or raw comments.
5. `switch-enforcement-reads-to-durable-store`: move public enforcement reads to durable storage and fail closed on unavailable required state.
6. `keep-in-memory-fallback-fail-closed`: retain memory only as cache/local fallback, never as undocumented public authority.
7. `operator-verified-cutover`: verify sanitized contract output, admin aggregates, rollback path, and no-secret scan before any launch-gate change.

## Rollback Plan

- Disable new public session starts while preserving signed-in account access.
- Keep durable rows for audit and rollback evidence; do not export private values.
- Revert enforcement reads to safe Free limits only when durable reads are unavailable.
- Disable paid-limit activation before rolling back entitlement reads.
- Keep provider execution, Stripe live-mode actions, Customer Portal redirect, webhook registration, deploy/upload, and remote mutation approval-gated until sanitized verification is reviewed.

## Public Launch Blockers

- Public-release capable: no.
- F5 public entitlement baseline is implemented locally, but public launch remains blocked. The resolver uses durable F4 monthly usage reads for the 20,000 characters/month cap and degrades any non-durable Paid entitlement to Free until durable Paid entitlement work lands.
- Usage ledger durability has a local F4 migration/adapter, but remote Supabase migration apply and deployed enforcement evidence are not yet approved or run.
- Active session state and session history have a local F3 migration/adapter, but remote Supabase migration apply and deployed enforcement evidence are not yet approved or run.
- Paid entitlement persistence is not yet a public durable authority.
- Admin aggregates are not yet derived from durable public-operation events.
- Abuse/rate-limit buckets are not yet durable or edge-backed for distributed public traffic.
- Remote Supabase migration apply readiness is not-applied-readiness-only in this PR.
