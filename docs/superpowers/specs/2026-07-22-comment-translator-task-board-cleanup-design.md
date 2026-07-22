# Comment Translator Creator Roadmap / Task Board Cleanup Design

Date: 2026-07-22

Status: approved direction, implementation pending written-spec review

## Purpose

`task.md` を現在の運用入口として読みやすくし、Comment Translator の次の実装軸を Creator closed beta の C1 / C3 に切り替える。同時に、完了済みの Free public beta と配信カンペボード MVP の証拠・今後の候補・既存 contract 互換性を失わない。

この整理は docs / contract governance に閉じる。runtime、UI、Supabase schema、Stripe、Cloudflare設定、provider実行、production公開状態は変更しない。

## Branch And Publication Flow

1. `main` を `codex/comment-translator-free-public-beta-integration` へ同期する独立PRを先にmergeする。
2. 同期済みintegration tipから `codex/comment-translator-task-board-creator-roadmap-cleanup` を作る。
3. task整理PRのbaseは `codex/comment-translator-free-public-beta-integration` とする。
4. PR作成、PR merge、Cloudflare preview buildの観測は区別する。手動deployやCloudflare mutationは行わない。
5. task整理PR merge後、C1実装は別のCodex task、fresh worktree、短命branchで開始する。

### Explicit Approval Gates For This Cleanup

2026-07-22のユーザー指示は、このtask内で次の操作を明示的に承認している。

- main → integration同期PRの作成とmerge
- 更新済みintegrationからのtask整理PRの作成とmerge
- 各mergeにより自動開始する、既存のCloudflare preview build結果の読み取り確認

承認済み操作は工程として分離し、各PRはmergeableかつrequired checks成功後にだけmergeする。次は承認されていない。

- 手動deploy / upload
- Cloudflare設定、binding、environment、secretの変更
- production branchまたはproduction gateの変更
- Supabase、Stripe、providerへのexternal mutation
- C1 / C3実装

## Current Facts

- Comment Translator Free public betaはmainへpromotion済みで、Google OAuth承認、login-only activation、final release declaration、final production smokeまで完了している。
- 配信カンペボードMVPはPR #660でmainへpromotion済みで、削除dialog follow-up PR #663もmainへmerge済みである。
- `task.md` は現在の索引と長い旧contract互換台帳を同居させている。
- 170本のcontract scriptが `task.md` を参照しているため、旧記述の一括削除はしない。
- tracked Markdownに空ファイルまたは同一blobの重複は確認されていない。

## Target Information Architecture

### `task.md`

先頭を現在の運用authorityとして整理する。

- P0: Comment Translator Creator closed beta
- first implementation sequence: C1 durable paid entitlement store、次にC3 paid usage and monthly reset
- Completed checkpoint: Comment Translator Free public beta
- P1: 配信カンペボード post-MVP
- Workflow: tool-specific integration / preview branchへの短命branch PR
- current premises、approval boundary、verification baseline、canonical authorityへの短いリンク

長い過去証拠は `Legacy Contract Compatibility Ledger` として現在タスクから明確に分離する。新しい長文履歴は追加しない。

### Heading-Level Transfer Map

integration base `e465e6b99a4c9082cd5f95b96ba585c15c37ab4a` の見出しを次のように扱う。

