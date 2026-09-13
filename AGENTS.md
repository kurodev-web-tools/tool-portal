# V_streamer_tools

This file applies to this repository and all its checkouts and worktrees. Global user preferences apply unless a more specific current user instruction changes them.

## Current work

- For implementation, read the relevant row of `task.md` and its linked active authority. Follow the current user request when selecting scope; do not read the historical ledger or unrelated tools by default.
- After meaningful implementation, update the relevant operational status and its active authority. Keep detailed history and superseded notes in `docs/archive`; avoid duplicating them in `task.md`.
- The primary agent implements and accepts the work directly. Older mandatory delegation or Luna-specific plans do not change the current single-agent policy. Preserve their functional requirements and action-specific approval boundaries.
- Use the model and reasoning settings in the applicable `.codex/config.toml`; a different model, higher effort, or subagent use requires explicit user approval.

## Repository boundaries

- Use a feature branch and a suitable worktree. Do not edit directly on `main`, push directly to it, or mix unrelated work in one PR. Preserve existing dirty and untracked work.
- Refresh remote refs when selecting or reusing a branch, preparing a PR, or checking a merge. Recheck the relevant base and current task authority before choosing a post-merge implementation slice.
- Do not access outside the project without explicit user authorization; keep any authorized external access scoped to the task. Repository worktrees are part of the project.
- Keep provider metadata, liveChatId, owner identifiers, service-role keys, credentials, and authorization material out of user-facing output, docs, PR bodies, and browser storage. Preserve required server-only boundaries.
- Remote database/provider changes, deployment, activation, and release retain the exact approval and stop conditions in the applicable active authority. Local checks and merged code do not establish their completion.

## Verification

- Keep implementation and tests proportional to the requested change. Prefer existing patterns and focused regression coverage over speculative architecture, new test infrastructure, or unrelated cleanup; retain the active authority's required checks.
- Run the relevant project checks for the change. Inspect commands with unclear effects before treating them as local verification, especially scripts that can access providers or live data.
- For rendered UI changes, retain results at the relevant widths; the project baseline is `390 / 820 / 1024 / 1280 / 1366px`. Follow narrower or additional requirements in the active task.
- Keep passing evidence for unchanged inputs; report setup blockers and unchecked scope explicitly.

## Documentation locations

- `docs/active`: current operational authority, design, and reusable evidence.
- `docs/archive`: superseded versions, drafts, historical notes, and session-specific artifacts.
- `docs/prompts`: final prompts still in use.
- `docs/mockups`: at most one final image and one comparison image per screen; archive replaced variants.
- Preserve plans, design documents, tool READMEs, and operational evidence. Archive replaced material; remove duplicate, empty, or unreferenced files only within an authorized cleanup.
