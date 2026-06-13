# Kuro Live Comment Translator YouTube Input Boundary Design

Status: design / type boundary / contract slice for `codex/comment-translator-preview`.

This note defines the YouTube OAuth, owner verification, and Live Chat polling input boundary. It does not implement OAuth runtime, Google API calls, Live Chat polling runtime, owner verification runtime, route handlers, server actions, UI changes, storage changes, or translation provider changes.

## Scope

- Add a server-only pure type boundary for the YouTube input module.
- Keep OAuth access token and refresh token material out of client components, fixtures, task docs, PR body, localStorage, and IndexedDB.
- Separate owner verification from broadcaster read-only dock rendering.
- Define Live Chat polling cursor, rate limit, backoff, and retry semantics.
- Define the minimal comment payload that may later be handed to a translation provider bridge.
- Keep provider modules and YouTube input modules from directly importing or calling each other.
- No storage key, IndexedDB key, localStorage key, handoff payload, Supabase schema, migration, or RLS policy changes.

## Boundary Module

The boundary module is `lib/comment-translator-youtube-input-boundary.ts` and starts with `import "server-only";`.

The exported contract is `youtubeInputBoundaryContract`. Its stage is `design-contract-only`, so all runtime fields remain `not-implemented` or future-owned.

The YouTube input boundary is responsible for platform input concerns only:

1. OAuth consent and token handling.
2. Owner verification and owned broadcast lookup.
3. Broadcaster read-only dock authorization state.
4. Live Chat polling cursor and retry policy.
5. Sanitizing live comments into a provider-safe payload shape.
6. Short-lived diagnostic log and cache key contact rules.

The translation provider boundary remains separate. A later server orchestrator may bridge sanitized comments into provider requests, but neither module should directly import or call the other.

No direct provider import is allowed between the YouTube input module and translation provider modules.

## OAuth And Token Boundary

The initial scope candidate is `https://www.googleapis.com/auth/youtube.readonly`. It is documented as an authorization scope for `liveBroadcasts.list`, which is the planned owner-owned broadcast discovery call for this design slice.

Tokens are server-only material:

- No OAuth access token in client components.
- No refresh token in client components.
- No OAuth access token in fixtures, task docs, PR body, localStorage, or IndexedDB.
- No refresh token in fixtures, task docs, PR body, localStorage, or IndexedDB.
- No polling cursor in provider requests, task docs, PR body, localStorage, or IndexedDB.
- Future persistence must be a server-side encrypted token store. This slice does not create that store.
- Raw OAuth state is not provider payload and is not cache key material.

This slice does not add OAuth routes, callbacks, session storage, token refresh, revocation, or consent screens.

## Owner Verification And Read-Only Dock

Owner verification is a server-owned decision. The client component can render an approved state, blocked state, or unavailable state, but it cannot decide ownership.

Planned evidence for a future runtime:

- Use an authenticated owned broadcast lookup, represented here as `liveBroadcasts.list` with `mine=true`.
- Use the owned broadcast's `snippet.liveChatId` as the source of the Live Chat input boundary.
- Treat insufficient permissions, live streaming not enabled, missing live chat, or non-owned broadcast as blocked / unavailable states.

The broadcaster read-only dock is deliberately narrower than a viewer overlay or moderation tool:

- No viewer-facing overlay.
- No comment mutation.
- No moderation mutation.
- No auto reply.
- No automatic posting.
- No channel secret or viewer identifier in downstream payloads.

## Live Chat Polling Policy

The future polling runtime should follow the YouTube response boundary:

- Use `nextPageToken` as the polling cursor.
- Use `pollingIntervalMillis` as the base wait before requesting more results.
- Treat the first request as the most recent available window, not a complete historical archive.
- Treat `rateLimitExceeded` as recoverable backoff.
- Use bounded retry with jitter for transient network failures.
- Stop polling on terminal states such as ended, disabled, not found, or owner verification failed.

The polling cursor stays server-session-only. It is not written to localStorage, IndexedDB, task docs, PR body, fixtures, provider request payloads, or cache key material.

This slice does not implement the polling loop, `fetch`, Google API client usage, streamList, WebSocket, EventSource, or any network runtime.

## Provider-Safe Comment Payload

Only this minimal shape may cross toward the future translation provider bridge:

```ts
type YouTubeProviderSafeCommentPayload = {
  commentId: string;
  publishedAt: string;
  text: string;
  platformLanguageHint: string | null;
};
```

Allowed material:

- comment id
- published time
- text
- detected platform language hint

Forbidden material:

- token
- OAuth access token
- refresh token
- channel secret
- viewer identifier
- raw OAuth state
- polling cursor
- live chat id unless a future server orchestrator proves it is needed outside provider requests

The provider request bridge should be owned by a future server orchestrator. The YouTube input module should produce sanitized platform input. The provider module should translate a generic provider request. Neither side should import the other.

## Diagnostic Log And PII Minimization

Diagnostic logs are short-lived diagnostic-only events.

Allowed diagnostic event fields:

- request id
- poll attempt id
- poll outcome
- message count
- retry after milliseconds
- owner verification status

Forbidden diagnostic event fields:

- OAuth access token
- refresh token
- channel secret
- viewer identifier
- raw OAuth state
- polling cursor
- raw comment text by default

PII minimization rule: exclude author, channel, viewer, token, raw OAuth state, and cursor material from provider diagnostics and cache key material. Raw text logging remains disabled by default.

## Cache Key Material Contact

The YouTube input boundary can contact cache key design only through sanitized, non-secret material:

- normalized comment text hash
- published time bucket
- source language hint
- target language
- moderation policy version

Excluded material:

- OAuth token
- refresh token
- channel secret
- viewer identifier
- raw OAuth state
- polling cursor

This design does not add or change any cache storage key.

## Runtime Non-Goals

No runtime implementation is included:

- No YouTube OAuth runtime.
- No Google API call.
- No Live Chat polling implementation.
- No owner verification implementation.
- No client component provider call.
- No client component Google API call.
- No server action or route handler public API.
- No DeepL, OpenAI, Gemini, or translation provider change.
- No Stripe checkout, billing, quota enforcement, or paid plan enforcement.
- No GA4 or cookie consent.
- No storage key, IndexedDB key, localStorage key, Supabase schema, migration, RLS policy, or handoff payload change.
- No Supabase schema change.

## Contract

The contract script is `scripts/comment-translator-youtube-input-boundary-contract.mjs`.

It verifies:

- the server-only YouTube input boundary module exists;
- OAuth tokens are server-only and forbidden from client/storage/docs/fixtures;
- owner-only read-only dock responsibility is server-owned;
- polling cursor, `pollingIntervalMillis`, `rateLimitExceeded`, backoff, and retry semantics are explicit;
- provider-safe comment payload is minimal;
- OAuth/token/channel/viewer/state/cursor material is forbidden from provider payloads;
- diagnostic logging is short-lived and PII-minimized;
- cache key contact excludes token and cursor material;
- provider modules and YouTube input modules do not directly import each other;
- UI, route shell, mock fixture, storage, Supabase, migration, RLS, and handoff payload paths remain unchanged.

## References Checked

- YouTube Live Streaming API `liveBroadcasts.list`: documents the `youtube.readonly` authorization scope and `mine=true` owned broadcast filter.
- YouTube Live Streaming API `liveChatMessages.list`: documents `nextPageToken`, `pollingIntervalMillis`, and `rateLimitExceeded`.
