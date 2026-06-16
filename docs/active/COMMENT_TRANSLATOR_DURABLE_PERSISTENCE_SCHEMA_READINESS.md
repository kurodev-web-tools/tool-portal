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
| F6 server-only live chat target lookup | Start-only server boundary exists with deterministic/local adapter and sanitized unavailable fallback; real provider target lookup is not run | Start requests fail closed to sanitized `stream-unavailable` until approved live lookup execution is separately ready; no connection-only/background/route-render lookup is added | Yes | Sanitized session metadata only |
| F7 bounded `liveChatMessages.list` polling wiring | Active-session-only server wiring exists with server-only live target/cursor state, `pollingIntervalMillis`, capped retry/backoff, empty-chat waiting, terminal-state handoff, and quota/budget stop handoff | Default route/action adapter remains unavailable/not-run; real `liveChatMessages.list` execution is approval-gated and public launch remains blocked | Yes | Sanitized session metadata and counts only |
| F8 live message normalization | Server-only deterministic normalizer exists for text, Super Chat, Super Sticker, member/system, deleted, banned, and ended events with message-reference dedupe and deletion handling | Raw provider payload, author channel id/URL/profile image URL, live target values, provider target metadata, and server-only cursors are not returned; BAN author-history bulk update remains P1-deferred without a session-scoped author key | Yes | Sanitized normalized event rows only |
| F9 real comments UI wiring | Server-owned local feed wiring consumes the F8 browser-safe projection and maps it to browser-safe display rows; fixture/manual feed authority is disabled for the live feed | Default feed action remains sanitized unavailable/not-run until approved live polling/intake exists; translation execution is not run | Yes | Sanitized YouTube Live Chat display rows only |
| F10 Azure normal translation execution | Server-only local bridge maps eligible F8 normalized messages into the existing Free Azure provider policy execution path and merges translated results back into F9 safe feed rows | Azure/OpenAI provider API execution is not run by default; provider calls require injected server-only provider readiness plus same-thread preflight, sanitized output review, and explicit approval | Yes | Sanitized translation status, translated text, and usage estimates only |
| F11 Start/Stop reason UX | Local deterministic reason resolver maps existing server-owned session stop reasons, credential readiness, live-target readiness, polling terminal codes, quota/budget stops, heartbeat/browser disconnects, and provider/translation errors to browser-safe reason codes and localized UI copy | Reason detail is sanitized code/group/action metadata only; real provider lookup, polling, translation API execution, and public launch remain approval-gated | Yes | Sanitized reason metadata and localized copy only |
| F12 Usage display for Free beta | Local deterministic usage display derives session/day/month/per-minute usage, remaining limits, monthly character cap, and provider-call policy from server-owned session usage and Free entitlement metadata | Over-limit, unreadable usage, missing entitlement, and missing provider readiness are sanitized unavailable or blocked states; provider calls are not run when the policy is blocked | Yes | Sanitized usage metadata and static localized copy only |
| F13 Data deletion, retention, and source attribution | Local deterministic retention/source resolver records data deletion request path, OAuth disconnect cleanup readiness, retention job readiness, deleted-message tombstone propagation, and `Source: YouTube Live Chat` attribution | Actual deletion cleanup, OAuth live disconnect execution, remote mutation/schema apply, provider lookup/polling, and public launch remain approval-gated/not-run | Yes | Sanitized deletion/retention/source metadata only |
| admin aggregates | Derived aggregate/reference-only snapshots | Durable event-derived aggregates are required for public operations | Yes | Sanitized aggregate/reference-only |
| abuse/rate-limit buckets | In-memory app-side buckets plus edge-control reference name | Durable or approved edge-backed buckets are required for distributed public traffic | Yes | Sanitized rate-limit metadata only |
| provider target metadata | Operator-local/server-only consumption | Do not persist as app-readable public state in this readiness proposal | No | Forbidden |

## Required Before Public Operation

