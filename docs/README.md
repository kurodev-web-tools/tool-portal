# Docs Organization

This directory follows an `active/archive` model.

## Structure

- `docs/active`
  - Current operational references that should be discovered first.
- `docs/archive`
  - Superseded versions, session-specific artifacts, and replaced assets.
- `docs/prompts`
  - Final prompts currently in use.
- `docs/mockups`
  - Keep one final image and at most one comparison image per screen.

## Retention Rules

- Keep in active scope:
  - `PLAN.md`
  - design documents
  - tool readmes
  - operational evidence (for example stability checks)
- Move to archive:
  - next-session-only prompts
  - replaced mockups
  - old review drafts
- Delete only when all are true:
  - duplicate or unreferenced
  - no reuse value
  - not needed as migration/history evidence

## Notes

- Path changes can break references in prompts and plans.
- For this reason, core docs can stay at `docs/` root until references are updated in a dedicated cleanup task.