| Current heading | Action | Destination / retained role |
| --- | --- | --- |
| `Current Task Index` | rewrite and keep | 現在のP0 / P1 / completed checkpointとauthority link |
| `Current Premises` | keep and compact | branch、verification、secret、1 PR 1 scopeの現行ルール |
| `Legacy Contract Compatibility Ledger` | keep as a short boundary | archiveへのリンクと「新規長文を追加しない」宣言 |
| `Current Branch` | archive | 旧branch別実装・verification記録 |
| `Primary Goal` | split | 完了済みFree public beta目標はarchive、Creator closed beta目標は新active authority |
| `Branch Strategy` | rewrite and keep | 最新integrationから短命branchを作る現行方針 |
| `Current Free Public Beta State` | archive with compact completed pointer kept | 完了証拠はarchive、現在値はtask indexに1行保持 |
| `Public Launch Next Flow` | archive | 完了済みlaunch sequence |
| `Pre-Step 5 Hardening Board` | archive | 完了済みhistorical board |
| `Latest Sanitized Evidence Summary` | archive | 完了済みFree beta evidence |
| `Current Blockers / Residual Risks` | split | 解消済み項目はarchive、Paidに関係する現行riskはCreator authority |
| `Account Limits / Entitlement Control` | compact and keep | Free fallbackとC1 / C3 authorityへのpointer |
| `Approval-Gated Actions` | split and keep compact | 現行Paid / external gateはtaskとCreator authority、完了済みFree gate履歴はarchive |
| `Canonical Documents` | rewrite and keep | 現行active authorityとarchiveの明示 |
| `Initial Release Decisions` | keep | Free-before-Paid、provider、language、privacy等の固定判断 |
| `Later Work / Post-MVP Roadmap` | keep intact | C1-C12、CP1-CP2、P1-1-P1-9を同じIDと意味で保持 |
| `Verification Baseline` | keep | docs / runtime / UI / live実行別の確認境界 |
| `Contract Compatibility Anchors` | keep | server-only、secret、provider、quota / billing境界 |

移転順序は固定する。

1. archiveを先に作り、移転元のhistorical textと意味が保存されたことを確認する。
2. Creator authorityを追加し、Paidのcurrent goal / risk / gateを記録する。
3. `task.md` のcurrent sectionsを再構成する。
4. contractを実行し、archiveまたはcanonical authorityへ移す必要があるhistorical assertionだけを限定更新する。
5. 全contract成功後にだけ、archive済みhistorical textの重複を `task.md` から除く。

### Creator Closed Beta Authority

`docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md` を新しいactive authorityとして追加する。

この文書は次を所有する。

- C1からC12までの順序、状態、依存関係
- CP1とCP2
- P1-1からP1-9までのPublic-after-P1候補
- C1 / C3の安全なFree fallback
- Stripe live操作、remote Supabase変更、provider実行、deployの承認境界
- C1完了条件とC3へのhandoff条件

### Historical Archive

整理前の旧Free beta / branch / verification台帳は、日付付きの `docs/archive/TASK_LEGACY_CONTRACT_LEDGER_2026-07-22.md` へ保存する。

archiveには過去状態であること、現在authorityではないこと、secretやprivate identifierを含めないことを明記する。Git履歴だけをarchiveの代替にはしない。

### 配信カンペボード Authority

`docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md` は削除・archiveしない。

- MVP完了とPR #660 / #663のmain包含状態を現在値へ更新する。
- 既存のMVP実装順、MVP対象外、Schedule Calendar adapter候補、将来の連携候補を保持する。
- MVP完了を製品開発終了とは扱わず、`task.md` のP1からこのactive authorityへリンクする。
- Comment TranslatorのC1 / C3とカンペのpost-MVP実装を同じPRへ混ぜない。

## Preservation Invariants

以下のIDと意味は削除・改名しない。

- Creator closed beta: C1、C2、C3、C4、C5、C6、C7、C8、C9、C10、C11、C12
- Creator public paid launch: CP1、CP2
- Public-after-P1: P1-1、P1-2、P1-3、P1-4、P1-5、P1-6、P1-7、P1-8、P1-9
- 配信カンペボード: post-MVPの将来候補、MVP対象外として記録された将来連携、既存active authorityへの参照

Paid entitlementが未完成、欠損、読取不能、inactiveの場合はFreeまたはpaid-inactiveへ安全にdegradeする既存方針を維持する。

ID比較元はintegration baseの `task.md` にある `Later Work / Post-MVP Roadmap` とする。整理後は同じIDと意味を `task.md` と `docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md` の両方で確認する。

配信カンペボードの比較元はintegration baseの `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md` 全文とし、少なくとも `MVP対象外`、`Implementation Task Order`、Schedule Calendar adapter候補、将来連携を示す既存記述が欠落しないことを確認する。

