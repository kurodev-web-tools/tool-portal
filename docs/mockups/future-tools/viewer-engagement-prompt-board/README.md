# Viewer Engagement Prompt Board Mock

Mock-only / docs-only comparison material. No route, component, storage, auth, billing, live chat connection, comment API, moderation automation, posting API, OAuth, or existing tool behavior is implemented here.

## Images

- `stream-plan-list-and-live-workspace.png` - approved final direction board covering the stream-plan list and live workspace.
- `stream-plan-edit.png` - approved final direction for the dedicated stream-plan edit page.
- `desktop.png` - earlier desktop comparison mock.
- `tablet-landscape.png` - earlier landscape tablet comparison mock.
- `mobile.png` - earlier smartphone comparison mock.

## Approved MVP Screen Flow

1. `配信プラン一覧` - `stream-plan-list-and-live-workspace.png` left frame
2. `配信プラン編集` - `stream-plan-edit.png`
3. `配信中ワークスペース` - `stream-plan-list-and-live-workspace.png` right frame

The approved images define the screen roles, information hierarchy, shared Portal sidebar, and tool-local navigation direction. Exact copy, validation, state transitions, responsive behavior, and accessibility remain governed by `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md` and the active design specification rather than by generated placeholder text.

## Direction Memo

- 想定ユーザー: 配信中に話題、質問、返し、poll idea を手元に置いておきたい VTuber / 配信者。
- 主要 workflow: 配信 topic に合わせて prompt を並べ、segment / tone / safety note で整理し、次に読む prompt を copy / cue する。
- 強み: live API なしでも使える手元の進行補助で、Comment Translator とは別の「配信中の運用」領域を比較できる。
- 実装リスク: live chat 読み取り、viewer profile、AI 生成、moderation automation を入れると privacy / API / quota の設計が必要になる。
- 既存ツールとの接続点: Kuro Live Comment Translator planning、Stream Run-of-Show Planner 候補、Schedule Calendar の配信 topic。

## Notes

- 画像内の UI copy は方向性確認用の仮置きで、正式仕様ではない。
- 初回候補にする場合は manual prompt board に閉じ、live chat / AI generation は later spike に分ける。
