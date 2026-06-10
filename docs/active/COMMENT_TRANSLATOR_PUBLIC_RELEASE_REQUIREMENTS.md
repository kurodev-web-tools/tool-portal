# Kuro Live Comment Translator Public Release Requirements

Status: canonical public-release requirements for the current roadmap.

This document consolidates the public API/limits draft decisions recorded in `task.md` with the existing future notes. It is requirements documentation only. It does not approve runtime, UI, live/provider execution, token renewal, quota writes, billing enforcement, browser storage changes, or handoff payload changes.

## Release Goal

Kuro Live Comment Translator is public-release capable when the roadmap tasks in `task.md` are implemented, verified, merged, and any required deployed or live smoke evidence is recorded with sanitized output only.

The initial public release should be YouTube-first, bounded by explicit user sessions, and safe for shared provider quota and AI translation cost.

## Initial Product Decisions

- Free plan limits: `30 min/day/user`, `30 min/session`, `1 active session/user`, and `30 translated messages/min`.
- Paid plan: Free/Paid plan concepts, server-owned entitlements, and limit enforcement belong to the public-release path. Stripe integration stays late in the roadmap after the core tool is release-ready.
- Provider scope: YouTube ships first. Twitch is future unless explicitly approved for public-release scope.
- Account integration route: `/account/integrations`.
- Source languages: source means translation input language. Initial candidates are JA / EN / KR / CN.
- Target languages: target means translation output language. Initial candidates are JA / EN.
- Source and target cannot be the same. UI and server validation must both reject same-language pairs.
- Raw text logging is off by default. Diagnostic logging must be short-lived and sanitized.

## Session Start And Stop

Provider API and AI translation usage must start only after a signed-in user explicitly starts a translation session from `/tools/comment-translator`. Connecting a provider account must not start monitoring, polling, translation, or quota consumption by itself.

A public translation session must be server-owned and bounded:

- at most one active session per user for the initial release;
- explicit start and explicit stop controls;
- heartbeat or equivalent liveness tracking;
- configured daily, per-session, and per-minute limits;
- sanitized session state returned to the UI.

Required stop conditions:

- user stop;
- stream ended or unavailable;
- browser close, disconnect, or missing heartbeat;
- auth, token, or reconnect-required state;
- daily or session time limit reached;
- translated-message cap reached;
- provider quota or global budget safety stop;
- AI budget or translation provider limit stop;
- terminal provider or policy error.

## Provider Quota Policy

YouTube API quota is a shared service resource owned by the service operator. The app must estimate and record provider request usage per active session, per user, and globally before public launch enforcement is considered complete.

Public requirements:

- Live Chat target lookup runs only when a user starts a session.
- Target lookup should run once per session unless the target becomes invalid or the user explicitly restarts.
- `liveChatId` and provider target metadata remain server-only/operator-local and must not appear in UI, docs, PR bodies, logs, browser storage, or handoff payloads.
- Failed provider requests can still cost quota, so retry loops must be capped.
- New or ongoing sessions must stop or be refused when global provider budget reaches a configured safety threshold.
- Provider usage charging and paid-priority scheduling are excluded from the initial release.

## YouTube Polling Policy

The initial public path uses bounded YouTube Live Chat polling. It must not become an uncontrolled loop.

Required behavior:

- use `liveChatMessages.list` only inside an active server-owned session;
- respect the returned `pollingIntervalMillis`;
- apply a project minimum polling interval;
- use bounded retries with jitter/backoff for recoverable failures;
- back off during empty chat periods where safe;
- stop immediately on terminal states such as ended, disabled, not found, or owner verification failed;
- keep polling cursor and `liveChatId` server-session-only;
- evaluate `liveChatMessages.streamList` only as a later optimization after the bounded list path is proven.

## AI Cost Controls

AI translation cost must be reduced before provider execution:

- send only eligible comments to the translation provider;
- batch eligible comments over short windows where practical;
- dedupe repeated comments;
- cache repeated translations when possible;
- cap translated messages per minute;
- track translated message count, translated characters, and estimated AI cost per session and per day;
- skip lower-priority comments under load instead of building an unbounded delayed queue.

## Filtering And Language Policy

The initial release translates selected source languages into a selected target language. It must not translate all languages by default.

Filtering requirements:

- skip same-language source/target selections at UI and server boundaries;
- skip target-language comments;
- skip unselected-source-language comments;
- skip emoji-only, URL-only, symbol-only, duplicate, too-short, and low-confidence comments;
- classify mixed comments by dominant language;
- prefer skipping low-confidence or target-dominant comments over spending AI budget;
- keep Spanish and all-language auto mode out of the initial release unless explicitly approved.

Cache and dedupe keys must exclude token values, provider target identifiers, polling cursors, owner identifiers, authorization headers, service-role keys, and browser-local handoff material.

## User Usage Display

Public UI must show enough usage state for the user to understand whether they can run a session:

- provider connection/reconnect state;
- active/stopped state;
- elapsed session time;
- daily used and remaining time;
- current per-minute cap state when relevant;
- stop reason and next safe action;
- Free/Paid plan state when entitlement enforcement exists.

The UI must never display OAuth token values, refresh token values, authorization codes, owner user id values, provider channel id values, `liveChatId`, service-role key values, Authorization header values, or provider target metadata.

## Admin Metrics

The service operator needs sanitized operational visibility before public launch:

- active session count;
- per-user daily/session minutes;
- translated message and character counts;
- estimated AI cost;
- estimated YouTube request count;
- quota, budget, and cap stop counts;
- provider and translation error classes;
- heartbeat timeout and reconnect-required counts.

Admin views and exports must remain aggregate, reference-only, or sanitized as appropriate. They must not expose credential values, provider target identifiers, raw authorization data, or raw comment text by default.

## Sensitive Data Boundaries

The following values must not be displayed, requested, stored in docs, committed, logged, placed in PR text, written to browser storage, or included in handoff payloads:

- OAuth access token values;
- OAuth refresh token values;
- authorization code values;
- owner user id values;
- provider channel id values;
- `liveChatId` values;
- service-role key values;
- Authorization header values;
- private credentials and managed secret values;
- provider target metadata.

Allowed client-readable state is limited to sanitized connection/session/usage metadata and opaque non-secret references where a contract explicitly allows them.

## Initial-Release Exclusions

- Background provider monitoring after account connection.
- Automatic session start when a connected user begins streaming.
- Multiple concurrent streams per user.
- User-provided Google Cloud project or OAuth client.
- Manual channel ID entry as the default flow.
- Unlimited polling or broad polling loops.
- Provider usage charging and paid-priority scheduling.
- Translation of all languages by default.
- Raw text logging by default.
- Client storage of token, credential, provider target, owner, channel, `liveChatId`, service-role, Authorization header, or provider target metadata.
- Delayed translation queues for skipped comments.
- Twitch runtime before YouTube public path is proven.

## Post-Public Candidates

- Advanced paid tiers and paid-priority scheduling.
- Provider-usage charging if product policy later allows it.
- Twitch runtime and EventSub/chat integration.
- `liveChatMessages.streamList` evaluation.
- Background monitoring and automatic session start.
- Multiple concurrent streams per user.
- Additional source languages and advanced mixed-language options.
- User-provided Google Cloud project or OAuth client support.
- User glossary, moderation terms, and stream-specific settings after account, privacy, and quota boundaries are complete.

## Source Notes

This document is the active public-release requirements source. The `docs/future` files remain retained as design, contract, and historical evidence because they include implementation-specific blocker history and boundary details that are only partially superseded here.
