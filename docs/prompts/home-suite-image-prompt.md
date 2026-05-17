# Home Suite Image Prompt

## Purpose

`HOME = スイート一覧` 前提に更新したポータルTOPのモックを画像生成するためのプロンプト。  
目的は、従来のツール一覧型ではなく「スイート入口」としての見せ方を実装前に確認すること。

## Prompt

Create a high-fidelity desktop UI mockup for a Japanese VTuber tools web app called "Kuro Stream Kit", focused on the homepage portal.

Style direction:
- practical dashboard
- not a flashy landing page
- medium information density
- flat surfaces with thin borders
- readable sans-serif typography
- small 8px corner radius
- deep teal primary accent with restrained mint support
- same product language as the existing portal and tools pages

Layout:
- top header aligned with the main content area
- visible left sidebar for shortcuts
- sidebar contains fixed navigation plus implemented tools only
- sidebar items include Home, Tools, and Schedule Calendar
- Home should be the active sidebar item
- main content starts with a modest hero containing a short Japanese intro and compact summary stats
- no tool-level filter chips on the homepage
- the main content after the hero is a suite card grid, not a tool card grid
- use 2 to 3 columns of medium-sized suite cards

Homepage content model:
- this page is a suite entry page, not a full tools listing
- show exactly 4 suite cards
- suite names:
  - 配信ワークフロー
  - ファン＆ブランド
  - ビジネス＆コラボ
  - 成長＆セルフケア
- each suite card includes:
  - suite name
  - short Japanese description
  - a small indicator of representative tools or count
  - status label
  - action button
- cards should imply that clicking opens `/tools` with that suite already filtered

Content tone:
- Japanese UI
- calm, trustworthy, creator workflow focused
- no exaggerated anime styling
- no giant marketing hero
- no neon or cyberpunk

Visual details:
- homepage should feel lighter and more navigational than the `/tools` page
- clear separation between sidebar shortcuts and suite discovery content
- teal used for active sidebar state, primary CTA, and available suite states
- muted neutral styling for future or partial states
- should feel like the entry point to a growing creator tool ecosystem

Deliverable:
- one polished desktop homepage portal mockup suitable as the updated visual reference before implementation

## Negative Prompt

- tool-filter-heavy homepage
- giant hero section
- cluttered grid
- gaming HUD
- glassmorphism
- pink-heavy palette
- oversized decorative illustrations
