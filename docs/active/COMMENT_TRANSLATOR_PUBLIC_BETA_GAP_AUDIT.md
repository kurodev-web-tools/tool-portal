# Kuro Live Comment Translator Public Beta Gap Audit

Status: P0-0 audit record for Free public beta sequencing. Public-release capable: no.

This audit compares the current repository state against the active `task.md` final MVP sequencing and public-release requirements. It is docs/content inspection only. It does not run Google OAuth live connect, YouTube OAuth live connect, authorization code exchange, token persistence smoke, provider target lookup, liveChatId lookup, session start smoke, translation provider API execution, live/provider execution, deploy/upload, remote mutation, Supabase migration apply, schema migration, Stripe live-mode action, Product/Price creation, Checkout, Customer Portal redirect, webhook registration, billing setting mutation, main promotion, or public launch gate flip.

Output policy: sanitized status, path, task id, and boundary labels only. No secret, OAuth value, token value, authorization code value, owner user id value, provider channel id value, liveChatId value, service-role key value, Authorization header value, Stripe secret value, webhook signing secret value, provider target metadata, raw provider body, raw comment evidence, browser storage payload, or handoff payload value is recorded.

## Inspected Inputs

- `task.md`
- `docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md`
- `docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md`
- `docs/active/COMMENT_TRANSLATOR_SECURITY_PRIVACY_FINAL_REVIEW.md`
- `docs/active/COMMENT_TRANSLATOR_STRIPE_LIVE_READINESS.md`
- `docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_INTEGRATION_FINAL_QA_PROMOTION_READINESS.md`
- `docs/active/COMMENT_TRANSLATOR_PROVIDER_LEGAL_COPY_REFRESH.md`
- `supabase/migrations/20260601000000_youtube_oauth_credentials.sql`
- Comment Translator session, usage, billing, provider, YouTube OAuth, bounded polling, intake, API route, server action, and UI surfaces under `app/`, `components/comment-translator/`, and `lib/`.

## Current Implementation Summary

| Surface | Current state | Audit classification | Public beta implication |
| --- | --- | --- | --- |
| YouTube OAuth callback and token persistence | Server-only callback/persistence path exists with trusted Supabase adapter, encrypted reference schema, sanitized redirect status, and private-launch gate. Live connect and live exchange are not run. | implemented foundation, gated evidence missing | F1 and F2 must confirm exact approval checklist and live connect/token persistence evidence before public beta access. |
| YouTube OAuth credential table | `youtube_oauth_credentials` migration exists with service-role-only access and token ciphertext reference columns. | implemented schema for OAuth credential references | Useful base, but token-store retention/audit/key rotation and disconnect cleanup remain public blockers. |
| Session start/stop | Server route and server actions use auth, private-launch gate, abuse checks, credential readiness, heartbeat, stop reasons, and browser-safe output. State authority is in-memory. | foundation-only / risky | F3 must add durable active-session/session-history authority before public traffic. |
| Usage ledger and admin aggregates | In-memory ledger records session, provider request estimate, AI estimate, stop categories, and sanitized aggregate metrics. | foundation-only / risky | F4 must add durable writes and enforcement reads; F12 cannot rely on memory-only usage. |
| Entitlement and limits | Free/Paid entitlement shape exists; billing runtime keeps signed webhook and in-memory paid entitlement snapshots. Free lacks the new monthly character cap in durable authority. | foundation-only / risky | F5 must define public Free entitlement resolver including monthly character cap and fail-closed behavior. |
| Private launch and public access | Private launch gate blocks general access. | implemented for current gate | Public beta requires a new release gate decision after P0/F tasks; keep public-release capable as no. |
| Live chat target lookup | Server-only foundation for owned broadcast lookup exists with sanitized output and approval gate. | foundation-only / gated | F6 must wire Start-owned target lookup into active session runtime without browser exposure. |
| Bounded polling | Bounded polling session runtime exists with deterministic adapter, server-only cursor/live target, min interval, empty backoff, and terminal stop mapping. Active-session-only polling wiring is now local/server-only with a default not-run adapter. | foundation-only / gated | F7 wires durable active-session polling ticks and quota/budget stop handoff locally; real `liveChatMessages.list` execution remains approval-gated. |
| Live message normalization | Provider-safe comment payload currently allows basic comment id, timestamp, text, and language hint. Super Chat/sticker/member/system/deleted/banned/ended role/event richness is not represented. | missing | F8 is a required blocker before real public comment intake. |
| Real comments UI | UI still combines mock fixture comments and manual preview rows; session controls call server actions, but feed is not server-owned live/session state. | foundation-only / risky | F9 must replace fixture feed authority and keep private ids/raw provider payloads out of browser state. |
| Translation provider execution | Azure and OpenAI mini server-only providers exist; policy routes Free to Azure and Paid to OpenAI mini with Azure fallback. Provider execution records usage estimates in memory. Live provider execution is approval-gated and not run. | foundation-only / gated | F10 needs approved Free Azure route evidence and durable usage enforcement before public beta. |
| Stop reason UX and usage display | Server stop reasons exist; UI displays session state and usage-like mock quota. Not all Start failure/Stop reasons are proven against real live/session state. | foundation-only | F11 and F12 remain required after durable session/usage wiring. |
| Deletion, retention, attribution | OAuth disconnect revokes credential reference server-side; legal copy covers provider/data posture. There is no public data deletion path, retention job, deleted-message propagation, or consistent source attribution for live comments. | missing | F13 is a public blocker. |
| Creator locked/waitlist path | Current UI has plan/billing entry points and private launch unavailable copy, but not Creator locked cards, waitlist, or click tracking scoped to Free beta. | missing | F14 can be done after core Free session blockers start, without enabling paid access. |
| Final QA/readiness | Prior final QA/security docs exist for earlier roadmap phases. Free beta-specific route/API smoke plan and readiness decision do not exist yet. | missing | F15 closes only after F1-F14 evidence. |

