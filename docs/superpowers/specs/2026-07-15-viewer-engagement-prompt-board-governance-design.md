# 配信カンペボード選定・MVP・開発運用設計

## 目的

Google OAuth審査待ちのComment Translatorを引き続き最優先に保ちながら、次の無料ツールとして「配信カンペボード」を選定し、未完成機能を`main`へ混ぜずにMVPを育てられる開発運用を確立する。

この設計を反映する最初の変更は、次ツール選定、MVP境界、タスク管理、プレビューブランチ運用を固定するガバナンス・ドキュメント変更に限定する。配信カンペボードのroute、React component、ブラウザ保存、外部連携その他のruntime実装は、ガバナンス変更が`main`へマージされた後に開始する。

## 選定結果

- ユーザー向け名称: `配信カンペボード`
- 内部識別子: `viewer-engagement-prompt-board`
- MVP提供形態: 無料、ログイン不要、ブラウザ内完結
- 選定理由:
  - AI、YouTube、OAuth、ライブコメントAPIなしで独立した価値を提供できる。
  - 配信中に次の話題や注意事項を確認する用途が明確である。
  - 当日分だけでなく、次回、次々回、日付未定のアイデアを先行準備できる。
  - Comment Translatorと同じ配信中領域を補完しながら、providerやGoogle Auth境界を共有しない。
  - 将来はSchedule Calendarから配信予定を受け取れるが、MVPでは連携を実装しない。

既存の`docs/future/FUTURE_TOOL_MOCK_CATALOG.md`が推奨していたStream Run-of-Show Plannerではなく、ユーザーが無料カンペ用途を明示的に選択した結果として本ツールを正式選定する。Future Tool Mock Catalogは比較時点の記録を残しつつ、現在の選定結果を追記する。

## MVP利用体験

### 承認済みUIモック

MVPは`配信プラン一覧 -> 配信プラン編集 -> 配信中ワークスペース`の3画面フローとする。

- `配信プラン一覧`: `docs/mockups/future-tools/viewer-engagement-prompt-board/stream-plan-list-and-live-workspace.png`の左frame
- `配信プラン編集`: `docs/mockups/future-tools/viewer-engagement-prompt-board/stream-plan-edit.png`
- `配信中ワークスペース`: `docs/mockups/future-tools/viewer-engagement-prompt-board/stream-plan-list-and-live-workspace.png`の右frame

これらは画面構成、情報階層、共通Portal sidebar、tool-local navigationの最終方向性である。生成画像内の仮copy、日時、件数を実装仕様として固定せず、入力検証、状態遷移、responsive、accessibility、保存動作は本設計とactive MVP task boardをauthorityとする。

### 配信プラン一覧

利用者は配信ごとのカンペセットを「配信プラン」として管理する。画面は次の4区分を持つ。

1. 現在の配信
2. 今後の配信
3. 日付未定のアイデア
4. 完了済み

配信予定日時は任意とする。日付が決まっていない雑談ネタや注意事項も先に記録でき、後から予定済みの配信へ移動できる。予定日時があるプランは近い順に表示する。

配信プランでは、新規作成、編集、複製、現在の配信への切り替え、完了、アーカイブ、削除を行える。複製は定番構成や前回の流れを再利用する用途に限定し、外部テンプレート共有は行わない。

### カンペ編集

各配信プランは複数のカンペカードを持つ。カードでは次を編集する。

- 本文
- カテゴリ
- 配信セグメント
- トーン
- 注意事項
- 表示順

カードの追加、編集、削除、並べ替え、および別の配信プランへの移動を提供する。配信プラン全体にも任意メモを持たせる。

### 配信中モード

現在のカンペを読みやすい大きさで表示し、前へ、次へ、本文コピー、編集画面へ戻る操作を提供する。現在位置と総カード数を表示する。自動送り、音声操作、OBS操作、ライブコメント連動はMVPに含めない。