- Durable usage ledger records for session starts/stops, provider request estimates, AI message/character/cost estimates, and quota/budget stop events. F4 adds the local `comment_translator_usage_ledger_events` migration and trusted server adapter; remote Supabase apply remains not-run/approval-gated.
- Durable active-session and session-history rows that can enforce one active session per user, heartbeat timeout, daily/session caps, and stop reasons across restarts and distributed runtimes.
- F5 public entitlement baseline resolver for Free plan limits: 30 min/day/user, 30 min/session, 1 active session/user, 30 translated messages/min, and 20,000 characters/month. Missing or unreadable durable usage state fails closed before public session start; non-durable Paid entitlement state degrades to safe Free limits until C1/C2.
- F6 Start-only server boundary for owned-broadcast lookup. This PR wires a deterministic/local adapter and a sanitized unavailable fallback only; real provider target lookup, live target resolution, polling, and background monitoring remain approval-gated and not run.
- F7 bounded `liveChatMessages.list` polling wiring. This PR wires active-session-only local server state for the F6 live target, keeps `nextPageToken` server-only, honors `pollingIntervalMillis`, records capped retry/backoff and empty-chat behavior, maps terminal polling state to sanitized session stop reasons, and hands quota/budget stops back to the durable usage/session ledger path. Real YouTube polling remains not-run/approval-gated.
- F8 live message normalization. This PR adds a local server-only normalization layer for provider payloads returned by future polling. It normalizes text, Super Chat, Super Sticker, member/system, deleted, banned, and ended events; dedupes by message reference; propagates deleted message references; keeps raw provider payload and author channel material out of returned output; and records author-history BAN updates as P1-deferred unless a later server-only session-scoped author key design is approved.
- F9 real comments UI wiring. This PR adds a local server-owned feed adapter that consumes only F8 browser-safe rows, returns a safe display row shape to the browser, and changes the UI feed authority away from fixture/manual rows. Real polling, live provider lookup, raw provider payload capture, and translation provider execution remain not-run/approval-gated.
- F10 Azure normal translation execution. This PR adds a server-only local bridge from eligible F8 normalized live comments to the existing provider policy runtime, keeps Free on Azure primary, applies source/target language policy, bounded batch/retry/cache behavior, safe provider-error degradation, and local deterministic usage handoff estimates. Real Azure/OpenAI provider API execution remains not-run/approval-gated unless same-thread ready preflight, sanitized output review, and explicit approval are present.
- F11 Start/Stop reason UX. This PR adds browser-safe reason metadata derived only from existing session `stopReason`, credential readiness, live-target readiness, polling/provider signal, quota/budget state, and heartbeat/browser state. It localizes disconnected, reconnect-required, no live broadcast, live chat disabled, ended/not found, quota/budget stop, heartbeat/browser disconnect, and translation/provider errors without exposing raw provider payloads, live target values, provider target metadata, server-only cursors, token values, or private owner/provider identifiers.
- F12 Usage display for Free beta. This PR adds browser-safe Free beta usage display metadata for session, day, per-minute, and monthly character caps. The display is derived from server-owned usage and entitlement state, keeps provider target metadata, raw provider payloads, raw comments, tokens, account ids, live target values, and server-only cursors out of browser-readable output, and blocks translation provider calls before execution when usage is over limit or unavailable.
- F13 Data deletion, retention, and source attribution. This PR adds a server-only local resolver and UI/action path for sanitized data deletion readiness, retention job readiness, OAuth disconnect cleanup readiness, deleted-message propagation, and `Source: YouTube Live Chat` attribution. Actual cleanup mutation, OAuth live disconnect execution, provider lookup/polling, live/provider execution, deploy/upload, remote schema/migration apply, and public launch remain not-run/approval-gated.
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
- F6 server-only live chat target lookup is implemented locally as Start-only wiring, but public launch remains blocked. Real provider target lookup and live target resolution are not run in this thread; the default runtime path uses sanitized fail-closed unavailable state.
- F7 bounded `liveChatMessages.list` polling wiring is implemented locally, but public launch remains blocked. Real YouTube `liveChatMessages.list`, provider target lookup/live target resolution, translation provider execution, remote mutation/schema apply, and deploy/upload are not run in this thread; the default runtime path uses a not-run polling adapter.
- F8 live message normalization is implemented locally, but public launch remains blocked. Real YouTube polling/provider payload capture, live target lookup/resolution, translation provider execution, browser feed replacement, remote mutation/schema apply, and deploy/upload are not run in this thread.
- F9 real comments UI wiring is implemented locally, but public launch remains blocked. The browser feed consumes only server-owned safe display rows and the default route/action path returns sanitized unavailable state; real `liveChatMessages.list`, live target lookup/resolution, translation provider execution, remote mutation/schema apply, and deploy/upload are not run in this thread.
- F10 Azure normal translation execution is implemented locally, but public launch remains blocked. The bridge uses only normalized/browser-safe live message boundaries and injected server-only providers in deterministic tests; real Azure/OpenAI provider API execution, real YouTube polling/provider payload capture, live target lookup/resolution, remote mutation/schema apply, deploy/upload, and launch gate flip are not run in this thread.
- F11 Start/Stop reason UX is implemented locally, but public launch remains blocked. The UI and browser-readable session state receive sanitized reason code/group/action metadata only; real provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider API execution, remote mutation/schema apply, deploy/upload, and launch gate flip are not run in this thread.
- F12 Usage display for Free beta is implemented locally, but public launch remains blocked. Session/day/month/per-minute usage display and no-provider-call over-limit behavior are deterministic/local; real provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider API execution, remote mutation/schema apply, deploy/upload, and launch gate flip are not run in this thread.
- F13 Data deletion, retention, and source attribution is implemented locally, but public launch remains blocked. Data deletion request state, OAuth disconnect cleanup readiness, retention readiness, deleted-message tombstones, and source attribution are deterministic/local; actual cleanup mutation, OAuth live disconnect execution, real provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider API execution, remote mutation/schema apply, deploy/upload, and launch gate flip are not run in this thread.
- Usage ledger durability has a local F4 migration/adapter, but remote Supabase migration apply and deployed enforcement evidence are not yet approved or run.
- Active session state and session history have a local F3 migration/adapter, but remote Supabase migration apply and deployed enforcement evidence are not yet approved or run.
- Paid entitlement persistence is not yet a public durable authority.
- Admin aggregates are not yet derived from durable public-operation events.
- Abuse/rate-limit buckets are not yet durable or edge-backed for distributed public traffic.
- Remote Supabase migration apply readiness is not-applied-readiness-only in this PR.
