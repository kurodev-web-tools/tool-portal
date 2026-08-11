# AGENTS.md

## Scope

- This file applies to all work under `D:/V_streamer_tools`.
- Keep tool-specific details in `task.md` and `docs/*`. Keep this file focused on project-wide operating rules.

## Execution Baseline

- The root thread must review `task.md` before implementation and prioritize the immediate tasks defined there.
- After meaningful implementation work, the root thread must update `task.md` in the same cycle when the repository workflow expects it.
- Add documentation only when needed and avoid creating overlapping documents.
- Keep small, low-risk, obvious changes lightweight. Use delegated implementation for work that is multi-file, multi-module, long-running, or materially risky.

## Delegated Implementation

- Use `$bounded-autonomous-implementation` for multi-file, multi-module, long-running, or materially risky implementation when the required custom agents are available.
- The root thread owns requirement interpretation, architecture within the approved design, task decomposition, agent routing, Git and worktree operations, `task.md` updates, diff inspection, verification, and final acceptance.
- Delegate implementation to the least expensive adequate configured lane according to the skill. Do not silently substitute another agent role, model, or reasoning effort.
- Every delegated writer must receive an explicit objective, exact file or module ownership, interfaces, constraints, and verification requirements.
- Delegated agents may modify only the files or modules explicitly assigned to them. They must preserve unrelated and concurrent user changes.
- Delegated agents must not modify `task.md`, project documentation, `AGENTS.md`, `.codex/*`, branch or worktree state, commits, pushes, or pull requests unless that work is explicitly included in their ownership.
- Do not run more than one writer in the same worktree. Parallel writers require separate branches or worktrees and non-overlapping ownership.
- While a delegated writer is active in the current worktree, the root thread must not edit tracked files in that worktree.
- Read-only exploration, auditing, debugging, or review may run alongside one writer when it is necessary and does not duplicate work.
- Treat delegated reports as claims, not proof. The root thread must inspect the actual diff, confirm scope discipline, and rerun the relevant verification before reporting completion.

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