## Free Public Beta P0 Blockers Mapped To F1-F15

| ID | P0 blocker | Current evidence | Required completion shape |
| --- | --- | --- | --- |
| F1 | Live connect smoke preflight must be exact, same-thread, and status-label-only. | OAuth readiness docs exist, but Free beta approval checklist needs repointing to the new integration branch and current env references. | Docs/contract preflight with abort conditions, sanitized evidence shape, and rollback path. |
| F2 | Live OAuth connect, code exchange, and token persistence are not proven. | Callback/persistence runtime exists; live execution is not run. | Approval-gated smoke or blocker record, no token/code output, no browser storage expansion. |
| F3 | Active session/session history are memory-only. | `activeSessionsByOwner` is in-process. | Durable schema/adapter or approved migration plan plus fail-closed reads and rollback. |
| F4 | Usage counters are memory-only and do not enforce monthly character cap durably. | In-memory usage ledger estimates exist. | Durable usage ledger rows, monthly/daily/session counters, quota stop events, and server-owned writes. |
| F5 | Free entitlement resolver is incomplete for public beta limits. | Free entitlement has daily/session/per-minute/active-session limits, but no monthly character cap authority. | Public Free resolver combining time, active-session, per-minute, and monthly character caps with safe fallback. |
| F6 | Owned live target lookup is not wired to public Start. | Foundation command/runtime exists; provider target lookup remains gated/not-run. | Approval-gated server-only target lookup at Start, no liveChatId/provider target output. |
| F7 | Active-session-only polling wiring is local/server-only, but real provider polling is not run. | Deterministic bounded polling runtime exists; route/action wiring now uses a default unavailable/not-run adapter and server-only cursor state. | Active-session-only polling ticks, server-only nextPageToken/live target handling, capped retries, empty chat handling, quota/budget stop handoff; approved live `liveChatMessages.list` evidence remains gated. |
| F8 | Live message normalization is too narrow. | Basic text payload exists. | Normalize text, Super Chat, stickers, member/system/deleted/banned/ended events with dedupe and deletion handling. |
| F9 | User-facing feed is still preview/mock driven. | `CommentTranslatorDock` uses mock snapshot/manual rows for the feed. | Server-owned live/session state replaces fixture authority; browser receives only safe display rows. |
| F10 | Free Azure execution is not public-proven and metering is memory-only. | Azure provider implementation exists with server-only env boundary. | Approval-gated or local deterministic route evidence, bounded batch/retry/cache, provider error degradation, durable usage handoff. |
| F11 | Stop/failure UX is not complete for real YouTube states. | Typed stop reasons exist. | Map disconnected, reconnect-required, no broadcast, disabled/ended/not found, quota, heartbeat, and provider errors to user-readable state. |
| F12 | Usage display does not reflect durable Free beta authority. | UI shows session fields and mock quota scenarios. | Session/day/month usage and remaining limits from server-owned durable counters. |
| F13 | Deletion, retention, deleted-message propagation, and source attribution are missing. | Disconnect invalidates credential references; legal copy records data posture. | Data deletion path, retention job, OAuth disconnect cleanup, deleted-message propagation, and `Source: YouTube Live Chat` on relevant live surfaces. |
| F14 | Creator discovery is not represented as locked/waitlist during Free beta. | Billing entry exists, but not Creator locked cards/waitlist/click tracking. | Locked Creator cards, price intent, waitlist and click tracking that do not imply paid access is live. |
| F15 | Free public beta final QA/readiness is not defined for the new sequence. | Earlier roadmap QA docs exist. | Free beta-specific route/API smoke plan, no-secret scan, width checks if UI changed, legal/copy review, rollback, and readiness decision. |

