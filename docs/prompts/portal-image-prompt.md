# Portal Image Prompt

## Purpose

`V_streamer_tools` の初回MVPポータル画面モックを画像生成するためのプロンプト。  
目的は実装前に情報密度、トーン、カード配置、ライト / ダーク両対応の雰囲気を確認すること。

## Prompt

Create a high-fidelity product UI mockup for a Japanese VTuber tools portal web app called "Kuro Stream Kit".

Style direction:
- practical dashboard, not a flashy landing page
- neutral and professional, with a slight VTuber-friendly softness
- light mode and dark mode compatible design language
- flat surfaces with thin borders
- compact but readable information density
- small 8px corner radius
- readable sans-serif typography
- deep teal as the main accent color, with restrained mint highlights

Layout:
- top header aligned with the main content area, product name visible, theme toggle on the right
- visible left sidebar for shortcuts
- sidebar should contain fixed navigation plus implemented tools only
- example sidebar items: Home, Tools, Schedule Calendar
- sidebar should feel like a lightweight launcher, not a dense admin tree
- modest hero section with a short Japanese intro and small summary stats in the main content area
- horizontal filter chips under the hero
- main content is a 3-column grid of medium-sized tool cards
- cards include tool name, short Japanese description, implementation status, and action button
- only one tool is available now: schedule calendar
- other tools are clearly marked as coming soon

Content tone:
- Japanese UI
- no exaggerated anime styling
- no neon cyberpunk
- no glassmorphism
- no oversized hero illustration
- should feel like a real product portal for creators

Visual details:
- clear role separation between sidebar shortcuts and main portal listing
- subtle separation between page background and cards
- teal used for active filters, primary buttons, and available tool state
- teal used for the active sidebar item as well
- neutral muted styling for coming soon cards
- information should feel organized and trustworthy

Deliverable:
- one polished desktop portal screen mockup
- optionally show both light and dark variants side by side if supported

## Negative Prompt

- overly playful
- idol app aesthetic
- pink-dominant palette
- futuristic sci-fi UI
- oversized illustrations
- excessive gradients
- glass cards
- rounded blob shapes
