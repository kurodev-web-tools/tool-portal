# Kuro Live Comment Translator OAuth Live Connect Smoke Preflight

Status: F1 OAuth live connect smoke preflight for `codex/comment-translator-free-public-beta-integration`. Public-release capable: no.

This document is the docs/contract preflight for a later YouTube OAuth live connect smoke. It does not approve or run real OAuth connect, live authorization code exchange, live token persistence smoke, provider target lookup, liveChatId lookup, session start smoke, translation provider API execution, live/provider execution, deploy/upload, remote mutation, schema migration, Stripe live action, main promotion, or public launch gate flip.

Output policy: status-label-only and reference-name-only. OAuth code/token/refresh token values, Authorization header values, owner user id values, provider channel id values, liveChatId values, service_role values, Stripe secret values, provider target metadata, browser storage payload, handoff payload, raw callback query strings, account cookie/session payloads, credential reference values, raw provider bodies, and raw comments are not requested, displayed, stored, or recorded.

## Scope Boundary

F1 prepares the exact execution boundary for F2. F1 completion is preflight readiness only; it is not live execution evidence and it is not permission to connect an account.

Allowed in F1:

- docs/content inspection
- task-board update
- focused contract script
- sanitized labels, reference names, route/action names, and not-run gates

Forbidden in F1:

- any real OAuth connect, consent flow, callback execution, authorization code exchange, token persistence smoke, or credential value inspection
- provider target lookup, liveChatId lookup, session start, polling, translation provider call, or live/provider execution
- deploy/upload, remote mutation, remote schema migration, Stripe live action, main promotion, or public launch gate flip
- browser storage inspection when the purpose is to prove token, credential, provider target, liveChatId, account session payload, or handoff payload absence

If a later operator needs evidence that cannot be recorded without inspecting forbidden values or payloads, stop and record `blocked-output-review-incomplete`.

## Source Alignment

This F1 preflight aligns with:

- `COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`: identifies F1 as the first Free public beta task and requires docs/contract preflight before F2.
- `COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_CONNECTION_SMOKE_READINESS.md`: preserves the allowed-tester connection smoke boundary, status-label-only output, no background monitoring from connection alone, and no session/provider execution.
- `COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_SESSION_START_SMOKE_READINESS.md`: preserves the separation between connected credential readiness and session start/provider execution readiness.
- `COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS.md`: reuses reference-name-only production and operator-local env references without recording values.
- `COMMENT_TRANSLATOR_SECURITY_PRIVACY_FINAL_REVIEW.md`: preserves token, provider target metadata, liveChatId, Authorization header, browser storage, logs/output, and rollback boundaries.

The target branch for this preflight is `codex/comment-translator-free-public-beta-integration`. F2 must use a separate approval-gated branch/PR unless the release owner explicitly changes the task split.

## Same-Thread Approval Checklist

Before F2 live connect can run, the same thread must show all of the following as labels or route/action names only:

| Check | Allowed evidence shape |
| --- | --- |
| release owner approves the exact action | `approved-exact-ui-action` or `blocked-no-approval` |
| target environment is named by label only | `target-env-label-confirmed` or `blocked-missing-env` |
| output plan is reviewed before execution | `sanitized-output-review-complete` or `blocked-output-review-incomplete` |
| allowed tester is signed in locally | `allowed-tester-session-present` or `blocked-no-allowed-tester-session` |
| private launch allows the tester | `private-launch-allowed` or `blocked-private-launch-gated` |
| `/account/integrations` can render | route readiness label only |
| connect/reconnect control is available | action readiness label only |
| callback route is configured | route readiness label only |
| server-owned state/CSRF binding is active | readiness label only |
| emergency disable is reviewed | `enabled`, `disabled`, or `blocked-disabled` |
| required env references are present by name | `env-reference-present`, `env-reference-missing`, or `blocked-missing-env` |
| browser storage inspection is not part of evidence | `not-inspected-not-recorded` |
| no background monitoring starts from connection alone | `not-started` |
| provider/session/Stripe/deploy gates remain closed | `not-run` |

Approval must name only this exact UI action: an allowed tester clicks the YouTube connect or reconnect control from `/account/integrations`, follows the Google OAuth consent flow once, returns to the application callback once, and observes a sanitized connection status. The smoke stops after the sanitized status is observed.

The approval does not include provider target lookup, liveChatId lookup, session start smoke, translation provider API execution, live/provider execution, deploy/upload, remote mutation, schema migration, Stripe live action, main promotion, or public launch gate flip.

## Operator-Local Env Reference Checklist

The operator may confirm reference presence locally, but must not paste values into the thread, docs, PR body, screenshots, browser storage, or handoff payload.

| Reference name | Boundary | Missing/disabled result |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | approved target label and auth redirect origin | `blocked-missing-env` if the target cannot be confirmed |
| `NEXT_PUBLIC_SUPABASE_URL` | browser/server auth availability | `blocked-missing-env` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | allowed-tester account session availability | `blocked-missing-env` |
| `COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES` | private launch access gate | `blocked-private-launch-gated` or `blocked-missing-env` |
| `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` | emergency disable / fail-closed switch | `blocked-disabled` when enabled |
| `SUPABASE_SERVICE_ROLE_KEY` | trusted server-only credential status/persistence boundary | `blocked-missing-env` |
| `YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID` | smoke-only fixture/reference presence | `blocked-missing-env` |
| `YOUTUBE_OAUTH_SMOKE_OWNER_USER_ID` | smoke-only owner authorization reference | `blocked-missing-env` |
| `YOUTUBE_OAUTH_SMOKE_PROVIDER_CHANNEL_ID` | smoke-only provider-channel reference | `blocked-missing-env` |

