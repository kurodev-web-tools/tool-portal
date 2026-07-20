# 配信カンペボード X紹介動画 Design

## Goal

Xで配信カンペボードを紹介し、投稿本文のリンクから実際の利用へつなげる。初見の配信者が約25秒で「配信プラン作成 → カンペ追加 → 配信中モード」という一連の流れと、配信中に次の話題へ迷いにくくなる価値を理解できることを成功条件とする。

## Locked decisions

- X専用、1920 x 1080、16:9、30fps、750 frames、約25秒、MP4/H.264。
- 音声、ナレーション、BGMは入れない。無音でも字幕とモーションだけで意味が完結する。
- BGMは将来追加できる構造にするが、日本語版・英語版とも今回の出力はmutedとする。
- 実ブラウザ画面は録画しない。Remotion内で配信カンペボードのUIをReact/CSSとして再構成する。
- UIは実プロダクトのダークテーマ、情報階層、深めのティール、8px基準の角丸、薄い境界線へ忠実にする。演出は操作箇所のズーム、カーソル、入力、状態変化だけを少し強調する。
- デモ内容は架空の雑談配信とし、実ユーザー情報、ブラウザ保存、アカウント情報、外部API、production screenshotを使わない。
- 動画内にURLを表示しない。エンドカードは「無料ですぐ使える」「配信カンペボード」「リンクは投稿本文へ」とする。
- 日本語版を先に完成・確認し、ユーザー承認後に同じモーションとタイムラインから英語版を制作する。
- SNSへの実投稿は動画制作と分離した明示承認事項とする。本制作の成果物は動画ファイル、レビュー静止画、投稿文まで。

## Source authority and prior-art boundary

- プロダクトUIのauthorityは`docs/design.md`、`docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md`、および現在の配信カンペボードcomponent/copy ownerとする。
- 別worktreeにある翻訳ツール紹介動画はGit追跡済みのauthorityではなく、read-onlyの非正規prior-art snapshotとしてのみ扱う。本仕様はそのfileの存在に依存せず、実装時にimport、copy、変更をしない。
- 独立package、typed locale content、deterministic timeline、muted render、artifact preservationという一般的な制作パターンだけを本仕様内で自己完結して定義する。翻訳ツールのコピー、正方形レイアウト、配色、デモUIは流用しない。

## Delivery stages

### Stage A: 日本語版

1. 日本語Compositionだけを登録し、日本語UI、字幕、雑談配信fixtureを実装する。shared componentはlocaleを受け取れるinterfaceにしてよいが、英語Compositionと英語visible contentはまだ実装しない。
2. 完成MP4とシーン境界のレビュー静止画を出力する。
3. テンポ、字幕量、UIの読みやすさ、操作順、エンドカードをユーザーが確認する。
4. 指摘がある場合は日本語版だけを修正し、再レンダーする。
5. 承認候補は動画package sourceと本仕様がcleanなexact commit/treeにある場合だけfinal扱いにする。未commit sourceからのrenderはpreviewであり承認対象にしない。
6. ユーザーが日本語MP4と指定9枚の静止画を明示承認した場合に限り、承認対象のhash、source provenance、承認時刻を`out/ja/approval.json`へ記録して日本語版を凍結する。承認を推測して記録しない。

### Stage B: 英語版

1. Stage Aの明示承認後に開始する。
2. 英語typed contentと英語Compositionを追加する。タイムライン、モーション、画面構造、色、safe areaは日本語版と共有する。
3. 必要な範囲で英語固有のfont sizeとline breakだけを調整する。
4. 英語版追加後のsourceから日本語9 frameだけを`out/.tmp/ja-regression/review/`へ再レンダーし、承認済み`out/ja/review/`とdecoded RGBAで比較してpixel mismatch 0を確認する。日本語MP4は再生成せず承認済みSHA-256不変を照合する。
5. 英語版だけを`out/en`へfull renderする。Stage Bのcommandは`out/ja`へ書き込まず、日本語版を再レンダーまたは上書きしない。

## Storyboard and timeline

