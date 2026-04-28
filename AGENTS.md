# AGENTS.md

## Scope

- This file applies to all work under `D:\V_streamer_tools`.
- Keep tool-specific details in `task.md` and `docs/*`. Keep this file focused on project-wide operating rules.

## Execution Baseline

- Review `task.md` before implementation and prioritize immediate tasks defined there.
- After meaningful implementation work, update `task.md` in the same cycle.
- Add documentation only when needed and avoid creating overlapping documents.

## Access Boundary

- Do not perform read/write/execute actions outside this project unless the user explicitly instructs it.
- Even with explicit permission, limit external access to the minimum required scope.

## Git Workflow

- Do not work directly on `main` and do not push direct changes to `main`.
- Use feature branches and merge through PRs.
- Do not mix unrelated changes in the same PR.

## Verification Rule

- Run the smallest meaningful verification for the changed scope.
- If verification cannot be run, record the reason and the exact unchecked scope.
- For UI changes, keep width-based verification results.

## Docs Retention Policy

- `docs/active`: place currently referenced, operational documents.
- `docs/archive`: place superseded versions, in-progress drafts, and session-specific artifacts.
- `docs/prompts`: keep only final, currently used prompts. Move older prompt variants to `docs/archive`.
- `docs/mockups`: keep at most one final image and one comparison image per screen. Move others to `docs/archive`.

### Retention Decision Rules

- Keep: `PLAN.md`, design docs, tool READMEs, and operational evidence (for example stability checks).
- Archive: replaced mockups, session-specific prompts, and old review drafts.
- Delete: duplicate, empty, or unreferenced files with no reuse value.

## Priority

- System, developer, and user instructions override this file.
