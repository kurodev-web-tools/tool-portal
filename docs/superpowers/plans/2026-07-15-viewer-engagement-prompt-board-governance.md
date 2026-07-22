# 配信カンペボード選定・タスク管理ガバナンス Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 配信カンペボードを次の無料MVPとして正式選定し、Comment TranslatorをP0に保ったまま、ツール別task authorityとpreview branch運用を`main`へ入れられるガバナンス差分として整える。

**Architecture:** Runtime/UIは変更せず、root `task.md`先頭へ短い索引を追加し、配信カンペボードとpreview運用の詳細は独立したactive文書へ分離する。既存`task.md`は169本の契約スクリプトから参照されるため、本文を一括移動せず互換台帳として残し、新しいdeterministic contractで選定・MVP境界・PR target・promotion境界を固定する。

**Tech Stack:** Markdown、Node.js ESM assertion script、Git worktree。

---

## Chunk 1: ガバナンス契約とactive authority

### Task 1: ガバナンス契約をREDで固定する

**Files:**
- Create: `scripts/viewer-engagement-prompt-board-governance-contract.mjs`
- Read: `docs/superpowers/specs/2026-07-15-viewer-engagement-prompt-board-governance-design.md`

- [x] **Step 1: 必要なauthorityと境界をassertする契約を作成する**

契約は次のファイルを読む。

```js
const taskPath = "task.md";
const mvpPath = "docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md";
const workflowPath = "docs/active/TOOL_PREVIEW_DEVELOPMENT_WORKFLOW.md";
const catalogPath = "docs/future/FUTURE_TOOL_MOCK_CATALOG.md";
const translatorBoardPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";
```

次の境界をassertする。

- `task.md`に`Current Task Index`、Comment Translator P0、配信カンペボードP1、各authority pathがある。
- MVP文書に無料、ログイン不要、`localStorage`、versioned JSON、予定日時任意、4状態、配信中モード、対象外がある。
- workflow文書に`codex/viewer-engagement-prompt-board-preview`、task PR target、promotion PR target、shared preview no-rebaseがある。
- catalogに比較履歴を置き換えない現在選定記録がある。
- Comment Translator boardに`google_auth_verification_status`と`public_release_capable_status`が残る。
- 変更文書にsecret/token/provider private identifierの具体値がない。

- [x] **Step 2: 契約を実行してREDを確認する**

Run:

```bash
node scripts/viewer-engagement-prompt-board-governance-contract.mjs
```

Expected: `VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`または`TOOL_PREVIEW_DEVELOPMENT_WORKFLOW.md`が存在しないためFAIL。

### Task 2: 配信カンペボードMVP authorityを作成する

**Files:**
- Create: `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`
- Reference: `docs/superpowers/specs/2026-07-15-viewer-engagement-prompt-board-governance-design.md`
- Reference: `docs/mockups/future-tools/viewer-engagement-prompt-board/README.md`

- [x] **Step 1: 製品選定とMVP境界を記録する**

次を一つのactive authorityへ記録する。

- ユーザー向け名称と内部識別子
- 無料、ログイン不要、browser-only
- 配信プランの`idea`、`preparing`、`live`、`completed`
- 予定日時任意、次回/次々回は日時と手動順から導出
- カンペ編集、配信中モード、plan複製、card移動
- `localStorage`、schema version、JSON backup/restore
- Schedule Calendarはlater adapter
- AI、OAuth、YouTube、Supabase、cloud sync、OBS、共同編集はMVP対象外

- [x] **Step 2: MVPタスク順と完了条件を記録する**

ガバナンスmerge後の6 task、各taskの成果物、MVP promotion readiness条件、responsive幅、accessibility、error handlingを記録する。

- [x] **Step 3: 契約を再実行する**

Expected: workflow文書やtask indexがまだないため、次のmissing markerでFAIL。

### Task 3: ツール別preview運用authorityを作成する

**Files:**
- Create: `docs/active/TOOL_PREVIEW_DEVELOPMENT_WORKFLOW.md`

- [x] **Step 1: branch topologyを記録する**

```text
origin/main
└─ codex/viewer-engagement-prompt-board-preview
   ├─ codex/viewer-engagement-prompt-board-storage
   ├─ codex/viewer-engagement-prompt-board-plans
   ├─ codex/viewer-engagement-prompt-board-cards
   ├─ codex/viewer-engagement-prompt-board-live-mode
   └─ codex/viewer-engagement-prompt-board-mvp-qa
```

- [x] **Step 2: PRと同期境界を記録する**

- feature task PRはpreview branch向け。
- shared preview branchはrebase/force-pushしない。
- 必要時は`main`をpreviewへ取り込む。
- MVP完了後だけpreviewから`main`へpromotion PRを作る。
- Comment Translator P0修正は独立branchから`main`へ送り、新ツールpreviewへ混ぜない。
- merge、deploy、公開は別承認。

- [x] **Step 3: 契約を再実行する**

Expected: `task.md`またはcatalogの新markerがまだなくFAIL。

## Chunk 2: task indexと選定記録

### Task 4: Future Tool Mock Catalogへ正式選定を追記する

**Files:**
- Modify: `docs/future/FUTURE_TOOL_MOCK_CATALOG.md`

