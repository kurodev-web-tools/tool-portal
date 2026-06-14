# Kuro Live Comment Translator YouTube OAuth Allowed-Tester Session Start Smoke Readiness

Status: Task 8 Allowed-tester session start smoke readiness for `codex/comment-translator-youtube-oauth-integration`. Public-release capable: no.

This document prepares the allowed-tester session start smoke boundary. It does not approve provider target lookup, liveChatId lookup, session start smoke, translation provider API execution, live/provider execution, Google OAuth live connect, YouTube OAuth live connect, live authorization code exchange, live token persistence, deploy/upload, remote mutation, remote schema migration, Stripe live-mode action, Customer Portal redirect, webhook registration, or billing setting mutation.

Output policy: counts/status/stop reasons only. OAuth access token value, OAuth refresh token value, authorization code value, owner user id value, provider channel id value, liveChatId value, service role key value, Authorization header value, Stripe secret key value, webhook signing secret value, provider target metadata, raw comments, browser storage payload, and handoff payload are not requested, displayed, stored, or recorded.

## Completion Decision

Completion decision: readiness/blocker complete for Task 8.

If approval is not present, completion is blocker/readiness only. This branch records the exact preflight, sanitized output checklist, sanitized count/status evidence template, provider/live execution boundary, stop behavior checklist, and explicit blocker handling required before an allowed tester starts the translator session path.

If approval is granted in the same thread, evidence may record counts/status/stop reasons only. It must not record liveChatId, provider target metadata, raw comments, OAuth values, authorization code values, token values, Authorization header values, browser storage payloads, or handoff payloads.

Current execution state:

- provider target lookup: not-run
- liveChatId lookup: not-run
- session start smoke: not-run
- translation provider API execution: not-run
- live/provider execution: not-run
- Google OAuth live connect: not-run
- YouTube OAuth live connect: not-run
- live authorization code exchange: not-run
- live token persistence: not-run
- background monitoring from connection alone: not-started
- deploy/upload: not-run
- remote mutation: not-run
- remote schema migration: not-run

No provider target lookup.
No liveChatId lookup.
No session start smoke.
No live/provider execution.

## Same-Thread Ready Preflight

Before any allowed-tester session start smoke can run, the same thread must present a ready preflight with reference names and sanitized status labels only.

Required session start preflight checks:

- operator confirms target environment label without printing private target values
- authenticated allowed-tester account session status label
- private-launch access status label
- `/tools/comment-translator` route readiness label
- trusted credential status read readiness label
- connected credential readiness label
- session start action readiness label
- session status action readiness label
- stop action readiness label
- heartbeat action readiness label
- billing entitlement status label
- usage/quota/budget readiness label
- emergency disable status label for `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED`
- missing env/reference status label for required server-only env references
- output redaction readiness label
- no provider target lookup readiness label
- no liveChatId lookup readiness label
- no translation provider API execution readiness label
- no live/provider execution readiness label

Allowed preflight labels:

- `preflight-ready`
- `blocked-missing-env`
- `blocked-disabled`
- `blocked-no-approval`
- `blocked-no-allowed-tester-session`
- `blocked-no-connected-credential`
- `blocked-private-launch-gated`
- `blocked-output-review-incomplete`
- `not-run`

The preflight must not ask the operator to paste secret values or private identifiers. It may ask the operator to set required env values locally by reference name only.

## Exact Approval Boundary

This Task 8 branch is not approval to run session start smoke. If the release owner later approves execution in this same thread, the approval must name one exact UI action or command and target environment.

Allowed approval targets:

- exact UI action: an already connected allowed tester opens `/tools/comment-translator/`, presses the translator Start control once, observes sanitized session status, then presses Stop once
- exact command: a future preflight-reviewed local command that invokes the same server-owned session start/status/stop path and prints sanitized counts/status/stop reasons only

Forbidden under that approval unless separately approved:

- provider target lookup
- liveChatId lookup
- translation provider API execution
- live/provider execution
- Google OAuth live connect
- YouTube OAuth live connect
- live authorization code exchange
- live token persistence
- deploy/upload
- remote mutation
- remote schema migration
- Stripe live-mode action
- Customer Portal redirect
- webhook registration

The approved session start smoke must stop after observing sanitized session status and the explicit Stop result. No polling loop, background monitoring, provider target lookup, liveChatId lookup, or translation provider call is included in this approval boundary.

## Provider/Live Execution Boundary

Session start readiness is not provider execution readiness. A connected credential can make session start eligible, but it does not authorize provider target lookup, liveChatId lookup, comment polling, translation provider API execution, or live/provider execution.

Required negative states for this branch:

- provider target lookup: `not-run`
- liveChatId lookup: `not-run`
- session start smoke: `negative-session-start-not-run`
- translation provider API execution: `not-run`
- live/provider execution: `not-run`
- background monitoring from connection alone: `not-started`

No background monitoring starts from connection alone, route render alone, credential status read alone, or status polling alone.

