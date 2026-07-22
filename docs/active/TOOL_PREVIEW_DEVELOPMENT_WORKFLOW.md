# Tool Preview Development Workflow

Date: 2026-07-15

## Purpose

新しいツールを未完成のまま`main`へ混ぜず、task単位でreview可能にし、MVP完了後だけproduction lineへ昇格する。

## Priority Boundary

- Comment TranslatorのGoogle審査対応、本番不具合、公開ゲートを`P0`とする。
- 配信カンペボードを`P1`とする。
- P0作業は独立branchから`main`向けPRにし、新ツールのpreview branchへ混ぜない。
- 新ツール作業はP0対応が必要になった場合に中断可能な単位へ分ける。

## Branch Topology

```text
origin/main
└─ codex/viewer-engagement-prompt-board-preview
   ├─ codex/viewer-engagement-prompt-board-portal-sidebar
   ├─ codex/viewer-engagement-prompt-board-storage
   ├─ codex/viewer-engagement-prompt-board-plans
   ├─ codex/viewer-engagement-prompt-board-cards
   ├─ codex/viewer-engagement-prompt-board-live-mode
   └─ codex/viewer-engagement-prompt-board-mvp-qa
```

- 長期のshared preview branchは`codex/viewer-engagement-prompt-board-preview`とする。
- 各task branchは最新preview branchからfresh worktreeへ作る。
- 複数の新ツールを同じpreview branchへ混ぜない。
- task branchは一つの観察可能な成果と最小検証に限定する。

## PR Target

- 各task branchのPR targetは`codex/viewer-engagement-prompt-board-preview`とする。
- task PRのmergeだけで`main`、production、publicへ公開されたとは扱わない。
- MVP完了条件とbrowser QAを満たした後だけ、preview branchから`main`へのpromotion PRを作る。
- promotion PR、merge、deploy、public releaseはそれぞれ既存の承認境界に従う。

## Sync And History Safety

- shared preview branchをrebaseまたはforce-pushしない。
- `main`の必要な修正はmergeでpreview branchへ取り込む。
- conflictはtask branchではなく、影響範囲を確認できる専用同期作業として扱う。
- root checkoutまたは他のdirty worktreeを再利用しない。
- merge済みworktreeの削除は別の明示承認とclean/merged再確認後に行う。

## Task Handoff

各taskのhandoffには次を含める。

- preview base branchとbase commit
- task branchとworktree
- scope、out-of-scope、completion criteria
- changed filesとverification
- preview browser QAが必要か
- commit、push、PR、merge、deployの実施状況
- 次taskの候補と未解決blocker

## Promotion Readiness

previewから`main`へのpromotion PRを作れるのは次をすべて満たした場合だけとする。

- active MVP task boardの全MVP taskがcomplete
- focused contracts、lint、typecheck、production buildがpass
- required viewport browser QAがpass
- accessibilityとbrowser storage failure pathが確認済み
- shared `PortalShell` sidebarのexpanded、rail、hidden、mobile drawer、default mode、既存workspace tool回帰が確認済み
- runtime boundaryとMVP対象外にdriftがない
- secret、token、private identifier、raw user contentがevidenceへ混入していない
- unresolved P0 regressionがない

promotion readinessはmerge、deploy、公開の承認ではない。