## Contract Compatibility Strategy

1. 整理前の互換台帳をarchiveへ保存する。
2. 現在の運用判断に必要な記述は `task.md` または新しいactive authorityに置く。
3. contractが過去の実装証拠だけを `task.md` に要求している場合は、archiveまたは既存canonical active docを読むよう限定的に更新する。
4. runtime挙動、security boundary、fail-closed条件を検証するassertionは削除・弱体化しない。
5. contract移行が大きくなる場合は、互換anchorを `task.md` に残し、別cleanupへ延期する。

## Archive And Deletion Policy

- archive保存とcontract再確認が完了する前に旧記述を削除しない。
- 今回、tracked active documentのファイル削除は行わない。
- `docs/active` 81件の一括archiveは行わない。
- 空、重複、参照なしが証明できないファイルは削除しない。
- 今回削除できるのは、archiveへ保存済みで、current authorityではなく、contractにも不要と確認できた `task.md` 内の重複した旧説明だけとする。
- 配信カンペボードの将来候補は削除対象にしない。

## Verification

- C1-C12、CP1-CP2、P1-1-P1-9が整理後も全件存在することを機械的に確認する。
- `task.md` から配信カンペボードactive authorityへ到達でき、将来候補が保持されていることを確認する。
- base commit `e465e6b99a4c9082cd5f95b96ba585c15c37ab4a` では `rg -l 'task\.md' scripts --glob '*.mjs'` が170本を返す。実装直前に対象集合を再取得し、増減があれば理由と対象を記録する。
- 再取得した `task.md` 参照contract scriptをすべて実行し、PR作成前に全件exit 0とする。170本のままなら合格条件は170 / 170である。
- `current regression` は必ずblockする。
- `stale historical assertion` は失敗したまま許容しない。archiveまたはcurrent canonical authorityへの同等assertionに更新し、そのscriptが成功した場合だけ解消扱いにする。
- `environment limitation` により1本でも実行できない場合はPRを作成しない。互換anchorを残して変更範囲を縮小し、全件実行可能な形へ戻す。
- 変更したcontract scriptは `node --check` を通す。
- `git diff --check` を通す。
- changed-file secret / private identifier scanを通す。
- runtime / UIを変更しないため、lint、typecheck、build、幅別browser QAは原則不要とする。contract変更がruntime sourceへ波及した場合はこの整理PRを止め、別scopeへ分離する。

## Failure Handling

- 必須ID、カンペ将来候補、fail-closed方針のいずれかが欠落した場合はPRを作成しない。
- contract互換のために大幅なruntime/script refactorが必要になった場合は、`task.md` の互換anchorを残して整理範囲を縮小する。
- contract失敗を既知問題として残したままPR作成またはmergeへ進まない。
- merge conflictまたはintegration tipの変化があれば、最新integrationを再取得して差分を再監査する。
- Cloudflare preview checkが失敗した場合、task整理PRのdiffと無関係と断定せず、check evidenceを確認してmergeを止める。

## Out Of Scope

- C1またはC3 runtime実装
- Supabase migration作成・apply・remote query/mutation
- Stripe Product、Price、Checkout、Portal、Webhookのlive操作
- OpenAI / Azure / YouTube provider実行
- Cloudflare設定変更、手動deploy、production gate変更
- 配信カンペボードのpost-MVP機能実装
- C2、C4-C12、CP1-CP2、P1-1-P1-9の実装

## Completion Boundary

task整理PRは、再取得した全 `task.md` 参照contract、changed contract syntax、`git diff --check`、sanitized scanが成功し、GitHub required checksも成功した場合だけ、今回の明示承認範囲でintegrationへmergeする。merge commitがintegrationに包含され、Cloudflare previewの自動build結果を読み取り確認したらこのcleanupは完了する。手動deployまたは外部mutationは行わない。

次のCodex taskは、最新integration tipからC1 durable paid entitlement storeの設計・実装を開始する。