| Time | Frames | Purpose | Visible content and motion |
| --- | ---: | --- | --- |
| 0–3s | 0–89 | 問題提起 | 暗い背景へ短いメモが散らばり、`配信中、次に何を話すか迷ってない？`を表示。メモは小さな位置ずれだけで落ち着かなさを示す。 |
| 3–7s | 90–209 | 配信プラン作成 | UIへフェードし、カーソルが`新しい配信プラン`を選択。`週末雑談`が短いタイプ表示で入り、プランカードが確定する。字幕は`まずは配信プランを作成`。 |
| 7–13s | 210–389 | カンペ追加 | `カンペ編集`へ移り、3件のカンペを順に追加。カード出現をモーションの拍にする。字幕は`話したいことをカンペにまとめる`。 |
| 13–19s | 390–569 | 配信中モード | プラン一覧へ戻り、`現在の配信にする`を選んで`週末雑談`をlive状態にする。`配信中`を開き、最初のカンペを表示後、`次のカンペ`で2件目へ切り替える。字幕は`配信中は、今の話題に集中`。 |
| 19–22s | 570–659 | 価値の要約 | UI全体を緩やかに引き、`準備から配信中まで、話すことをひとつに。`を表示する。 |
| 22–25s | 660–749 | CTA | ブランドカラーのエンドカードへ切り替え、`無料ですぐ使える`、`配信カンペボード`、`リンクは投稿本文へ`を表示する。 |

Scene transitionは8〜14 framesのopacityと小さなtranslate/scaleで行う。タイムライン上の意味順序は、プラン確定前にカンペを見せない、カンペ追加前に`現在の配信にする`を押さない、live状態になる前に`配信中`workspaceを見せない、`次のカンペ`を押す前に2件目をcurrent表示しない、という実プロダクトの因果を守る。カンペに完了状態があるような演出やコピーは使わない。

## Deterministic demo fixtures

### Japanese

- plan title: `週末雑談`
- plan ID: `plan-weekend-chat`
- prompt 1: `{ id: "prompt-weekly-recap", body: "今週あったこと", category: "talking-point", segment: "main", tone: "casual", safetyNotes: "", order: 0 }`
- prompt 2: `{ id: "prompt-current-favorite", body: "最近ハマっているもの", category: "talking-point", segment: "main", tone: "casual", safetyNotes: "", order: 1 }`
- prompt 3: `{ id: "prompt-weekend-question", body: "みんなの週末予定を聞く", category: "question", segment: "closing", tone: "casual", safetyNotes: "", order: 2 }`
- primary status progression: idea plan created → prompts added → `現在の配信にする` → live workspace opened → prompt 1 selected → `次のカンペ` → prompt 2 selected

### English

- plan title: `Weekend Chat`
- plan IDと各promptのID、category、segment、tone、safetyNotes、orderは日本語版と同一。
- prompt 1 body: `What happened this week`
- prompt 2 body: `What I’m into lately`
- prompt 3 body: `Ask about everyone’s weekend plans`
- status progressionは日本語版と同一で、prompt completionは含まない。

Fixtureはsource内のreadonly dataとし、runtime date、random ID、network、browser storageを参照しない。contract testはprompt 1と2が同じ`talking-point` categoryでorder 0/1の連続順であること、JA/ENの構造fieldが同一でbodyだけがlocale化されることをassertする。

## Visible copy

### Japanese captions

1. `配信中、次に何を話すか迷ってない？`
2. `まずは配信プランを作成`
3. `話したいことをカンペにまとめる`
4. `配信中は、今の話題に集中`
5. `準備から配信中まで、話すことをひとつに。`
6. `無料ですぐ使える`
7. `配信カンペボード`
8. `リンクは投稿本文へ`

### English captions

1. `Ever lose track of what to say next?`
2. `Start with a stream plan`
3. `Organize your talking points`
4. `Stay focused on the current topic`
5. `From prep to live, keep every talking point in one place.`
6. `Free to use`
7. `Live Prompt Board`
8. `Link in this post`

All visible locale-sensitive text, including UI labels, form values, tabs, statuses, captions, fixture content, and CTA, belongs to one typed locale content contract. Shared scene components must not hardcode Japanese or English product copy.

