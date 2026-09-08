# AGENTS.md

## Scope

- This file applies to this repository and all checkouts and worktrees derived from it.
- Keep tool-specific details in `task.md` and `docs/*`. Keep this file focused on project-wide operating rules.

## Execution Baseline

- The root thread must review `task.md` before implementation and prioritize the immediate tasks defined there.
- After meaningful implementation work, the root thread must update `task.md` in the same cycle when the repository workflow expects it.
- Add documentation only when needed and avoid creating overlapping documents.
- Keep small, low-risk, obvious changes lightweight. The primary agent implements directly, including multi-file and complex changes; use subagents only when the user explicitly requests them.

## Single-Agent Execution

- Default to Astra Light: gpt-6-astra / low for normal execution and Plan mode.
- The primary agent owns requirements, design, implementation, debugging, browser checks, review, Git operations, task.md updates, verification, and final acceptance.
- Do not use subagents unless the user explicitly requests them for the current scope. Complexity, old plans, skills, and available role definitions do not authorize delegation.
- Do not automatically raise reasoning effort or switch models. Request explicit approval for a different model or higher effort for the specific scope.
- Reuse approved specifications. Inspect the actual diff and run the relevant acceptance checks; perform semantic review directly without a mandatory reviewer agent.
- Historical Luna implementation packets and mandatory delegation instructions in plans or skills are superseded by this policy. Preserve their functional acceptance criteria and external-operation approval boundaries.
- If subagents are explicitly requested, verify the available configured profiles, assign exact ownership and verification, keep one writer per worktree, and retain primary-agent final acceptance.

## Access Boundary

- Do not perform read, write, or execute actions outside this project unless the user explicitly instructs it.
- Even with explicit permission, limit external access to the minimum required scope.
- All delegated agents inherit the same access, approval, and prohibited-operation boundaries as the root task.

## Git Workflow

- Do not work directly on `main` and do not push direct changes to `main`.
- Use feature branches and merge through pull requests.
- Do not mix unrelated changes in the same pull request.
- The root thread owns branch, worktree, commit, push, and pull-request operations unless the user explicitly assigns otherwise.
- Never overwrite, revert, or discard unrelated user changes.

## Verification Rule

- Run the smallest meaningful verification for the changed scope, then expand based on risk.
- If verification cannot be run, record the reason and the exact unchecked scope.
- For UI changes, retain width-based verification results.
- Do not accept completion solely from a delegated agent's report; inspect the diff and verification evidence directly.

## Docs Retention Policy

- `docs/active`: place currently referenced, operational documents.
- `docs/archive`: place superseded versions, in-progress drafts, and session-specific artifacts.
- `docs/prompts`: keep only final, currently used prompts. Move older prompt variants to `docs/archive`.
- `docs/mockups`: keep at most one final image and one comparison image per screen. Move others to `docs/archive`.

### Retention Decision Rules

- Keep: `PLAN.md`, design documents, tool READMEs, and operational evidence such as stability checks.
- Archive: replaced mockups, session-specific prompts, and old review drafts.
- Delete: duplicate, empty, or unreferenced files with no reuse value.

## Priority

- System, developer, and user instructions override this file.
- The most local applicable repository instruction overrides a broader instruction when they conflict.
