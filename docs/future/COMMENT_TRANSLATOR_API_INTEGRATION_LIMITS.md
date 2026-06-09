# Comment Translator API Integration Limits

## Purpose

This note records the future Kuro Live Comment Translator policy for YouTube / Twitch integration, provider quota, AI translation cost, session limits, and language filtering.

It is design guidance only. It does not approve live/provider execution, schema changes, billing implementation, background monitoring, or UI wiring.

## Current Assumptions

- A connected provider account only stores server-side credential metadata. It does not start comment intake by itself.
- API and AI usage starts only after the user opens `/tools/comment-translator` and explicitly starts a translation session.
- The initial release should avoid background monitoring. A user who connected Google or Twitch must not consume provider quota just because they later start streaming.
- The service owner should treat YouTube quota, Twitch rate limits, and AI API cost as shared service resources.
- Provider token values, owner user id values, provider channel id values, liveChatId values, service role keys, and Authorization header values remain server-only and never appear in docs, UI, browser storage, logs, or handoff payloads.

## YouTube Integration Model

- Users authorize YouTube through OAuth. The user grants access to their channel data; the service's Google Cloud project consumes YouTube Data API quota.
- The normal user flow should ask for YouTube connection, not manual channel ID entry.
- After OAuth, a server-only owner/channel check can confirm the connected channel with sanitized metadata.
- The translator session performs Live Chat target lookup only when a user starts the tool session.
- `liveChatMessages.list` polling consumes quota per API request, not per individual comment. One response can include zero, one, or multiple messages.
- The client must respect YouTube's returned `pollingIntervalMillis`; polling faster than the returned interval is out of scope for the initial release.
- `liveChatMessages.streamList` may be evaluated later as a quota-efficiency improvement, after the bounded `list` path is proven.

## Twitch Integration Model

- Users authorize Twitch through OAuth. Twitch API usage is governed by rate limits rather than a YouTube-style daily quota.
- Twitch access token values remain server-only. UI should expose only sanitized connection state.
- Avoid repeated Helix polling when EventSub or chat connection patterns can provide the needed events more efficiently.
- Twitch limits should still be tracked per user and globally because HTTP 429 can interrupt the shared service experience.

## Session Lifecycle

- `connected` means the provider credential exists and is usable after server-side checks.
- `active translation session` means the user has opened `/tools/comment-translator` and clicked start.
- A session should end on explicit stop, stream end, browser close, heartbeat timeout, auth failure, quota budget exhaustion, or provider terminal error.
- Initial release should use at most one active session per user.
- Long-running sessions should require periodic confirmation before continuing beyond the configured session limit.

## Free And Paid Limits

Initial conservative limits:

- Free / trial:
  - 30 minutes per day.
  - 30 minutes per session.
  - 1 active session.
  - Minimum YouTube polling interval of 10-15 seconds, also respecting `pollingIntervalMillis`.
  - 30 translated messages per minute.
- Paid:
  - 2-4 hours per day.
  - Up to 2 hours per session.
  - 1 active session by default; higher tiers may allow 2.
  - Minimum YouTube polling interval of 10 seconds, also respecting `pollingIntervalMillis`.
  - 100 translated messages per minute, subject to global quota and AI budget.

These limits should be product defaults, not hard commitments. They can change after measuring real quota and AI cost.

## YouTube Quota Budget

- Track estimated YouTube request count / units per active session, per user, and globally.
- Stop new YouTube sessions when the global daily budget reaches a safety threshold such as 70-80%.
- Target lookup should run once at session start unless the target becomes invalid or the user explicitly restarts.
- Empty chat periods should back off where safe.
- Ended streams should stop polling immediately.
- Failed requests can still consume quota, so repeated retry loops must be capped.

Example estimate:

```text
10 second polling = 6 requests per minute
2 hour session = 720 requests
15 concurrent 2 hour sessions = 10,800 requests
```

This can exceed a default 10,000-unit daily budget if the relevant method costs 1 unit per request, before other checks, failures, and pagination.

## AI API Cost Controls

- Do not send every raw comment directly to the AI API.
- Batch eligible comments over short windows.
- Skip emoji-only, URL-only, symbol-only, duplicate, very short, and target-language comments.
- Cache repeated translations when possible.
- Track translated messages, translated characters, and estimated AI cost per session and per day.
- Apply per-minute caps and degrade gracefully by skipping lower-priority comments under load.

## Language Selection And Filtering

- Initial release should translate only user-selected source languages into the selected target language.
- For Japanese target usage, Japanese-dominant mixed comments should usually be skipped.
- Mixed comments should be classified by dominant language, not by whether they contain any foreign word.
- If confidence is low, prefer skipping translation to avoid unnecessary AI cost.
- Advanced options such as "translate comments that include Japanese" can be added later.

Examples for Japanese target:

```text
あなたはpowerがある -> skip as Japanese-dominant
this stream is めっちゃ fun -> translate if English-dominant
hello こんにちは -> skip as short mixed greeting
今日は Apex scrim? -> skip as Japanese-dominant with terms
Can you explain that in Japanese? -> translate
```

## Out Of Scope For Initial Release

- Background provider monitoring after account connection.
- Automatic session start when a connected user begins streaming.
- Manual channel ID entry as the default flow.
- User-provided Google Cloud projects or OAuth clients.
- Broad polling loops without session limits.
- Billing enforcement, quota writes, or provider usage charging.
- Translation of all languages by default.
- Client storage of provider identifiers or tokens.

## Open Questions

- Whether `liveChatMessages.streamList` should replace or supplement `liveChatMessages.list` after the safe bounded smoke path is proven.
- Exact free / paid minute and message caps after real usage measurement.
- Whether paid tiers should support background monitoring as a separate opt-in feature.
- Whether Twitch should use EventSub, IRC/chat connection, Helix polling, or a hybrid path for the first implementation.