## Creator Closed Beta Blockers Mapped To C1-C12

| ID | Closed beta blocker | Current evidence | Required completion shape |
| --- | --- | --- | --- |
| C1 | Paid entitlement is not durable public authority. | Billing runtime has in-memory paid entitlement snapshot from signed webhook evidence. | Durable paid entitlement rows, active/inactive states, Free degradation, closed-beta gate. |
| C2 | Stripe live closed-beta flow is not executed or registered. | Stripe readiness docs and server-owned webhook route exist. | Approval-gated Product/Price/Checkout/Portal/webhook verification for allowed testers only. |
| C3 | Paid monthly reset and AI/token cap authority is missing. | Paid entitlement shape extends time/per-minute limits only. | Creator usage caps, AI character/token estimates, target-language multiplier, monthly reset, over-limit fallback/stop. |
| C4 | AI natural translation route is not closed-beta proven. | OpenAI mini provider exists with strict JSON parsing and Azure fallback route policy. | Approval-gated provider route evidence, dictionary hook, no provider identifier/secret leakage. |
| C5 | OBS overlay token runtime is missing. | No overlay token issue/revoke/expiry storage found in current translator surfaces. | Session-scoped token issue/revoke/expiry, hashed storage, read-only access. |
| C6 | OBS overlay UI route is missing. | No transparent overlay route for translator live comments. | Overlay route with translated comments, role badges, Super Chat display, original toggle, source attribution. |
| C7 | Moderator share token runtime is missing. | No moderator share token boundary found. | Read-only share token issue/revoke/expiry, hashed storage, future moderator login path. |
| C8 | Moderator share UI is missing. | No read-only moderator translator view found. | Moderator view with translated comments, role badges, priority/deleted state, source attribution. |
| C9 | Custom dictionary storage and provider hook are missing. | Provider request has glossary fields, but no Creator-owned dictionary CRUD/store. | 30-term dictionary with term/replacement/note/language scope and server-owned integration hook. |
| C10 | Priority display is not normalized for live roles/revenue events. | Current UI has simple badges in fixture data; live normalization lacks role/event richness. | Super Chat, sticker, member, moderator, owner priority lanes/filters without revenue analytics. |
| C11 | Creator 7-day history is missing. | Session/usage history are memory-only; no Creator history storage. | 7-day history, retention job, deletion/OAuth-disconnect cleanup, deleted-message propagation, no CSV export. |
| C12 | Closed beta final QA has no task-specific checklist yet. | Earlier Stripe/security/readiness docs exist. | Allowed-tester smoke plan for billing, entitlement, AI cost, overlay/share revoke, dictionary, history retention, no-secret boundaries. |

## Collision Notes