## X post copy

### Japanese

```text
配信中に「次、何を話そう？」となる前に。

配信プランの作成から、話題の整理、配信中のカンペ表示まで、ブラウザだけでまとめて管理できます。

配信カンペボードは無料ですぐ使えます。
🔗 https://streamer-tools.kuro-lab.com/tools/viewer-engagement-prompt-board/

#VTuber #配信者向けツール
```

### English

```text
Never wonder what to talk about next during a stream.

Create a stream plan, organize your talking points, and keep the current prompt visible while you’re live—all in your browser.

Live Prompt Board is free to use.
🔗 https://streamer-tools.kuro-lab.com/tools/viewer-engagement-prompt-board/

#VTuber #StreamerTools
```

The public Japanese tool URL was verified as HTTP 200 before this spec was written. Actual posting, upload preview, and link-card behavior remain a human publication step.

## Visual system

### Direction

`calm stream control desk`。落ち着いた暗色キャンバスの中で、実用的な配信準備UIが順序立って整う。ティールは主要CTA、active tab、current prompt、次カンペへの切り替えだけに使用する。装飾色として全面に広げない。

### Tokens

- canvas: shared dark background相当
- surface: shared dark surface相当
- surface raised:背景より一段明るい面
- border:低主張の細い境界線
- foreground:高コントラストの白寄り文字
- muted:補助説明用のグレー
- primary:深めのティール
- primary support:限定的なミント
- dangerはデモ対象外。削除操作を動画へ含めない。
- base spacing: 8px
- base radius: 8px
- font: package-localの`public/fonts/noto-sans-jp-700-promo-v1.woff2`と`public/fonts/noto-sans-jp-900-promo-v1.woff2`。Noto Sans JPの許諾済みsourceから本動画の全visible code pointを収録した専用subsetとし、同directoryへライセンス文書を置く。system font fallbackで完成扱いにしない。

### Safe area and text bounds

- CTA、字幕、product name、操作の意味を伝えるlabelは、1920 x 1080 canvasの各辺から最低96px内側に収める。
- 装飾背景だけはsafe area外へ出せる。意味を持つUI mockは左右64px、上下64pxより内側に収める。
- scene captionは54px以上、CTA headlineは72px以上、意味を伝えるUI labelは28px以上を基本とする。英語固有調整でも26px未満に縮小しない。
- clipping、overflow、line breakはreview stillごとに確認し、文字を小さくして隠すのではなくmax widthと明示改行で解消する。

### Motion

- frame-deterministicなopacity、transform、filterだけを使う。
- カーソル移動 → click縮小 → 結果確定の順を崩さない。
- 入力は全文を一文字ずつ長く打たず、短いtype revealでテンポを維持する。
- 操作対象へ緩やかにzoomし、次の場面で全体構造へ戻す。
- 激しい回転、過剰な発光、点滅、high-frequency flicker、速いcamera shakeは禁止する。
- 字幕はUIを隠す固定下帯にせず、各sceneの空き領域へ配置する。

## Architecture

動画制作物は`marketing/viewer-engagement-prompt-board-launch-video/`に独立packageとして置く。専用の`package.json`と`package-lock.json`を持ち、root Next.js package metadata/lockfileへRemotion依存を追加しない。Stage Aでは`remotion`と`@remotion/cli`を`4.0.490`、`react`と`react-dom`を`19.2.7`、`typescript`を`6.0.3`、`vitest`を`4.1.10`、`@biomejs/biome`を`2.5.4`へexact pinする。

### Units