## Sanitized Output Checklist

Before execution approval can be used, the operator must confirm that planned output and recording locations are restricted to:

- status labels
- count fields
- stop reason labels
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
- raw comments
- provider response body
- account cookie/session payload
- credential reference value
- browser storage payload
- handoff payload

The browser must not be inspected for storage payloads. If a browser storage inspection would be needed to prove a claim, stop and record `blocked-output-review-incomplete` instead.

## Evidence Template

Use this template only after same-thread ready preflight, sanitized output review, and explicit in-thread approval are complete. Values must be labels or counts, never private identifiers.

| Field | Allowed Value Shape |
| --- | --- |
| execution approval | `approved-exact-ui-action`, `approved-exact-command`, or `blocked-no-approval` |
| preflight status | `preflight-ready`, `blocked-missing-env`, `blocked-disabled`, or another allowed blocker label |
| allowed-tester account session | status label only |
| private-launch access | status label only |
| connected credential readiness | `ready`, `blocked-no-connected-credential`, `blocked-missing-env`, `blocked-disabled`, or another blocker label |
| session start smoke | `negative-session-start-not-run`, `active`, `stopped`, or `blocked-*` |
| session status | `not-started`, `active`, `stopped`, or `blocked-*` |
| stop result | `not-run`, `stopped`, or `blocked-*` |
| returned comment count | count only, or `not-run` |
| eligible comment count | count only, or `not-run` |
| translated count | count only, or `not-run` |
| skipped count | count only, or `not-run` |
| stop reason | `user-stop`, `reconnect-required`, `session-limit`, `missing-heartbeat`, `session-time-limit`, `provider-quota-stop`, `global-budget-stop`, `ai-budget-stop`, or `null` |
| provider target lookup | `not-run` |
| liveChatId lookup | `not-run` |
| translation provider API execution | `not-run` |
| live/provider execution | `not-run` |
| browser storage payload | `not-inspected-not-recorded` |
| handoff payload | `not-created` |

Allowed evidence labels:

- `preflight-ready`
- `blocked-missing-env`
- `blocked-disabled`
- `blocked-no-approval`
- `blocked-no-allowed-tester-session`
- `blocked-no-connected-credential`
- `blocked-private-launch-gated`
- `blocked-output-review-incomplete`
- `negative-session-start-not-run`
- `not-run`
- `not-started`
- `active`
- `stopped`
- `user-stop`
- `reconnect-required`
- `session-limit`
- `missing-heartbeat`
- `session-time-limit`
- `provider-quota-stop`
- `global-budget-stop`
- `ai-budget-stop`

## stop behavior checklist

Stop behavior evidence must use sanitized stop reason labels only:

- `user-stop`: explicit Stop action from the allowed tester
- `missing-heartbeat`: heartbeat timeout path remains modeled without background monitoring
- `session-time-limit`: per-session duration cap stops the session
- `daily-time-limit`: daily duration cap stops the session
- `translated-message-cap`: translated message rate cap stops or blocks the session
- `provider-quota-stop`: provider quota guard stops or blocks the session without exposing provider details
- `global-budget-stop`: global budget guard stops or blocks the session
- `ai-budget-stop`: AI/provider budget guard stops or blocks the session
- `translation-provider-limit`: provider availability guard stops or blocks the session
- `session-limit`: one active session per user is enforced
- `auth-failed`: auth loss stops or blocks the session
- `reconnect-required`: credential unavailable/revoked/expired state blocks or stops the session

Do not force quota exhaustion, provider errors, or live stream state changes to prove these paths in a smoke. Focused server-only contracts remain the evidence for those stop states unless a later task explicitly approves a bounded execution path.

## Explicit Blocker Handling

Record blocker/readiness only when any required gate is missing:

- missing approval: `blocked-no-approval`
- missing authenticated allowed-tester session: `blocked-no-allowed-tester-session`
- private launch denial: `blocked-private-launch-gated`
- missing connected credential: `blocked-no-connected-credential`
- emergency disable enabled: `blocked-disabled`
- missing required env/reference: `blocked-missing-env`
- planned output includes forbidden fields: `blocked-output-review-incomplete`

Emergency disable and missing env/reference states remain fail closed and browser-safe. Their output must use labels such as `blocked-disabled`, `blocked-missing-env`, `credential-resolution-disabled`, or `credential-reference-env-missing`.

## Verification

Focused contract:

- `node scripts/comment-translator-youtube-oauth-allowed-tester-session-start-smoke-readiness-contract.mjs`

Closeout checks:

- readiness/evidence contract for Task 8
- existing Task 7 allowed-tester connection smoke readiness contract if still applicable
- existing Task 6 tool/session readiness contract if still applicable
- changed-files no-secret scan
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`

Width checks are skipped because this branch changes docs, `task.md`, and a Node contract only. It does not change UI, CSS, rendered text, route behavior, browser storage, or visible layout.