Reference names may appear in documentation and command checklists. Values must remain operator-local/server-only.

## Sanitized Evidence Shape

Use this shape only after same-thread ready preflight, sanitized output review, and explicit in-thread approval are complete. Every value must be a label, count-free status, route/action name, timestamp label, or `not-run`.

| Field | Allowed value shape |
| --- | --- |
| F2 approval | `approved-exact-ui-action` or `blocked-no-approval` |
| preflight result | `preflight-ready`, `blocked-missing-env`, `blocked-disabled`, `blocked-output-review-incomplete`, `blocked-private-launch-gated`, or `blocked-no-allowed-tester-session` |
| target environment | label only |
| allowed tester session | status label only |
| private launch access | status label only |
| connect action | `not-run`, `started`, `returned-callback`, or `blocked-*` |
| callback validation | status label only |
| credential persistence | `not-run`, `connection-status-connected`, `connection-status-reconnect-required`, `connection-status-disconnected`, or `blocked-*` |
| account integrations status | `connection-status-connected`, `connection-status-reconnect-required`, `connection-status-disconnected`, `connection-status-unavailable`, or `connection-status-error` |
| emergency disable | `enabled`, `disabled`, or `blocked-disabled` |
| provider target lookup | `not-run` |
| liveChatId lookup | `not-run` |
| session start smoke | `not-run` |
| translation provider API execution | `not-run` |
| live/provider execution | `not-run` |
| deploy/upload | `not-run` |
| remote mutation | `not-run` |
| schema migration | `not-run` |
| Stripe live action | `not-run` |
| main promotion | `not-run` |
| public launch gate flip | `not-run` |
| browser storage payload | `not-inspected-not-recorded` |
| handoff payload | `not-created` |

Allowed status labels include `preflight-ready`, `blocked-no-approval`, `blocked-missing-env`, `blocked-disabled`, `blocked-output-review-incomplete`, `blocked-private-launch-gated`, `blocked-no-allowed-tester-session`, `connection-status-connected`, `connection-status-reconnect-required`, `connection-status-disconnected`, `connection-status-unavailable`, `connection-status-error`, and `not-run`.

## Abort Conditions

Abort before any F2 execution if any condition is true:

- same-thread approval is missing or does not name the exact UI action and target environment
- planned output includes OAuth code/token/refresh token, Authorization header, owner user id, provider channel id, liveChatId, service_role, Stripe secret, provider target metadata, browser storage payload, handoff payload, raw callback query, account session payload, credential reference value, raw provider body, or raw comment text
- required env references are missing, disabled, or cannot be confirmed by reference name only
- `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` is enabled for the target boundary
- allowed tester session is unavailable
- private launch access is not confirmed for the tester
- callback state/CSRF binding readiness is not confirmed
- any requested evidence would require browser storage payload inspection
- the operator asks to combine connect smoke with provider target lookup, liveChatId lookup, session start smoke, translation provider API execution, live/provider execution, deploy/upload, remote mutation, schema migration, Stripe live action, main promotion, or public launch gate flip

Use the nearest blocker label and stop. Do not broaden the task to recover inside the same F1/F2 execution path.

## Rollback Path

F1 itself is docs/contract only and has no runtime rollback. If a later F2 connection smoke starts and must stop, use this rollback path without printing private values:

1. Stop immediately at the first blocker or unexpected output surface.
2. Record only the blocker label and the last safe route/action label.
3. If credential resolution must be halted, enable the emergency disable boundary by operator-local configuration and record `blocked-disabled`.
4. If the tester connection ended in a bad status, prefer the existing disconnect/reconnect UI or server-owned disconnect path only if separately approved for that action.
5. Do not run cleanup SQL, remote mutation, schema migration, deploy/upload, Stripe action, provider lookup, session start, polling, or provider execution as part of rollback.
6. Leave public release state unchanged: `public-release capable: no`.

## Not-Run Gated Actions

| Gated action | F1 state |
| --- | --- |
| real OAuth connect | not-run |
| live authorization code exchange | not-run |
| live token persistence smoke | not-run |
| provider target lookup | not-run |
| liveChatId lookup | not-run |
| session start smoke | not-run |
| translation provider API execution | not-run |
| live/provider execution | not-run |
| deploy/upload | not-run |
| remote mutation | not-run |
| schema migration | not-run |
| Stripe live action | not-run |
| main promotion | not-run |
| public launch gate flip | not-run |

## Verification And Closeout

Focused contract:

- `node scripts/comment-translator-oauth-live-connect-smoke-preflight-contract.mjs`

Closeout checks:

- docs/content inspection for this F1 output
- changed-files no-secret scan
- `git diff --check`

Code/runtime files are not changed by F1. If a code/runtime file changes, stop and reconfirm scope before commit/push/PR.

Width checks skipped for F1 because this change is docs, `task.md`, and a Node contract only. It does not change UI, CSS, rendered routes, visible copy, browser storage, layout, or route/runtime behavior.

## Next Safe Action

After this PR merges, the next safe action is F2 in a separate approval-gated thread/branch: run or block the YouTube OAuth live connect/token persistence smoke using this preflight. F2 must still require same-thread ready preflight, sanitized output review, and exact explicit approval before any live OAuth action.
