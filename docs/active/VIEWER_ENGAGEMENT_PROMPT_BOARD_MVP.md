# 配信カンペボード MVP Task Board

Date: 2026-07-15

## Current Selection

| Label | Status |
| --- | --- |
| `tool_display_name` | `配信カンペボード` |
| `tool_key` | `viewer-engagement-prompt-board` |
| `tool_priority` | `P1` |
| `comment_translator_priority` | `P0` |
| `mvp_price` | `free` |
| `login_requirement` | `none` |
| `runtime_implementation_status` | `stream-plans-local-complete-verification-and-production-browser-qa-pass` |
| `preview_branch` | `codex/viewer-engagement-prompt-board-preview` |
| `promotion_target` | `main-after-mvp-readiness` |
| `shared_portal_sidebar_scope` | `workspace-common-expanded-rail-hidden` |

Comment TranslatorのGoogle OAuth審査対応、本番不具合、公開ゲートは引き続きP0とする。この文書はComment Translatorのauthority、Google Auth、Cloudflare、Worker binding、環境変数、deploy、public release declarationを変更しない。

## MVP Purpose

配信者が、当日、次回、次々回、日付未定の話題や注意事項を配信プランごとに準備し、配信中にカンペを大きく表示できる無料ツールを提供する。

MVPは無料、ログイン不要、browser-onlyとする。データは`localStorage`へversioned JSONとして保存し、サーバー、Supabase、アカウント、外部APIへ送信しない。

## Approved UI Mock Reference

MVPの画面フローは次の3画面を正式なUI方向性とする。

| Order | Screen | Approved mock reference |
| --- | --- | --- |
| 1 | `配信プラン一覧` | `docs/mockups/future-tools/viewer-engagement-prompt-board/stream-plan-list-and-live-workspace.png` left frame |
| 2 | `配信プラン編集` | `docs/mockups/future-tools/viewer-engagement-prompt-board/stream-plan-edit.png` |
| 3 | `配信中ワークスペース` | `docs/mockups/future-tools/viewer-engagement-prompt-board/stream-plan-list-and-live-workspace.png` right frame |

モックは画面の役割、情報階層、共通Portal sidebar、tool-local navigationの方向性を固定する。生成画像内の仮copy、日時、件数は仕様値ではない。入力検証、状態遷移、responsive、accessibility、保存動作は本文のMVP要件をauthorityとする。

## Stream Plans

配信プランは次の4状態を持つ。

- `idea`: 日付未定のアイデア
- `preparing`: 今後の配信
- `live`: 現在の配信
- `completed`: 完了済み

配信プランには、安定したローカルID、タイトル、予定日時（任意）、配信全体メモ、手動表示順、カンペカード一覧、作成日時、更新日時を持たせる。

`次回`と`次々回`は保存状態にしない。`preparing`の予定日時と手動表示順から導出し、予定日時変更との矛盾を避ける。予定日時があるプランは日時順、同日時または日付未定のプランは手動表示順で扱う。

利用者は配信プランを新規作成、編集、複製、並べ替え、現在の配信へ切り替え、完了、削除できる。日付未定のアイデアを後から今後の配信へ移動できる。

## Prompt Cards

各カンペカードは、安定したローカルID、本文、カテゴリ、配信セグメント、トーン、注意事項、表示順を持つ。

利用者はカードを追加、編集、削除、並べ替え、別の配信プランへ移動できる。

## Live Mode

配信中モードでは次を提供する。

- 現在のカンペを大きく表示
- 前へ、次へ
- 現在位置と総カード数
- カンペ本文のコピー
- 編集画面へ戻る

自動送り、音声操作、OBS操作、ライブコメント連動は行わない。

## Shared Portal Workspace Sidebar

配信カンペボード専用の左panelは作らない。既存`PortalShell mode="workspace"`の共通sidebarを利用し、tool内の`配信プラン`、`カンペ編集`、`配信中`、`データ管理`はmain content上部のlocal navigationとして提供する。

配信カンペボードと同じpreview lineで、全workspace tool向けに次の3状態を実装する。

- `expanded`: iconとlabelを表示
- `rail`: icon中心のコンパクト表示
- `hidden`: sidebarを非表示にしてworkspaceを最大化

`hidden`でも常に再表示buttonを残す。状態はbrowser-localに保存し、Schedule Calendar、Thumbnail Editor、SNS Split Image Maker、Comment Translator、配信カンペボードで共有する。

