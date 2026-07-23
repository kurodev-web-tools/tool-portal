# V Streamer Tools Design System

## 1. Atmosphere & Identity

V Streamer Tools is a calm, operational workspace for creators. Its signature is a restrained teal control color over quiet neutral surfaces, with dense information grouped into clear panels and stream-safe views using the same hierarchy without exposing private runtime state.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| Page background | `--color-background` | `247 249 250` | `10 17 23` | Application and standalone route background |
| Text primary | `--color-foreground` | `16 24 39` | `232 240 243` | Headings and body copy |
| Surface | `--color-surface` | `255 255 255` | `15 25 33` | Cards and form panels |
| Surface muted | `--color-surface-muted` | `241 245 246` | `22 35 44` | Secondary regions and state labels |
| Border | `--color-border` | `218 226 229` | `47 65 75` | Panel and field boundaries |
| Primary | `--color-primary` | `0 138 132` | `31 178 169` | Actions, focus, and safe role emphasis |
| Primary strong | `--color-primary-strong` | `0 117 111` | `78 207 197` | Primary-action hover and strong emphasis |
| Primary soft | `--color-primary-soft` | `223 246 243` | `16 67 66` | Teal badges and selected states |
| Muted text | `--color-muted` | `103 116 135` | `152 166 176` | Supporting copy and attribution |
| Overlay panel | `--obs-overlay-panel` | `8 14 22` | same | OBS-only translucent surface |
| Overlay foreground | `--obs-overlay-foreground` | `248 250 252` | same | OBS-only text |
| Overlay muted | `--obs-overlay-muted` | `203 213 225` | same | OBS-only secondary text |
| Overlay accent | `--obs-overlay-accent` | `45 212 191` | same | OBS-only badge and action |
| Overlay purchase | `--obs-overlay-purchase` | `250 204 21` | same | OBS-only purchase metadata |

### Rules

- Tailwind color utilities map to these CSS tokens through `tailwind.config.ts`.
- New UI does not introduce raw color literals. Add a semantic token here before adding one to CSS or Tailwind.
- Accent color communicates action, selection, or safe metadata rather than decoration.

## 3. Typography

### Scale

| Level | Size | Weight | Line height | Usage |
| --- | --- | --- | --- | --- |
| H1 | `1.875rem` | 700-900 | 1.2 | Standalone route title |
| H2 | `1.25rem` | 700 | 1.35 | Panel title |
| Body | `1rem` | 400 | 1.6 | Default copy |
| Body small | `0.875rem` | 400-700 | 1.5 | Metadata and controls |
| Caption | `0.75rem` | 700-900 | 1.4 | Badges and attribution |

### Font Stack

- Primary: `Noto Sans JP`, `Hiragino Kaku Gothic ProN`, `Yu Gothic`, `Segoe UI`, sans-serif.
- Display variants already imported in `app/globals.css` are tool-specific and are not used by Comment Translator operational routes.
- Body text is never smaller than the caption scale, and long unbroken capability input must stay contained by its field.

## 4. Spacing & Layout

### Base Unit

All spacing uses Tailwind's 4px base scale.

| Step | Value | Usage |
| --- | --- | --- |
| 1 | 4px | Tight label alignment |
| 2 | 8px | Inline metadata and compact gaps |
| 3 | 12px | Dense panel rhythm |
| 4 | 16px | Mobile page gutter and card padding |
| 5 | 20px | Desktop inner spacing |
| 6 | 24px | Section separation |
| 8 | 32px | Wide page gutter |

### Grid

- Operational content uses a centered readable column, with `16px` mobile and `24-32px` larger viewport gutters.
- Existing workspace shells may expand to multi-column layouts; standalone bearer-capability routes remain one readable column.
- Required verification widths are 390, 820, 1280, and 1920 pixels. Primary content must not overflow horizontally.

## 5. Components

### Operational Panel

- **Structure**: semantic section with heading, supporting copy, and optional form or list.
- **Variants**: standard, muted unavailable, feed.
- **Spacing**: 12-24px internal rhythm from Section 4.
- **States**: default and unavailable; interactive descendants own hover, active, focus, and disabled behavior.
- **Accessibility**: semantic heading order, readable contrast, and a visible global `:focus-visible` outline.
- **Motion**: none.
- **Layout**: vertical stack; page owns scrolling.

### Credential Redemption Form

- **Structure**: explicit label, password input, primary submit button.
- **Variants**: OBS overlay credential and moderator share credential.
- **Spacing**: 8px field gap, 16px section gap, minimum 44px controls.
- **States**: default, hover, active, focus, browser-required invalid state.
- **Accessibility**: label is programmatically bound; input disables autocomplete and spellcheck; button is native submit.
- **Motion**: none.
- **Layout**: one-column stack at every width.

### Safe Feed Card

- **Structure**: author/role metadata cluster, translated or moderation state, optional original disclosure, safe event metadata, source attribution.
- **Variants**: translated, deleted, banned, system, ended, purchase, member.
- **Spacing**: 8px metadata cluster, 12-16px vertical card rhythm.
- **States**: static read-only content; disclosure uses native details/summary states.
- **Accessibility**: ordered list semantics, readable state text, native disclosure keyboard behavior, and no color-only status meaning.
- **Motion**: none.
- **Layout**: vertical stack with wrapping metadata and unbroken-text containment.

## 6. Motion & Interaction

- Operational and bearer-capability routes use no decorative animation.
- Buttons may use the existing immediate hover/active color feedback; focus uses the global outline.
- Native `details` disclosure supplies its own interaction and must remain keyboard reachable.
- If motion is added later, it must communicate state, use only transform/opacity, and respect `prefers-reduced-motion`.

## 7. Depth & Surface

### Strategy

Mixed, matching the existing application: light surfaces use a border and restrained `shadow-panel`; OBS overlay surfaces alone use translucent blur and a stronger shadow for video compositing readability.

- Standard panel: `border-border`, `bg-surface`, `rounded-base`, optional `shadow-panel`.
- Muted inset: `bg-surface-muted` with the same border token.
- No standalone route may copy OBS transparency or blur unless it is rendered over video.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- Target WCAG 2.2 AA, including 4.5:1 body contrast, 3:1 large-text contrast, visible keyboard focus, semantic landmarks, and native form labels.
- Touch targets are at least 44px high.
- Japanese and English copy must wrap naturally without clipped glyphs or one-character orphaning caused by fixed heights.
- Unavailable states reveal no token, digest, owner, session, provider target, billing, or other private identifier.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
| --- | --- | --- | --- |
| React inspection tooling is not installed in this worktree | project-wide | C8 explicitly forbids `npm install` and `npm ci`; adding dependencies would cross the approval boundary | Revisit only with explicit dependency-install approval |
| Production Lighthouse and authenticated safe-feed visual proof are unavailable locally | C8 moderator share route | Installed dependencies and applied C5-C8 remote migrations/live token state are absent and separately approval-gated | C12 or a separately approved environment-readiness task |