| Boundary | Collision / risk | Safe sequencing note |
| --- | --- | --- |
| Schema | Existing OAuth credential schema is narrowly for token references. Durable session, usage, entitlement, aggregates, abuse buckets, deletion/retention, overlay/share/history, dictionary, and waitlist tracking need separate reviewed schema units. | Do not combine F3/F4/F5/F13/F14 or C1/C5/C7/C9/C11 in one migration PR. Keep remote apply approval-gated. |
| Token store | Credential rows include provider channel metadata for trusted server use. Public browser payloads can receive opaque credential references/status only, and owner/channel values must not be exposed. | F2/F6 should verify status-label-only evidence and keep owner binding/provider target lookup separate. |
| Session | Current active session authority is an in-process map. It cannot enforce one active session across restarts, workers, or parallel requests. | F3 should land before F7/F9 so polling and feed state have durable ownership. |
| Usage | In-memory ledger can estimate provider/AI usage but cannot be public enforcement authority or monthly reset source. | F4 should precede F10/F12; F5 should define monthly character cap before UI claims remaining usage. |
| Entitlement | Billing runtime can represent Free/Paid, but durable paid/free authority is not in place and Free monthly cap is missing. | F5 handles public Free; C1/C2 remain closed-beta paid blockers after Free beta stabilizes. |
| Browser-readable payloads | UI currently shows sanitized credential/session metadata and mock comments. Real live feed must not add liveChatId, provider target metadata, owner/provider ids, raw provider payloads, tokens, or handoff payload material. | F9 should define a safe display row shape before replacing the mock feed. |
| Private launch / public beta gate | Existing private launch gate intentionally blocks general users. | Do not flip release gates in P0/F tasks until F15 final readiness and release owner approval. |

## YouTube API, OAuth, Retention, And Source Attribution Blockers

- OAuth: live connect, live authorization code exchange, and live token persistence remain not-run and approval-gated.
- OAuth: token retention/audit/key rotation/account deletion policy still needs implementation-level review beyond the existing credential-reference schema.
- OAuth: disconnect currently invalidates credential references, but public deletion flow and cleanup/retention job are not implemented.
- YouTube API: owner verification, owned broadcast lookup, and live chat target lookup must remain server-only and run only after explicit Start approval gates.
- YouTube API: `liveBroadcasts.list` target lookup foundation exists, but Start wiring and public user failure states for no live broadcast, disabled chat, live streaming disabled, ended, and not found remain incomplete.
- YouTube API: `liveChatMessages.list` polling foundation and local F7 active-session-only wiring exist, but actual provider polling, deployed server-owned cursor durability across restarts, normalization/UI feed wiring, and approved live evidence remain not public-wired.
- YouTube API: message normalization must include deleted/banned/ended events and role/revenue-adjacent display classes without creating revenue analytics in Free beta.
- Retention: raw comment logging is documented as disabled by default, but durable retention/deletion mechanics for live comments, session history, usage ledger, and deleted-message propagation are not implemented.
- Source attribution: relevant live surfaces must display `Source: YouTube Live Chat`; current preview/manual/fixture feed does not prove this for real live comments.

## Recommended First 2-3 Day Order

1. F1: OAuth live connect smoke preflight.
   - Reason: F2 is gated and operator-local. A precise approval checklist and sanitized evidence shape prevents accidental token/code output and avoids mixing live execution into implementation PRs.
2. F3: Durable session schema and adapter.
   - Reason: F7 polling, F9 real feed, F11 stop UX, and F12 usage display need a durable active-session authority. Doing this before live provider work reduces collision risk.
3. F4 and F5 as a paired sequence, still separate PRs.
   - Reason: durable usage counters and Free entitlement resolver define the public enforcement contract, including the monthly character cap. F10 provider execution and F12 usage UI should not be trusted before these are stable.

After those are in review, prepare F2 only when same-thread approval is available. Then continue F6/F7/F8/F9/F10 in that order so live target lookup, bounded polling, normalization, UI feed authority, and Azure execution do not cross ownership boundaries.

## Audit Decision

P0-0 completion criteria are satisfied for docs/content inspection. The repo has substantial server-only foundations from earlier roadmap work, but Free public beta is blocked by durable session/usage/entitlement authority, live OAuth evidence, live YouTube target/polling wiring, real live feed replacement, retention/deletion/source attribution, and Free beta final QA.

Next safe action: start F1 in a separate task PR targeting `codex/comment-translator-free-public-beta-integration`. Keep all live/OAuth/provider/remote/Stripe actions blocked until same-thread ready preflight, sanitized output review, and explicit in-thread approval are present.
