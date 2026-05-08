# Thumbnail Editor Phase 5 Clip Preset Implementation Plan

> **For agentic workers:** REQUIRED: Use the current worktree only. Keep the scope to `切り抜き` preset and do not broaden this to the other eight presets.

**Goal:** Rebuild the `切り抜き` preset around a Phase 5 structure: generated background, project-bound visual assets, editable shape lines, and editable text layers.

**Architecture:** Add one Phase 5 background namespace and keep the preset definition in `lib/thumbnail-editor.ts`. Validate the new structure with a focused contract script before updating implementation. Keep text editable and avoid schema, font, UI, or other preset changes.

**Tech Stack:** Next.js / TypeScript data module, static public assets, Node contract scripts, built-in `image_gen` via the `imagegen` skill for raster generation.

---

## File Map

- Modify: `lib/thumbnail-editor.ts`
  - Add a Phase 5 background prefix.
  - Update only the `clip` preset.
- Create or modify: `public/assets/images/thumbnail-editor/phase5/`
  - Store the generated `切り抜き` Phase 5 background.
- Create or modify: `public/assets/images/thumbnail-editor/decorations/phase5/`
  - Store `切り抜き` Phase 5 text-free sticker / badge / arrow / impact assets.
- Create: `scripts/thumbnail-phase5-clip-preset-contract.mjs`
  - Check `clip` uses Phase 5 background, keeps editable text layers, keeps at least the expected separated asset / shape responsibilities, and does not broaden other presets.
- Modify: `task.md`
  - Record generated asset paths, verification, and UI-width notes if browser verification is run.
- Modify: `docs/active/THUMBNAIL_EDITOR_PHASE4_POLISH_REVIEW.md`
  - Record final implementation notes and any deviation from the kickoff memo.

## Tasks

1. Add a failing contract for the Phase 5 `clip` structure.
2. Generate the Phase 5 background and text-free asset sheet with the built-in `image_gen` path.
3. Save selected project-bound outputs under `public/assets/images/thumbnail-editor/phase5/` and `public/assets/images/thumbnail-editor/decorations/phase5/`.
4. Update only the `clip` preset to use Phase 5 background/assets while preserving editable `見出し` / `時刻` / `サブ` / `ラベル` text layers.
5. Run focused contracts, then lint/type/build if the code and asset changes pass.
6. Record verification results in `task.md` and implementation notes in the active review doc.
