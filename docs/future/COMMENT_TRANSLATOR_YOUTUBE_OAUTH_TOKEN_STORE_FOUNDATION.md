# Kuro Live Comment Translator YouTube OAuth Token Store Foundation

Status: server-only design contract slice for `codex/comment-translator-preview`.

This note defines the YouTube OAuth consent, callback, encrypted token store, and token resolver runtime responsibilities. It does not implement OAuth routes, token exchange, token persistence, token refresh, revocation, schema changes, Google API live calls, UI changes, provider changes, or quota writes.

## Scope

- Add a server-only foundation module for YouTube OAuth consent and callback responsibility.
- Keep the only scope candidate at `https://www.googleapis.com/auth/youtube.readonly`.
- Keep OAuth access token and refresh token values out of client components, fixtures, task docs, PR body, localStorage, and IndexedDB.
- Keep the token resolver runtime aligned with `youtubeTokenReferenceResolverContract`: callers use a credential reference and receive only a server fetch authorization binding.
- Document the encrypted token store blockers before any schema, key, refresh, revocation, audit, or retention implementation exists.
- Keep `youtubeGoogleApiSafeLiveSmokePolicy` as not run in this slice.
- No Supabase schema, migration, RLS policy, storage key, IndexedDB key, localStorage key, or handoff payload changes.
- No direct provider import between YouTube OAuth/token modules and translation provider modules.

## Boundary Module

The boundary module is `lib/comment-translator-youtube-oauth-token-store-foundation.ts` and starts with `import "server-only";`.

The exported contract is `youtubeOAuthTokenStoreFoundationContract`. Its stage is `design-contract-only`.

The module owns four design boundaries:

1. OAuth consent intent and state reference shape.
2. OAuth callback validation shape before server token exchange.
3. Encrypted token store blocker list.
4. Token resolver runtime contract that returns references, not token values.

The module imports the previous adapter policy constants so this slice stays aligned with `youtubeGoogleApiSafeLiveSmokePolicy`, `youtubeEncryptedTokenStoreDesignPolicy`, and `youtubeTokenReferenceResolverContract`.

## OAuth Consent

OAuth consent is a future server route handler responsibility. The client component can render a connection state later, but it must not construct Google API clients, exchange authorization codes, or read token material.

Consent draft fields are references only:

- state reference id
- redirect URI reference
- optional owner hint reference
- required scope
- consent prompt intent
- offline access intent

The draft does not produce a token value or refresh token value. It does not make a Google API live call.

## Callback

OAuth callback validation is server-only. The callback foundation checks:

- state reference matches the server expected state reference;
- the OAuth provider did not return an error;
- an authorization code was received by the server callback.

The authorization code itself is not represented as a fixture value in this design. A valid callback returns `ready-for-server-exchange`, but token persistence remains `blocked-on-encrypted-store`.

No callback result may return an OAuth access token or refresh token value.

## Encrypted Token Store Blockers

Encrypted token store implementation is blocked until these items are approved:

| Blocker | Required decision |
|---|---|
| schema approval | Define table ownership, RLS posture, migration path, and rollback. |
| key management | Choose managed secret or KMS handling and rotation. |
| refresh | Define expiry handling, retry limits, and failure states. |
| revocation | Define disconnect behavior and server cleanup. |
| audit | Define allowed audit event fields without token material. |
| retention | Define token lifetime, stale cleanup, and account deletion behavior. |
| safe live smoke | Define the safe test owner account, endpoints, and no-print handling. |

This PR intentionally does not create a schema, migration, RLS policy, encrypted token store implementation, token refresh runtime, revocation runtime, or audit writer.

## Token Resolver Runtime

The future token resolver runtime accepts `credentialReferenceId` and the YouTube read-only scope. It may later obtain token material inside a trusted server boundary, but its public result must stay aligned to the existing token reference resolver contract:

- output token value: `never-returned-by-design`
- output refresh token value: `never-returned-by-design`
- authorization binding: `server-fetch-only`
- provider coupling: forbidden direct import or call
- quota write: not implemented

Owner verification, owned broadcast lookup, Live Chat polling, and sanitized comment bridge remain owned by the YouTube runtime foundation and adapter. They are not directly coupled to the translation provider module.

## Safe Live Smoke

Safe live Google API smoke is not run in this slice.

The required conditions remain:

- explicit user approval for a safe test YouTube owner account;
- server-only token resolver implementation that can obtain token material without returning it to callers;
- encrypted server token store implemented and reviewed without hidden schema changes;
- read-only YouTube OAuth scope only;
- bounded live smoke plan for `channels.list`, `liveBroadcasts.list`, and one `liveChatMessages.list` step;
- no OAuth token value in client components, fixtures, task docs, PR body, localStorage, or IndexedDB.

Unchecked scope must be recorded in `task.md` and the PR body.

## Runtime Non-Goals

- No OAuth token persistence.
- No token refresh.
- No token revocation.
- No encrypted token store implementation.
- No Google API live call.
- No safe live YouTube login, OAuth, owner verification, or Live Chat polling smoke.
- No client component Google API call.
- No client component provider call.
- No polling runtime change.
- No DeepL provider prototype change.
- No MockTranslationProvider change.
- No Manual / Paste Input MVP change.
- No interactive shell change.
- No quota write.
- No billing integration.
- No Supabase schema.
- No migration.
- No RLS policy.
- No localStorage.
- No IndexedDB.
- No direct provider import.

## Contract

The contract script is `scripts/comment-translator-youtube-oauth-token-store-foundation-contract.mjs`.

It verifies:

- the server-only OAuth token store foundation module exists;
- consent and callback responsibilities are references only;
- token values are never produced or returned by the design;
- encrypted token store blockers are explicit;
- safe live smoke is not run in this slice;
- provider modules, client UI, route shell, and fixtures do not import OAuth/token store runtime;
- storage, Supabase, migration, RLS, quota, billing, and handoff paths remain unchanged.