- `Root`: Stage Aでは日本語Compositionだけを登録し、Stage Bで英語Compositionを追加する。
- `PromptBoardLaunch`: locale contentとtimelineを受け、sceneを構成する唯一のcomposition owner。
- `content`: typed locale copy、fixture、CTA、visible textを所有する。
- `timeline`: 750 frames、scene境界、cursor/action timing、transition timingを所有する。
- `tokens`: color、type、spacing、radiusを所有する。
- `PromptBoardMock`: header、tabs、plan/card/live stateをpropsだけで描画する。
- `Cursor`: deterministic position、click feedback、target highlightを描画する。
- `Caption`: scene captionの配置とenter/exitを描画する。
- `EndCard`: product name、free CTA、post-link guidanceを描画する。
- `fonts`: 上記2つのexact assetを`FontFace.load()`で読み込み、Remotionの`delayRender`中に待機する。読込成功時だけ`continueRender`し、失敗時は`cancelRender`でrenderを停止する。pre-render contractはJA/ENのcaption、fixture、UI label、CTAに含まれる全Unicode code pointが使用weightのfont cmapに存在することを検査し、1 glyphでも不足すればrenderを失敗させる。

各unitはpropsまたはreadonly dataだけをinterfaceとし、network、browser state、current time、randomnessへ依存しない。

### Composition and output contract

- Japanese Composition ID: `ViewerEngagementPromptBoardLaunchJa`
- English Composition ID: `ViewerEngagementPromptBoardLaunchEn`（Stage Bで追加）
- Japanese MP4: `out/ja/viewer-engagement-prompt-board-launch-ja.mp4`
- English MP4: `out/en/viewer-engagement-prompt-board-launch-en.mp4`
- Both: 1920 x 1080、30fps、750 frames、H.264、yuv420p、muted。
- render commandは`render:ja`と`render:en`へ分離し、一方が他方のdirectoryへ書き込まない。encode中は`out/.tmp/<locale>/`を使い、全検証成功後だけlocale固有のfinal filenameへ移す。
- `verify:ja-preservation`はStage B sourceから日本語9 frameだけを`out/.tmp/ja-regression/review/`へrenderし、承認済みbaselineとdecoded RGBA比較を行う。日本語full MP4をrenderせず、`out/ja`へ書き込まない。

### Artifact and approval contract

各localeの成果物は次の固定layoutにする。`<frame>`は4桁zero paddingとする。

- `out/<locale>/viewer-engagement-prompt-board-launch-<locale>.mp4`
- `out/<locale>/review/frame-0030.png`、`0105`、`0180`、`0270`、`0420`、`0510`、`0600`、`0690`、`0749`
- `out/<locale>/verification.json`: `schemaVersion: 1`、tool version、full `sourceCommit`、root `sourceTree`、worktree clean verdict、composition metadata、ffprobe結果、audio stream count、decode結果、各checkのname/verdict
- `out/<locale>/manifest.sha256`: MP4、9枚のPNG、`post.txt`のSHA-256
- `out/<locale>/post.txt`: locale固有のX投稿文
- `out/ja/approval.json`: `schemaVersion`、`compositionId`、自動取得したfull `sourceCommit`、root `sourceTree`、`approvedAt`、`mp4Sha256`、frame名ごとの`stillSha256`。ユーザー明示承認前は作成しない。

Final render前に`git status --porcelain`が動画package sourceと本仕様について空であること、`sourceCommit`がHEADのfull SHA、`sourceTree`が`HEAD^{tree}`と一致することを必須assertする。Stage B開始時にも`approval.json`、artifact hash、source provenanceを照合する。英語実装後は日本語MP4を再生成せずhashを照合し、Stage B sourceから一時再renderした9枚と承認済みbaselineをdecoded RGBAで比較して各frameのpixel mismatch countが0であることを`out/en/ja-preservation-verification.json`へ記録する。比較はPNG byte列ではなく幅、高さ、全RGBA pixelを対象とし、`manifest.sha256`には`verification.json`とpreservation receiptも含める。

## Failure handling

- fontまたは必須assetが読み込めない場合はrenderを失敗させ、fallbackだけで完成扱いにしない。
- Composition metadata、scene boundary、visible copy、fixture fieldが欠けた場合はcontract testを失敗させる。
- 文字がsafe areaを超えた場合はfont sizeの無条件縮小ではなく、locale固有のline break/max widthで解消する。
- 日本語版承認前は英語版renderを完成扱いにしない。
- 英語版追加で日本語artifact hashまたはaccepted stillが変わった場合は英語版を不合格とし、日本語版を上書きしない。
- render途中の一時fileはfinal filenameと分離し、成功したencodeだけをfinal artifactとする。