mobileは既存drawerを維持し、desktopのhidden状態を適用しない。home、tools index、account、legalなどdefault modeの画面は対象外とする。toggleはkeyboard操作、focus、`aria-expanded`または同等の状態通知、開く/閉じるlabelを持つ。

### Portal Workspace Sidebar Implementation Checkpoint

- `implementation_status`: `merged-preview-pr-645`
- `task_branch`: `codex/viewer-engagement-prompt-board-portal-sidebar`
- `preview_base`: `codex/viewer-engagement-prompt-board-preview` at merge commit `689342ecc8b75c93d160d19ca502dcdc2a97856c`
- `state_owner`: `components/portal/PortalWorkspaceSidebarState.ts`
- `browser_storage`: dedicated versioned preference key containing only `version` and `state`; account、session、admin、credential、tool contentは保存しない
- `desktop_behavior`: `expanded` 288px、`rail` 80px、`hidden` 0pxと左下の再表示button
- `isolation`: mobile header/drawerと`mode="default"`はdesktop workspace保存状態から分離
- `focused_red_green`: state owner未実装でREDを確認後、3状態、version/fallback、永続化、keyboard/aria、mobile/default分離、既存workspace routeの契約がGREEN
- `verification`: focused contract、TypeScript、lint、production build、`git diff --check`、high-confidence secret scan、production browser QAを実施
- `browser_qa`: `390 / 820 / 1024 / 1280 / 1366px`でoverflow 0、console error 0。desktopはexpanded、rail、hidden、keyboard reopen、hidden後のreopenへのfocus移送、再表示後のexpanded controlへのfocus復帰、reload後のrail復元、workspace tool間共有を確認し、mobileは保存値hiddenでもdrawerをkeyboardで開けることを確認
- `runtime_audit`: (1) unknown versionでsidebarが消える仮説はversion 999からexpandedへfallbackして否定、(2) desktop hiddenがmobile navigationも隠す仮説は390/820pxのheader/drawer操作で否定、(3) reload/route遷移で共有状態が失われる仮説はreloadと既存workspace 6 routeのrail維持で否定
- `regression_routes`: Schedule Calendar、Thumbnail Editor、SNS Split Image Maker、Comment Translator、`/admin`、`/admin/comment-translator`で共通railとoverflow 0を確認
- `out_of_scope_unchanged`: 配信カンペボードroute/data model/content storage/JSON import-export、Schedule Calendar連携、Comment Translator runtime/public gate、Google Auth、Cloudflare、deploy/public release

## Browser Storage And Backup

- `localStorage`へversioned JSONを保存する。
- JSONバックアップとJSON復元を提供する。
- import前に形式、schema version、必須フィールドを検証する。
- import失敗時は現在の保存データを上書きしない。
- 保存容量不足、保存データ破損、未知のschema versionは利用者向けに表示する。
- 秘密情報や保存したカンペ本文をconsoleやtelemetryへ出力しない。

将来のSchedule Calendar連携は、配信プランの安定したIDと予定日時を受け渡す独立adapterとして追加する。MVPではSchedule Calendar固有ID、同期状態、外部予定データを保存しない。

### Storage Foundation Implementation Checkpoint

