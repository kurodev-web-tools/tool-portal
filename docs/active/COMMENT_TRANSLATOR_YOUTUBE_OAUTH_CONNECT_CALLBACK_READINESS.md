# Kuro Live Comment Translator YouTube OAuth Connect / Callback Readiness

Status: Task 2 server-only readiness contract for `codex/comment-translator-youtube-oauth-integration`.

This document defines the exact connect and callback contract before the OAuth routes/actions are implemented. It does not contact Google OAuth, does not redirect a browser to Google, does not exchange an authorization code, and does not create or persist credentials.

## Scope

- Define the future server-only connect and callback route/action shape.
- Define state, CSRF, and account-session ownership rules.
- Define the redirect allowlist and sanitized callback outcomes.
- Define env reference names only, without reading or recording values.
- Define the rollback/disable gate.
- Define the exact no-live-connect execution boundary for this task and the next implementation task.

## Route And Action Shape

The future connect path is a server action or route handler invoked from account-owned UI. It may prepare an OAuth authorization request only after the caller is authenticated and private-launch access is allowed.

Allowed connect request metadata:

- action intent: `connect` or `reconnect`
- provider: `youtube`
- required scope label: `youtube.readonly`
- account session status label
- private-launch access status label
- redirect intent label from the redirect allowlist
- server-generated state reference label
- server-owned CSRF/session binding status label
- env readiness status labels by reference name

Allowed connect response metadata:

- same-origin redirect to an allowlisted local path
- sanitized integration status label
- no credential value, OAuth value, owner value, provider channel value, live chat value, provider target metadata, browser storage payload, or handoff payload

The future callback path is a server-only route handler. It may validate OAuth callback metadata and decide whether a later task can exchange an authorization code. This task records the shape only.

Allowed callback request metadata:

- provider: `youtube`
- state presence/match status label
- authorization-code presence boolean only, never the value
- sanitized OAuth error status label
- account session ownership status label
- callback redirect URI reference label
- rollback/disable gate status label

Allowed callback response metadata:

- same-origin redirect to `/account/integrations` with an allowlisted sanitized `integration` status
- server-only decision label such as `ready-for-server-exchange`, `state-mismatch`, `oauth-denied`, `env-missing`, `disabled`, `sign-in-required`, or `private-launch-gated`
- no token exchange result and no credential creation result in this task

## State, CSRF, And Session Ownership

- The connect handler must create a high-entropy state value inside a server-only boundary.
- Client-readable output may contain only a state reference label, never the state value.
- The state binding must include provider, intent, account session ownership, issue time, expiry, and redirect intent.
- The state store must be server-owned. An HttpOnly, Secure, SameSite cookie or server-side session store is acceptable; localStorage, sessionStorage, IndexedDB, URL fragments, and handoff payloads are forbidden.
- The callback must validate that the returned state matches the server-owned expected state for the same account session and provider.
- State must be one-time-use. Reuse, expiry, mismatch, missing session, or provider mismatch must fail closed with a sanitized status label.
- The callback must not trust user-supplied owner identifiers, provider channel identifiers, or provider target metadata.

## Redirect Allowlist

Connect may only accept redirect intent labels for these local destinations:

- `/account/integrations`
- `/tools/comment-translator`

Callback may only redirect to:

- `/account/integrations?integration=<sanitized-status>`

Authentication redirects may use:

- `/login?next=/account/integrations`

Rules:

- Absolute external redirects are forbidden.
- Protocol-relative redirects are forbidden.
- Callback query output must use an allowlisted sanitized status label only.
- OAuth provider callback `error` values must be mapped to internal labels before redirecting.
- No raw callback query string, authorization code, state value, owner identifier, provider channel identifier, live chat identifier, provider target metadata, or provider response body may be reflected to the browser.

## Env Reference Names

Task 2 documents reference names only. It does not read, print, validate, or require values.

Required future connect/callback references:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `YOUTUBE_OAUTH_STATE_SECRET`
- `NEXT_PUBLIC_SITE_URL`

Existing rollback/credential-resolution reference:

- `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED`

Optional future allowlist reference:

- `YOUTUBE_OAUTH_REDIRECT_ALLOWED_PATHS`

Env handling rules:

- Missing required references must fail closed before constructing an OAuth redirect.
- Secret-like env values must remain server-only and must not be written to docs, tests, logs, PR body, browser storage, handoff payload, or client-readable payloads.
- Presence checks may record only reference names and sanitized readiness labels.

## Sanitized Error States

Allowed browser-visible integration status labels:

- `youtube-oauth-ready`
- `youtube-oauth-connected`
- `youtube-oauth-reconnect-required`
- `youtube-oauth-disabled`
- `youtube-oauth-env-missing`
- `youtube-oauth-state-missing`
- `youtube-oauth-state-mismatch`
- `youtube-oauth-state-expired`
- `youtube-oauth-denied`
- `youtube-oauth-callback-error`
- `youtube-oauth-private-launch-gated`
- `youtube-oauth-sign-in-required`
- `youtube-oauth-token-store-blocked`

Forbidden browser-visible callback data:

- raw OAuth provider error description
- raw callback query string
- authorization code value
- OAuth access token value
- OAuth refresh token value
- owner user id value
- provider channel id value
- liveChatId value
- service role key value
- Authorization header value
- Stripe secret key value
- webhook signing secret value
- provider target metadata
- browser storage payload
- handoff payload

## Rollback And Disable Gate

- `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED=1` or `true` keeps credential resolution disabled.
- When disabled, connect and callback must fail closed with `youtube-oauth-disabled` or an equivalent sanitized label.
- A disabled gate must prevent OAuth URL construction, callback token exchange, token persistence, credential reference creation, provider target lookup, and live/provider execution.
- Rollback requires no schema migration, remote mutation, deploy/upload, Stripe action, Customer Portal redirect, webhook registration, provider lookup, or live session command in this task.

## Operator Preflight Requirements

Before any later task performs a live Google OAuth connect or YouTube OAuth connect:

1. Same-thread ready preflight must list only reference names and sanitized readiness labels.
2. Sanitized output review must confirm that no forbidden output value can be printed, stored, reflected, or placed in docs/PR body/browser storage/handoff payload.
3. Explicit in-thread approval must name the exact UI action or command and the target environment.
4. The approval must be current for that same thread; prior roadmap approval or this Task 2 document is not approval.

## Exact No-Live-Connect Boundary

Task 2 intentionally does not:

- contact Google OAuth endpoints;
- redirect a browser to Google OAuth;
- exchange an authorization code;
- create or persist OAuth credentials;
- create a credential reference;
- read provider target metadata;
- look up a provider channel;
- look up liveChatId;
- start a translator session;
- call translation provider APIs;
- run live/provider execution;
- run deploy/upload;
- run remote schema migration or remote mutation;
- run Stripe live-mode actions, Customer Portal redirects, billing setting mutation, or webhook registration.

This task is docs/contract-only. Width checks are skipped because no UI, CSS, route behavior, rendered text, browser storage, or visible layout changes are made.

## Verification

Focused contract:

- `node scripts/comment-translator-youtube-oauth-connect-callback-readiness-contract.mjs`

Required closeout checks:

- docs/contract inspection
- changed-files no-secret scan
- `git diff --check`