### 共通Portal workspace sidebar

配信カンペボード専用の左navigationは作らず、既存`PortalShell mode="workspace"`の共通sidebarを使う。配信プラン、カンペ編集、配信中、データ管理はmain content上部のtool-local navigationとして提供し、portal navigationと二重化しない。

配信カンペボードの実装と同じpreview lineで、全workspace toolが再利用できる共通sidebar状態を追加する。

- `expanded`: iconとlabelを表示
- `rail`: icon中心のcompact表示
- `hidden`: workspaceを最大化し、常に再表示buttonを残す

状態はbrowser-localに保存し、workspace tool間で共有する。mobileは既存drawerを維持してdesktopのhidden状態を適用しない。home、tools index、account、legalなど`mode="default"`の画面は対象外とする。Schedule Calendar、Thumbnail Editor、SNS Split Image Maker、Comment Translatorで既存navigationとworkspace layoutの回帰を確認する。

## データと保存

MVPのデータはログイン不要の`localStorage`へversioned JSONとして保存し、サーバー、Supabase、アカウント設定、Cookie、外部APIへ送信しない。テキスト中心のMVPで十分な容量と単純さを優先し、IndexedDBは初回に導入しない。

### 配信プラン

- 安定したローカルID
- タイトル
- 予定日時（任意）
- 状態: `idea`、`preparing`、`live`、`completed`
- 同一状態内の手動表示順
- 配信全体メモ
- カンペカード一覧
- 作成日時と更新日時

### カンペカード

- 安定したローカルID
- 本文
- カテゴリ
- 配信セグメント
- トーン
- 注意事項
- 表示順

`次回`と`次々回`は保存状態にせず、`preparing`の予定日時と手動表示順から導出する。予定日時があるプランは日時順、同日時または日付未定のプランは手動表示順を使う。これにより、予定日時の変更と次回表示が矛盾しない。

保存データは明示的なschema versionを持つ。MVPではSchedule Calendar固有IDや外部同期情報を保存しない。将来の連携は、配信プランの安定したIDと任意の予定日時を受け渡す独立adapterとして追加し、現在のローカルモデルを外部サービスへ直接依存させない。

JSONによる全データのexport/importを提供する。importはファイル形式、schema version、必須フィールドを検証し、失敗時に現在の保存データを上書きしない。ブラウザ保存容量不足、保存データ破損、import失敗は、機密情報や生データをログへ出さず利用者向けメッセージで示す。

## MVP対象外

- AIによるカンペ生成または要約
- YouTube、ライブコメント、viewer data、provider metadataの読み取り
- Google OAuthその他のOAuth
- アカウント同期、複数端末同期、クラウド保存
- 共同編集、共有リンク、招待
- OBS連携、音声操作、自動送り
- Schedule Calendarとの実連携
- 通知、リマインダー
- 外部投稿、課金、Creator/Paid機能
- Supabase、Stripe、Google Auth、Comment Translator runtimeの変更

## タスク・ドキュメント整理

最初のガバナンス変更では次のauthorityを整える。

- `task.md`
  - 先頭に、リポジトリ全体の現在優先度、作業中ブランチ、各詳細authorityへの短い参照だけを置く`Current Task Index`を追加する。
  - Comment TranslatorをP0、配信カンペボードをP1として記録する。
  - 既存の長い本文は169本の契約スクリプトから参照されているため、最初のガバナンス変更では削除・移動せず、`Legacy Contract Compatibility Ledger`として索引より下に残す。
- `docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md`
  - Comment TranslatorのGoogle審査待ち、公開ゲート、残タスクの詳細authorityとして継続する。
- `docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`
  - 配信カンペボードのMVP境界、タスク順、完了条件、対象外を記録する。
- `docs/active/TOOL_PREVIEW_DEVELOPMENT_WORKFLOW.md`
  - ツール単位のpreview branch、短命task branch、PR target、promotion条件を記録する。