- `implementation_status`: `merged-preview-pr-646`
- `task_branch`: `codex/viewer-engagement-prompt-board-storage-foundation`
- `preview_base`: `origin/codex/viewer-engagement-prompt-board-preview` at merge commit `cb1b3299e12d5ac79ffcf22d74e5155b82115ff2`
- `domain_storage_owner`: `lib/viewer-engagement-prompt-board-storage.ts`
- `storage_contract`: schema version `1`、専用key `v-streamer-tools-viewer-engagement-prompt-board`、配信プランとカンペカードだけを含むstrict JSON
- `plan_model`: local ID、title、optional scheduledAt、`idea / preparing / live / completed`、manualOrder、notes、promptCards、createdAt、updatedAt
- `card_model`: local ID、body、category、segment、tone、safetyNotes、order
- `card_enums`: category=`talking-point / question / announcement / reminder / other`、segment=`opening / main / intermission / closing / anytime`、tone=`neutral / casual / energetic / calm / serious`
- `boundary_behavior`: malformed JSON、unknown schema、required/nested/enum/order/timestamp/duplicate ID/extra field不正をreplacement前に拒否する。read/write/storage access失敗時もlast valid in-memory/current datasetを返し、importは永続化成功後だけreplacementを返す
- `sensitive_field_boundary`: account、session、admin、credential、provider、viewer、telemetry、external-service metadataはschema外であり、extra fieldとしてimport/export/save boundaryで拒否する
- `focused_red_green`: owner未実装を理由とするREDを観測後、model/version/parse/import atomicity/storage failure/sensitive-field exclusion contractがGREEN
- `verification`: focused/governance/sidebar regression contracts、`npx tsc --noEmit --pretty false`、`npm run lint`、`npm run build`、`git diff --check`、changed-files secret/suppression scanを実施。build warningは既存middleware deprecationとwebpack cache serializationのみ
- `runtime_audit`: (1) unknown schemaでcurrent datasetを失う仮説、(2) sensitive extra fieldが保存を置換する仮説、(3) quota failure後にcurrent/storageが置換される仮説をsanitized driverで否定
- `ui_qa`: route/component/rendered UIを変更していないため、このtaskではwidth/browser QAは非該当
- `out_of_scope_unchanged`: stream-plan/card UI、live mode、Schedule Calendar連携、login/account sync、Supabase、Stripe、OAuth、external API、telemetry、Comment Translator runtime/release gate、deploy/public release

### Stream Plans Implementation Checkpoint

- `implementation_status`: `local-complete-verification-and-production-browser-qa-pass`
- `task_branch`: `codex/viewer-engagement-prompt-board-stream-plans`
- `preview_base`: `origin/codex/viewer-engagement-prompt-board-preview` at `cb1b3299e12d5ac79ffcf22d74e5155b82115ff2`
- `rendered_route`: `/tools/viewer-engagement-prompt-board`、`PortalShell mode="workspace"`と既存共通workspace sidebarを利用し、tool固有の第2左sidebarは追加しない
- `local_navigation`: このsliceで実動作する`配信プラン`だけをmain content上部に表示し、カンペ編集、配信中、データ管理のplaceholder navigationは追加しない
- `domain_owner`: `lib/viewer-engagement-prompt-board-stream-plans.ts`
- `ui_owners`: `components/viewer-engagement-prompt-board/ViewerEngagementPromptBoardApp.tsx`、`StreamPlanEditor.tsx`、`StreamPlanList.tsx`
- `implemented_behavior`: title、optional scheduledAt、notes、status、manualOrder、stable local ID、createdAt、updatedAtの作成/編集、4 grouping、複製、手動並べ替え、ideaからpreparing、current/live切替、完了、削除
- `ordering_contract`: upcomingはscheduledAt昇順、同日時はmanualOrder、日付未定は日時ありの後でmanualOrder。手動移動は同じscheduledAt bucketまたは日付未定同士だけを許可し、日時境界を越える操作はUIで無効化してdomainでもrejectする。`次回`と`次々回`は表示時だけ導出し保存しない
- `single_current_contract`: 新しいplanをliveへ切り替えると、従来のliveは同一timestampでpreparingへ戻り、対象だけがliveになる。create/edit/switchの各入口で同じ規則を使い、保存/import時にliveが複数あるdatasetはinvalid-dataとして拒否して現在dataを維持する
- `duplicate_contract`: plan/cardのobjectとarrayを深く複製し、plan/card IDとcreatedAt/updatedAtを新規発行する。live/completedの複製はscheduledAtの有無に応じてpreparing/ideaへ戻し、外部/template metadataは追加しない
- `persistence_boundary`: 全mutationは`lib/viewer-engagement-prompt-board-storage.ts`のsave/loadだけを経由する。破損、未知schema、storage unavailable、write failureはsanitized messageを表示し、保存成功前にcurrent datasetを置換しない
- `focused_red_green`: stream-plan domain owner未実装を理由とするREDを確認後、creation/edit各入口のsingle-current transition、sorting、同日時/manual bucket内reorderと日時境界reject、duplicate fresh identity、idea->preparing、complete、delete、manualOrder空欄reject、editor focus復元、複数live保存拒否、persistence/reload、write-failure atomicityがGREEN
- `verification_current`: stream-plan focused contract、既存storage contract、governance contract、Portal workspace sidebar contract、file-size gate、`npx tsc --noEmit --pretty false`、`npm run lint`、`npm run build`、`git diff --check`、changed-files high-confidence secret scan、TypeScript suppression scanはpass。`tool-portal-entry`と`portal-locale-foundation`の2 contractは、このbranchの変更外にある既存copy/locale実装との古い期待値でfailし、stream-plansの判定には使用しない
- `dependency_boundary`: 明示承認後にこのworktreeで`npm ci`を実行し、lockfile/package metadataを変更せず依存を復元した
- `production_browser_qa`: `/tools/viewer-engagement-prompt-board`をproduction serverで390 / 820 / 1024 / 1280 / 1366px確認。4 grouping、作成、metadata編集、複製、手動順、ideaからpreparing、single-current切替、完了、削除、再読込復元、editor開始時title input focusと終了後create CTAへのfocus復元、共有mobile/desktop navigation、horizontal overflow 0、console error 0を確認
- `runtime_audit`: (1) scheduledAt/manualOrderとsingle-current遷移がdriftする仮説は、予定順と旧liveのpreparing復帰/対象だけliveを同時観測して否定、(2) write failureでcurrentまたは保存済みdatasetを置換する仮説は双方の参照維持で否定、(3) duplicateがplan/card identityや参照を共有する仮説はfresh plan/card IDとarray/object分離で否定
- `independent_review`: goal/constraints、QA、code quality、security/privacy、context/historyの5 laneと、design integrity / CJK accessibilityの2 visual laneを実施。日時境界reorder、複数live保存、manualOrder空欄、editor focus復元、schema owner、CTA contrast/CJK wrapの指摘を修正し、fix verificationとvisual再レビューはPASS
- `out_of_scope_unchanged`: prompt-card編集/並べ替え/plan間移動、live-mode大表示/前後/copy、Schedule Calendar連携、login/account sync、Supabase、Stripe、OAuth、external API、provider/live execution、analytics/telemetry、Cloudflare、deploy/public release、Comment Translator runtime/release gate