- [x] **Step 1: 比較時点の推奨を保持して現在選定を追記する**

既存の`Recommended Next Candidate`を削除・書き換えず、その後へ`Current Selected Tool`を追加する。ユーザー選定日、配信カンペボード、選定理由、MVP対象外、Schedule Calendar later境界、runtime未実装を記録する。

- [x] **Step 2: 既存mock inventoryが変わっていないことを確認する**

Run:

```bash
find docs/mockups/future-tools/viewer-engagement-prompt-board -maxdepth 1 -type f | sort
```

Expected: READMEと3 viewport mockだけ。画像変更なし。

### Task 5: root taskへ短いCurrent Task Indexを追加する

**Files:**
- Modify: `task.md`

- [x] **Step 1: ファイル先頭へCurrent Task Indexを追加する**

P0へComment TranslatorのGoogle審査待ちと既存authority、P1へ配信カンペボードのgovernance状態とMVP authorityを置く。新しい長文状態は各active文書へ書く方針を明記する。

- [x] **Step 2: 既存Current Branch本文の前へ互換台帳ラベルを追加する**

`Legacy Contract Compatibility Ledger`を追加し、169本の既存contract参照を壊さないため今回本文を移動しないこと、今後の新規状態は追加しないことを明記する。

- [x] **Step 3: 既存本文が削除されていないことを確認する**

Run:

```bash
git diff --numstat -- task.md
```

Expected: 追加中心。大量削除なし。

- [x] **Step 4: ガバナンス契約をGREENにする**

Run:

```bash
node scripts/viewer-engagement-prompt-board-governance-contract.mjs
```

Expected: PASS。

## Chunk 3: 検証とhandoff

### Task 6: 既存Comment Translator authorityとの互換性を確認する

**Files:**
- Verify only.

- [x] **Step 1: 重要な既存契約を実行する**

Run:

```bash
node scripts/comment-translator-public-launch-remaining-task-board-contract.mjs
node scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs
node scripts/comment-translator-free-beta-pl-g6-public-access-change-preflight-contract.mjs
```

Expected: 3 commands PASS。失敗時は既存markerを消さず、今回の索引追加だけに戻して原因を特定する。

- [x] **Step 2: 変更したNode scriptのsyntaxを確認する**

Run:

```bash
node --check scripts/viewer-engagement-prompt-board-governance-contract.mjs
```

Expected: exit 0。

### Task 7: docs-only最終ゲートを実行する

**Files:**
- Verify only.

- [x] **Step 1: 差分とsecretを検証する**

Run:

```bash
git diff --check
git status --short
```

変更ファイルだけを対象に、Authorization、token、secret、private key、provider private identifierの高信頼pattern件数が0であることを確認する。

- [x] **Step 2: scopeを確認する**

Expected:

- app/component/lib runtime変更0
- environment/Worker/Cloudflare/Google Auth変更0
- mock画像変更0
- browser QA不要。理由はruntime/UI変更なし。

- [x] **Step 3: task.md互換台帳の移行残を記録する**

169本の参照を一括変更していないこと、root `task.md`完全短縮は後続の契約authority移行taskであることをfinal reportへ記録する。

- [x] **Step 4: commit/push/PR承認ゲートで停止する**

コミット、push、PR作成はユーザーの明示承認後にのみ実行する。PR targetは`main`、runtime実装とpreview branch作成はガバナンスPR merge後の別工程とする。

### Task 8: 共通Portal workspace sidebarをMVP taskへ追加する

**Files:**
- Modify: `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`
- Modify: `docs/active/TOOL_PREVIEW_DEVELOPMENT_WORKFLOW.md`
- Modify: `docs/superpowers/specs/2026-07-15-viewer-engagement-prompt-board-governance-design.md`
- Modify: `scripts/viewer-engagement-prompt-board-governance-contract.mjs`

- [x] 配信カンペボード専用sidebarを作らず、共通`PortalShell mode="workspace"`を使う方針を固定する。
- [x] desktopの`expanded`、`rail`、`hidden`、再表示、browser-local状態共有をMVP scopeへ追加する。
- [x] mobile drawer、default mode、既存workspace toolの回帰確認を完了条件へ追加する。
- [x] 共通sidebar task branchをpreview branch topologyとdeterministic contractへ追加する。

### Task 9: 承認済み3画面モックを正式なUI基準として保存する

**Files:**
- Add: `docs/mockups/future-tools/viewer-engagement-prompt-board/stream-plan-list-and-live-workspace.png`
- Add: `docs/mockups/future-tools/viewer-engagement-prompt-board/stream-plan-edit.png`
- Modify: `docs/mockups/future-tools/viewer-engagement-prompt-board/README.md`
- Modify: `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`
- Modify: `docs/superpowers/specs/2026-07-15-viewer-engagement-prompt-board-governance-design.md`
- Modify: `scripts/viewer-engagement-prompt-board-governance-contract.mjs`

- [x] 配信プラン一覧、配信プラン編集、配信中ワークスペースの承認済み方向性を保存する。
- [x] 3画面の順序とmock pathをactive task/specへ記録する。
- [x] 生成画像内の仮copyではなく、active task/specをbehavior authorityとして維持する。