- `docs/future/FUTURE_TOOL_MOCK_CATALOG.md`
  - 比較履歴を保持したまま、配信カンペボードが現在の選定ツールであることを追記する。

新しい詳細状態は各active authorityへ記録し、`task.md`の互換台帳へ新しい長文を追加しない。既存契約が`task.md`ではなく各canonical authorityを読むよう段階的に移行した後、完了履歴や置き換えた長文を`docs/archive`へ移す。最初のガバナンス変更だけで169本の契約参照を一括変更しない。

## Git・preview運用

ガバナンス変更は最新`origin/main`から独立worktreeとfeature branchを作り、`main`向けPRとして先にマージする。配信カンペボードのruntime実装はこのPRに含めない。

マージ後、更新済み`origin/main`から長期preview branch `codex/viewer-engagement-prompt-board-preview`を作る。実装タスクは毎回fresh worktreeと短命branchを作り、PR targetをpreview branchにする。複数の新ツールを同じpreview branchへ混ぜない。

共有済みpreview branchの履歴はrebaseで書き換えず、必要に応じて`main`を取り込む。Comment Translatorの審査対応や本番不具合はP0として独立branchから`main`向けPRにし、配信カンペボードのpreview作業へ混ぜない。

MVPの全完了条件とbrowser QAを満たした後だけ、preview branchから`main`へのpromotion PRを作成する。promotion、merge、deploy、公開はそれぞれ既存の承認境界に従う。

## 実装タスク分割

ガバナンスPRのマージ後、preview branch上で次の順に進める。

1. 共通Portal workspace sidebarの`expanded`、`rail`、`hidden`
2. データモデル、versioned browser storage、JSON export/import
3. 配信プラン一覧、アイデア、予定、現在、完了の状態管理
4. カンペカード編集、並べ替え、別プランへの移動、プラン複製
5. 配信中の大表示モードと前後移動
6. responsive、accessibility、エラー表示、MVP QA
7. previewから`main`へのpromotion readiness

各task PRは、そのtaskだけで観察可能な完了条件と最小の検証を持つ。別taskの未実装を仮のproduction behaviorとして約束しない。

## 検証方針

ガバナンス変更では、次ツール選定、MVP対象外、authority、preview branch、PR target、promotion条件をdeterministic contractで固定し、`git diff --check`と変更ファイルのsecret scanを行う。runtime/UIを変更しないため、この段階ではbrowser QAを行わない。

MVP実装では次を検証する。

- 配信プランとカードの追加、編集、削除、複製、並べ替え、移動
- `idea -> preparing -> live -> completed`の状態遷移
- 予定日時あり・なしの並び順
- 再読み込み後の保存復元
- 正常なJSON backup/restore
- 不正JSON、未知のschema version、保存容量不足で既存データを失わないこと
- ログイン、Supabase、OAuth、外部APIなしで動作すること
- desktop workspaceでportal sidebarのexpanded、rail、hiddenと再表示が動作し、mobile drawerとdefault modeへ影響しないこと
- keyboard操作、focus、見出し、ボタン名、読み上げ可能な状態表示
- `390 / 820 / 1024 / 1280 / 1366px`で横スクロールと主要操作欠落がないこと
- console errorがないこと
- 既存ツールのroute、build、契約へ回帰がないこと

## 完了条件

ガバナンス変更の完了条件は、配信カンペボードの選定、MVP境界、保存方式、将来連携境界、タスクauthority、preview運用、実装順が単一の整合した文書群と契約で確認でき、Comment TranslatorのP0 authorityと既存の公開境界を変更していないことである。`task.md`先頭の索引からP0/P1を確認でき、既存の契約互換台帳と169本の参照を壊していないことも確認する。

MVP自体の完了条件は別のactive task boardで管理し、ガバナンスPRのマージだけで配信カンペボードを公開済みまたはruntime実装済みとは扱わない。