## MVP対象外

- AIによるカンペ生成、要約、提案
- YouTube、ライブコメント、viewer data、provider metadataの読み取り
- Google OAuthその他のOAuth
- アカウント同期、複数端末同期、クラウド保存
- Supabase、Stripe、billing、Creator/Paid機能
- 共同編集、共有リンク、招待
- OBS連携、音声操作、自動送り
- Schedule Calendarとの実連携
- 通知、リマインダー、外部投稿

## Implementation Task Order

ガバナンスPRが`main`へマージされ、preview branchが作成された後に次の順で進める。

1. `portal-workspace-sidebar`: 共通sidebarのexpanded、rail、hidden、再表示、状態保存
2. `storage-foundation`: data model、schema version、`localStorage`、JSON export/import
3. `stream-plans`: 配信プラン一覧、idea、preparing、live、completed、日時/手動順、複製
4. `prompt-cards`: 配信プラン編集、card編集、並べ替え、別planへの移動
5. `live-mode`: 大表示、前後移動、位置表示、copy
6. `mvp-qa`: responsive、accessibility、error handling、regression
7. `promotion-readiness`: previewから`main`へ送る前のMVP完了判定

各taskはfresh worktreeと短命branchを使い、PR targetを`codex/viewer-engagement-prompt-board-preview`にする。

## MVP Completion Criteria

- 配信プランとカードの追加、編集、削除、複製、並べ替え、移動が動作する。
- `idea -> preparing -> live -> completed`が一貫して遷移する。
- 予定日時あり・なしの順序が仕様どおりである。
- 再読み込み後にブラウザ保存から復元できる。
- 正常なJSON backup/restoreが動作する。
- 不正JSON、未知schema、保存失敗で既存データを失わない。
- login、Supabase、OAuth、external APIなしで動作する。
- desktop workspaceで共通sidebarのexpanded、rail、hidden、再表示が動作する。
- mobile drawerとdefault modeの画面に回帰がない。
- keyboard操作、focus、見出し、button label、状態通知が確認できる。
- `390 / 820 / 1024 / 1280 / 1366px`で主要操作欠落と横スクロールがない。
- console errorが0である。
- 既存tool route、build、契約に回帰がない。

MVP完了だけではdeployまたは公開を承認しない。promotion PR、merge、deploy、公開はそれぞれ別の承認境界とする。
