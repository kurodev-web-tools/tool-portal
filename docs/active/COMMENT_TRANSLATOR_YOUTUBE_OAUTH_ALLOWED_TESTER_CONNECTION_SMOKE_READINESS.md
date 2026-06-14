# Kuro Live Comment Translator YouTube OAuth Allowed-Tester Connection Smoke Readiness

Status: Task 7 Allowed-tester connection smoke readiness for `codex/comment-translator-youtube-oauth-integration`. Public-release capable: no.

This document prepares the allowed-tester account connection smoke boundary. It does not approve Google OAuth live connect, YouTube OAuth live connect, authorization code exchange, token persistence, provider target lookup, liveChatId lookup, session start smoke, live/provider execution, deploy/upload, remote mutation, remote schema migration, Stripe live-mode action, Customer Portal redirect, webhook registration, or billing setting mutation.

Output policy: sanitized-status-labels-only. OAuth access token value, OAuth refresh token value, authorization code value, owner user id value, provider channel id value, liveChatId value, service role key value, Authorization header value, Stripe secret key value, webhook signing secret value, provider target metadata, browser storage payload, and handoff payload are not requested, displayed, stored, or recorded.

## Completion Decision

Completion decision: readiness/blocker complete for Task 7.

If approval is not present, completion is blocker/readiness only. This branch records the exact preflight, sanitized output checklist, evidence template, negative checks, and approval boundary required before an allowed tester performs the live account connection flow.

If approval is granted in the same thread, evidence may record status labels only. It must not record OAuth values, authorization code values, token values, private identifiers, provider target metadata, browser storage payloads, or handoff payloads.

Current execution state:

- Google OAuth live connect: not-run
- YouTube OAuth live connect: not-run
- live authorization code exchange: not-run
- live token persistence: not-run
- provider target lookup: not-run
- liveChatId lookup: not-run
- session start smoke: not-run
- live/provider execution: not-run
- background monitoring from connection alone: not-started
- deploy/upload: not-run
- remote mutation: not-run
- remote schema migration: not-run

No provider target lookup.
No liveChatId lookup.
No session start smoke.
No live/provider execution.

## Same-Thread Ready Preflight

Before any allowed-tester connection smoke can run, the same thread must present a ready preflight with reference names and sanitized status labels only.

Required readiness checks:

- operator confirms target environment label without printing private target values
- authenticated allowed-tester account session status label
- private-launch access status label
- account integrations route readiness label
- connect/reconnect action readiness label
- callback route readiness label
- state/CSRF binding readiness label
- trusted credential status read readiness label
- emergency disable status label for `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED`
- required Google OAuth env reference readiness labels
- output redaction readiness label
- no provider target lookup readiness label
- no liveChatId lookup readiness label
- no session start smoke readiness label
- no live/provider execution readiness label

Allowed preflight labels:

- `preflight-ready`
- `blocked-missing-env`
- `blocked-disabled`
- `blocked-no-approval`
- `blocked-no-allowed-tester-session`
- `blocked-private-launch-gated`
- `blocked-output-review-incomplete`
- `not-run`

The preflight must not ask the operator to paste secret values. It may ask the operator to set required env values locally by reference name only.

## Exact Approval Boundary

This Task 7 branch is not approval to run OAuth connection. If the release owner later approves execution in this same thread, the approval must name one exact UI action and target environment.

Allowed approval target:

- exact UI action: allowed tester clicks the YouTube connect or reconnect control from `/account/integrations`, follows the Google OAuth consent flow, and returns to the application callback once.

Forbidden under that approval unless separately approved:

- provider target lookup
- liveChatId lookup
- session start smoke
- translation provider API execution
- live/provider execution
- deploy/upload
- remote mutation
- remote schema migration
- Stripe live-mode action
- Customer Portal redirect
- webhook registration

The connection smoke must stop after the sanitized connection status is observed. No background monitoring starts from connection alone.

## Sanitized Output Checklist

Before execution approval can be used, the operator must confirm that planned output and recording locations are restricted to:

- status labels
- boolean readiness labels
- route/action names
- env reference names
- timestamp labels if needed
- `not-run` labels for gated actions

Forbidden evidence/output:

- OAuth access token value
- OAuth refresh token value
- authorization code value
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
- raw callback query string
- provider response body
- account cookie/session payload
- credential reference value

The browser must not be inspected for storage payloads. If a browser storage inspection would be needed to prove a claim, stop and record `blocked-output-review-incomplete` instead.

## Evidence Template

Use this template only after same-thread ready preflight, sanitized output review, and explicit in-thread approval are complete. Values must be labels, never private identifiers.

| Field | Allowed Value Shape |
| --- | --- |
| execution approval | `approved-exact-ui-action` or `blocked-no-approval` |
| preflight status | `preflight-ready`, `blocked-missing-env`, `blocked-disabled`, or another allowed blocker label |
| allowed-tester account session | status label only |
| private-launch access | status label only |
| connect action | `not-run`, `started`, `returned-callback`, or `blocked-*` |
| callback validation | status label only |
| credential persistence | `not-run`, `connection-status-connected`, `connection-status-reconnect-required`, `connection-status-disconnected`, or `blocked-*` |
| account integrations status | `connection-status-connected`, `connection-status-reconnect-required`, `connection-status-disconnected`, `connection-status-unavailable`, or `connection-status-error` |
| background monitoring | `not-started` |
| provider target lookup | `not-run` |
| liveChatId lookup | `not-run` |
| session start smoke | `negative-session-start-not-run` |
| live/provider execution | `not-run` |
| browser storage payload | `not-inspected-not-recorded` |
| handoff payload | `not-created` |

Allowed connection evidence labels:

- `connection-status-connected`
- `connection-status-reconnect-required`
- `connection-status-disconnected`
- `connection-status-unavailable`
- `connection-status-error`
- `blocked-missing-env`
- `blocked-disabled`
- `blocked-no-approval`
- `not-run`

## Negative Checks

Required negative checks before recording completion:

- emergency disable: `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED=1` or `true` remains fail closed before connect/callback/token persistence
- missing env: missing OAuth or credential reference env remains fail closed with browser-safe status labels
- non-allowed user: `negative-non-allowed-user-denied`
- callback without valid server-owned state: `negative-callback-without-state-denied`
- provider target lookup: `not-run`
- liveChatId lookup: `not-run`
- session start smoke: `negative-session-start-not-run`
- live/provider execution: `not-run`
- background monitoring from connection alone: `not-started`

Emergency disable and missing env/reference states remain fail closed and browser-safe. Their output must use labels such as `blocked-disabled`, `blocked-missing-env`, `youtube-oauth-disabled`, `youtube-oauth-env-missing`, `credential-resolution-disabled`, or `credential-reference-env-missing`.

## Verification

Focused contract:

- `node scripts/comment-translator-youtube-oauth-allowed-tester-connection-smoke-readiness-contract.mjs`

Closeout checks:

- readiness/evidence contract for Task 7
- existing Task 6 tool/session readiness contract if still applicable
- existing Task 5 account status wiring contract if still applicable
- changed-files no-secret scan
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`

Width checks are skipped because this branch changes docs, `task.md`, and a Node contract only. It does not change UI, CSS, rendered text, route behavior, browser storage, or visible layout.

