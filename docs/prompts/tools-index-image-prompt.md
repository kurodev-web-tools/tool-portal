# Tools Index Image Prompt

## Purpose

`/tools` 用の一覧・探索特化ページモックを画像生成するためのプロンプト。  
目的は、ポータルTOPとの差分を明確にしつつ、実装前に一覧密度と絞り込みの見え方を確認すること。

## Prompt

Create a high-fidelity desktop UI mockup for a Japanese VTuber tools web app called "V Streamer Tools", focused on the `/tools` page.

Style direction:
- practical dashboard
- not a landing page
- high-density but readable tool discovery screen
- flat surfaces with thin borders
- readable sans-serif typography
- small 8px corner radius
- deep teal primary accent with restrained mint support
- compatible with the existing portal design language

Layout:
- top header aligned with the main content area
- visible left sidebar for shortcuts
- sidebar contains fixed navigation and implemented tools only
- sidebar items include Home, Tools, and Schedule Calendar
- Tools should be the active sidebar item
- main content should start with a compact page title area, not a large hero
- include a short Japanese description under the title
- below that, horizontal filter chips for category and implementation status
- main content is a 3-column grid of medium-sized tool cards
- cards include tool name, short Japanese description, category, status, and action button
- one tool is available now: Schedule Calendar
- several other cards are marked as coming soon

Content tone:
- Japanese UI
- calm and trustworthy
- built for creator workflow tools
- no exaggerated anime styling
- no neon or cyberpunk
- no oversized illustration

Visual details:
- clear distinction between portal-like navigation and tool discovery area
- less marketing feel than the homepage portal
- stronger emphasis on browsing and comparing tools
- teal used for active sidebar item, active filters, and available tool CTA
- muted neutral styling for coming soon cards

Deliverable:
- one polished desktop `/tools` page mockup suitable as an implementation reference

## Negative Prompt

- flashy landing page
- giant hero area
- gaming HUD
- glassmorphism
- pink-heavy palette
- cluttered grid
- oversized card decorations
