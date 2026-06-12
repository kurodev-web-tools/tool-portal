# Comment Translator Private-Gated Live Provider Smoke Readiness

Status: Task 27 execution harness readiness before private-gated live/provider smoke. Public-release capable: no.

This document records the pre-execution state for Task 27. It is a readiness/blocker record only. It does not approve or perform live/provider execution, provider target lookup, liveChatId lookup, translation provider API execution, deploy/upload, Stripe live-mode action, billing setting mutation, remote mutation, remote schema migration, or Supabase migration apply.

Output policy: sanitized-metadata-only. Secret, token, OAuth value, owner user id value, provider channel id value, liveChatId value, service-role key value, Authorization header value, Stripe secret value, webhook signing secret value, provider target metadata value, raw comment text, provider response body, browser storage payload, and handoff payload expansion are not requested, displayed, stored, or recorded.

## Completion Decision

Completion decision: not complete.

Task 27 completion criteria are not met in this execution harness PR because approved live/provider smoke was not run. This PR adds the server-only execution harness and command gate needed to connect provider target lookup, bounded one-step Live Chat polling, and translation provider execution into sanitized summary evidence, but it does not perform provider-affecting execution.

Current execution state:

- live/provider execution: not-run
- provider target lookup: not-run
- liveChatId lookup: not-run
- bounded Live Chat polling: not-run
- translation provider API execution: not-run
- deploy/upload: not-run
- execution harness: implemented-sanitized-summary-only

| Surface | State | Notes |
| --- | --- | --- |
| live/provider execution | not-run | Explicit approval for an exact provider-affecting command was not used in this readiness PR. |
| provider target lookup | not-run | Target lookup remains blocked until same-thread/operator-local ready preflight, sanitized output review, and exact-command approval are present. |
| liveChatId lookup | not-run | liveChatId remains operator-local/server-only and was not resolved or displayed. |
| bounded Live Chat polling | not-run | Preflight blocker output was inspected only with operator-local references absent. |
| translation provider API execution | not-run | Translation providers remain server-only and approval-gated. |
| deploy/upload | not-run | No deployment or remote mutation was performed. |

## Inspected Command Gates

The existing command surfaces keep provider-affecting execution behind explicit gates:

- `scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs`
  - preflight-only command: `--check-env-only`
  - token-material availability command: `--check-token-material-availability`
  - provider-affecting execution requires `--execute` and `--approved-live-chat-target-lookup`
- `scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs`
  - preflight-only command: `--check-env-only`
  - token-material availability command: `--check-token-material-availability`
  - provider-affecting execution requires `--execute` and `--approved-live-chat-polling-smoke`
- `scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs`
  - preflight-only command: `--check-env-only`
  - provider-affecting execution requires `--execute` and `--approved-private-gated-live-provider-smoke`
  - output remains sanitized metadata only and records counts/status/stop reasons only

Sanitized preflight blocker output was inspected with operator-local references intentionally absent. The output recorded status labels, command names, reference names, and `not-run` states only.

## Current Blockers

1. Missing same-thread/operator-local ready preflight evidence for the exact Task 27 live/provider command.
2. Missing sanitized output review of ready preflight evidence.
3. Missing explicit in-thread approval for an exact provider-affecting command after sanitized review.
4. Approved runtime wiring still needs a follow-up connection to operator-local target lookup, polling, and translation provider adapters. The execution harness boundary is available, but this PR intentionally does not run it against live/provider services.
5. No approved bounded execution evidence for stop behavior, quota/budget stop behavior, or provider translation execution.

## Next Safe Action

After this execution harness PR is merged, continue Task 27 in a fresh branch from `origin/codex/comment-translator-preview`.

Before any provider-affecting command:

1. Set required operator-local env values locally without pasting values into Codex, docs, PR body, browser storage, or handoff payloads.
2. Run only preflight/token-material availability commands first.
3. Review sanitized output for status/count/stop-reason/reference-name-only evidence.
4. Ask for explicit in-thread approval for one exact command.
5. Connect or run only the narrow approved command path, with sanitized evidence recording.

Do not record liveChatId, provider identifiers, OAuth values, raw comments, Authorization header values, provider target metadata, private owner values, private channel values, or secret values.

## Width Checks

Width checks skipped. This readiness/blocker PR changes docs and a Node contract only; it does not change UI, rendered text, CSS, routes, browser storage, or visible layout behavior.