## Verification

### Static and contract checks

- Composition dimensions、fps、duration、登録済みIDs、scene boundariesをassertする。
- Stage Aはregistered Composition IDのexact setが`[ViewerEngagementPromptBoardLaunchJa]`であること、日本語typed content completeness、日本語visible copyをassertする。英語Compositionと英語content exportが存在すれば失敗する。
- Stage Bはregistered Composition IDのexact setが`[ViewerEngagementPromptBoardLaunchJa, ViewerEngagementPromptBoardLaunchEn]`であること、日本語契約を保持したまま英語typed content completenessと英語visible copyをassertする。
- fixture-only data、forbidden URL-in-video、audioなし、random/current-time/network/browser-state非依存をassertする。
- 全visible textのcode pointがpackage-local font cmapに存在し、system fallback不要であることをassertする。
- TypeScript、Vitest、Biome、Remotion composition discoveryを通す。

### Render checks

- Stage Aで日本語MP4をfull renderする。
- frames 30、105、180、270、420、510、600、690、749をレビュー静止画として出力する。
- `ffprobe`で1920 x 1080、H.264、yuv420p、30fps、約25秒、audio stream 0を確認する。
- full video decodeを通し、破損frameがないことを確認する。
- Stage Bは英語MP4と同じ9 frameをfull renderし、同じffprobeとfull decodeを行う。その前に`verify:ja-preservation`を通す。

### Review-frame acceptance map

| Frame | Expected scene and state | Required visible evidence |
| ---: | --- | --- |
| 30 | 問題提起 | 散らばったメモと`配信中、次に何を話すか迷ってない？`。essential textは96px safe area内。 |
| 105 | プラン作成開始 | 配信プランworkspace、`新しい配信プラン`操作、caption `まずは配信プランを作成`。 |
| 180 | プラン確定 | `週末雑談`のplan card。まだlive表示やprompt cardを見せない。 |
| 270 | カンペ追加 | `カンペ編集`と少なくとも2件の雑談fixture、caption `話したいことをカンペにまとめる`。 |
| 420 | live切替 | `現在の配信にする` click直後で、`週末雑談`のstatusがliveへ確定している。buttonは通常状態へ戻っている。 |
| 510 | 配信中workspace | prompt 1 `今週あったこと`がselected/currentで、`次のカンペ`が見える。 |
| 600 | 価値要約 | prompt 2への切替後のUIと`準備から配信中まで、話すことをひとつに。`。完了表現なし。 |
| 690 | CTA | `無料ですぐ使える`、`配信カンペボード`、`リンクは投稿本文へ`。URLなし。 |
| 749 | CTA最終frame | 同じCTAがclippingなく保持され、fade-to-black前提の欠落がない。 |

### Visual QA

- 字幕・UI copy・fixtureが指定localeである。
- text clipping、safe-area逸脱、重なり、低コントラスト、CJK不自然改行がない。
- cursor targetとUI state changeが一致する。
- plan → cards → liveの順序とcurrent promptの進行が理解できる。
- CTAが最低2秒読め、動画内にURLがない。
- 日本語版承認後、英語版に同じ検証を行い、日本語accepted artifactの不変も確認する。

## Deliverables

### Stage A

- standalone Remotion source
- Japanese MP4
- Japanese review stills
- Japanese artifact hashes and verification receipt
- Japanese X post copy

### Stage B after approval

- English locale content and Composition
- English MP4
- English review stills
- Japanese preservation evidence
- English artifact hashes and verification receipt
- English X post copy

## Out of scope

- Xへの投稿、予約投稿、広告出稿、analytics/telemetry
- production app、route、storage schema、prompt-board runtimeの変更
- login、account sync、Supabase、Stripe、OAuth、AI/provider/comment/viewer integration
- browser recording、実ユーザーdata、production screenshot
- BGM/SE/ナレーション制作と音源ライセンス調達
- 縦型、正方形、YouTube Shorts、TikTok、Instagram Reels向けvariant
