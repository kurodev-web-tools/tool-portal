# Kuro Live Comment Translator Public Deployment And Live-Smoke Runbook

Status: active Task 14 runbook for the current public-release roadmap.

This runbook defines the release execution order and smoke evidence rules. It is not live/provider execution approval. It does not approve deploys, remote mutations, schema migrations, billing enforcement, browser storage writes, handoff payload changes, or provider-affecting commands.

## Purpose

Define a repeatable public deployment and live-smoke sequence that produces sanitized, reproducible evidence without exposing token, credential, authorization header, owner, provider target, or Live Chat target values.

Completion evidence for this task is documentation and contract verification only. Actual deploy and live/provider smoke execution stay approval-gated.

## Operator-Local Preconditions

- Work from a feature branch based on `origin/codex/comment-translator-preview`; do not work directly on `main`.
- Confirm the release branch contains the latest merged public-roadmap PR.
- Confirm local dependency installation is current before verification.
- Confirm Cloudflare account/project access and Wrangler authentication locally, without printing credentials.
- Confirm Supabase and YouTube credential references exist only in the operator-local command process when a later approved smoke requires them.
- Confirm provider target metadata is available only as operator-local/server-only presence evidence. Do not paste or record metadata values.
- Confirm live/provider smoke commands have all three gates before execution: same-thread / operator-local same-command-process ready preflight, sanitized output review, and explicit in-thread approval.

## Safe Command Order

Run local verification first. These commands do not deploy and do not perform live/provider execution:

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`
4. `npm run build:cloudflare`
5. `git diff --check`

Only after the release owner approves a deployment attempt, run Cloudflare release commands in this order:

1. `npm run upload:cloudflare`
2. Review the upload output for sanitized deployment metadata only.
3. `npm run deploy:cloudflare`
4. Record only deployment alias/version/status metadata needed to reproduce the smoke. Do not record credentials, headers, provider target metadata, or Live Chat target values.

Do not run upload or deploy from a thread that lacks explicit deployment approval.

## Sanitized Output Review

Before any evidence is copied into `task.md`, a PR body, or a handoff prompt, review the output for these rules:

- Allowed: command name, route path, status, HTTP status, timestamp, build/deploy version reference, check conclusion, and sanitized status labels.
- Allowed: opaque non-secret references only when an existing contract explicitly marks them client-safe.
- Required: live/provider command output must state `sanitized-metadata-only` or an equivalent sanitized output policy.
- Required: provider-affecting smoke output must state whether execution was not run, preflight-only, token-material-only, or approved bounded execution.
- Forbidden: token values, refresh token values, authorization code values, private credential values, service-role key values, Authorization header values, owner user id values, provider channel id values, provider target metadata values, Live Chat target values, raw comment text, browser storage payloads, and handoff payload expansion.
- Abort and do not record the output if any forbidden value appears.

## Deployed URL Smoke Checklist

After an approved deploy, use the deployed URL that the release owner approved. Record the URL label or deployment version reference only when it is safe to share.

Minimum deployed smoke:

1. Visit `/tools/comment-translator`.
2. Confirm the public operator UI renders.
3. Confirm unauthenticated or disconnected states show only sanitized connection/session/usage metadata.
4. Confirm Start remains unavailable or safely blocked when the operator lacks a ready provider connection.
5. Visit `/account/integrations`.
6. Confirm YouTube connection readiness/reconnect/disconnect affordances do not expose token, owner, provider target, or Live Chat target values.
7. Visit `/terms`, `/privacy`, and `/legal/tokushoho`.
8. Confirm visible copy remains consistent with the public requirements.
9. Check browser console for client-side errors.
10. Do not inspect or export browser storage unless a later task explicitly scopes storage review.

Deployed smoke evidence must be sanitized and reproducible: include route paths, pass/fail state, check time, browser width if layout is being reviewed, and the exact command/check name used. Do not include sensitive values.

## Approval-Gated Live Provider Smoke

The live/provider smoke commands are approval-gated. Do not run them from this runbook without all three gates in the same thread and command process:

1. same-thread / operator-local same-command-process ready preflight;
2. sanitized output review of the preflight result;
3. explicit in-thread approval for the exact provider-affecting command.

Reference command surfaces:

- `node scripts/comment-translator-youtube-google-api-live-call-command.mjs --check-env-only --json`
- `node scripts/comment-translator-youtube-google-api-live-call-command.mjs --check-token-material-availability --json`
- `node scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs --check-env-only --json`
- `node scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs --check-token-material-availability --json`
- `node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --check-env-only --json`
- `node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --check-token-material-availability --json`

Do not run provider-affecting `--execute` variants until the exact command, required approval flag, operator-local reference presence, sanitized preflight output, abort conditions, and evidence destination are reviewed in the same thread.

When later approved, run only the narrowest live/provider smoke needed:

1. bounded Google API read-only live call;
2. bounded Live Chat target lookup after owner binding prerequisites;
3. one-step Live Chat polling smoke after target presence-only evidence.

Do not run broad polling loops. Do not start translator provider execution as part of deployment smoke unless a later task explicitly scopes it.

## Rollback Notes

Rollback is an operator action and must be approved before execution.

- Prefer Cloudflare version rollback to the last known good deployment when the deployed smoke fails after upload/deploy.
- Stop or refuse new translator sessions if deployed smoke shows provider quota, auth, session, or UI safety regressions.
- Preserve the existing server-only credential and provider target boundaries during rollback; do not export or paste sensitive values to diagnose.
- Treat Cloudflare Pages failure and Workers Builds success separately. A Cloudflare Pages failure alone is not fresh regression evidence without local/deployed symptoms or dashboard log review.
- If rollback is triggered by live/provider smoke output, record only sanitized status labels and route/command names.

## Evidence Record Template

Use this format in `task.md`, PR body, or handoff text:

```text
Task: Public deployment and live-smoke runbook
Release reference: <safe deployment version or branch reference>
Local verification: <command names and pass/fail>
Deployment command: <not-run | approved-upload | approved-deploy>
Deployed URL smoke: <not-run | route checklist pass/fail with sanitized route paths>
Live/provider smoke commands: <not-run | preflight-only | approved bounded execution>
Output policy: sanitized-metadata-only
Sensitive values: not requested, not printed, not stored
Rollback: <not-needed | approved rollback action | blocked pending approval>
Residual risk: <known unchecked scope>
```
