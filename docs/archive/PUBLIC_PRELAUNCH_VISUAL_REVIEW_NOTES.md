# Public Prelaunch Visual Review Notes

公開前の in-app browser 注釈を一時的に集約する作業ノート。`task.md` にはまだ反映せず、PC / タブレット横 / タブレット縦 / スマホ確認後に、公開前に直すものと公開後に回すものへ再整理する。

## 使い方

- 注釈は viewport ごとに追記する。
- 修正実装へ移る前に、`公開前に直す候補` / `公開後でもよい候補` / `英語対応に回す候補` を再確認する。
- 実装時は一度に広げすぎず、portal copy / portal card / Schedule Calendar / Thumbnail Editor / SNS Split Image Maker のように PR 単位を分ける。
- このファイルは作業ノートなので、公開後に必要な項目だけ `task.md` または `docs/archive` へ移す。

## 公開前改善タスク案

### Task 1: Portal public copy / status polish

優先度: 高。公開前に直す。

対象:
- Home hero copy と右側 summary。
- Home suite card の tool count / 準備中 card 表示。
- Home / Tools の公開向け説明文。
- 不具合報告 / 要望導線。
- Tools の準備中 tool card copy。

方針:
- `V` の大きい summary visual は削除または縮小し、3項目の実用 summary に寄せる。
- suite tool count は Tools data と一致させる。準備中 suite / tool は利用可能 item と視覚的に差を付ける。
- 「MVP公開中」「公開版ではまだ利用できません」のような硬い表現を、公開中の利用者向け copy に整える。
- X / Discord の実URLが未確定なら、link button は増やさず「メール、X、Discord で受け付け予定」のような文言整理に留める。

検証:
- `/`、`/tools` を `390 / 820 / 1024 / 1280 / 1366px` で確認。
- body 横 overflow なし、console error / warn なし。
- suite count / available tools / prepared tools の表示が data と矛盾しないこと。

### Task 2: Thumbnail Editor responsive control polish

優先度: 高。公開前に直す。

対象:
- narrow desktop / tablet landscape の header control 見切れ。
- mobile top toolbar の詰まり。
- preset / canvas size / output ratio menu の outside click close。
- 縦長 9:16 / 真四角 1:1 の未実装 option disable。
- mobile bottom nav の `テキスト` label。
- mobile preset label / usage chip の見にくさ。

方針:
- header controls は narrow width で 2 行化または compact grouping する。
- custom dropdown は outside click / Escape で閉じる。native select 風に見える箇所は既存 UI と揃える。
- 未実装 canvas / ratio option は選択不可にして、後続候補であることが分かる copy にする。
- bottom nav は text / image layer 両方に通じる `編集` または `設定` 系の label に変更する。
- chip 群はスマホで横スクロールまたは 2 行制限にして、縦に長くなりすぎないようにする。

検証:
- `/tools/thumbnail-editor` を `390 / 820 / 1024 / 1280 / 1366px` で確認。
- dropdown outside click / Escape close。
- disabled option が選択できず、既存 16:9 flow が壊れないこと。
- export / SNS handoff schema は変更しない。

### Task 3: SNS Split preview / landing copy polish

優先度: 高。公開前に直す。

対象:
- preset landing の `2分割 / 3分割 / 4分割` 説明文。
- `split-2` の `メイン分割` 表示と `split-3 / split-4` の preview 体験差。
- mobile の `メイン分割` 表示が縦に分断されて見える問題。

方針:
- preset landing copy は短く、最終投稿イメージと保存順が伝わる文にする。
- `メイン分割` は、できるだけ 1 枚の画像としての完成形を理解できる preview に寄せる。投稿別調整 UI と最終配置 preview の役割を分ける。
- 2分割だけ挙動が違って見える場合は、copy / tab label / layout のどれが原因か確認して揃える。

検証:
- `/tools/sns-split-image-maker` と `?preset=split-2` / `split-3` / `split-4` を `390 / 820 / 1024 / 1280 / 1366px` で確認。
- `2 / 3 / 4分割` の投稿順、保存 button copy、PNG / JPEG flow が維持されること。

### Task 4: Schedule Calendar pointer behavior / month preview guard

優先度: 中。公開前に直すか、Task 1-3 後に判断。

対象:
- PC の予定 click 詳細固定表示。
- tablet landscape の click / tap 詳細キープ。
- smartphone の月間 preview 見切れ。

方針:
- 一律で click 詳細表示を消さない。fine pointer / desktop では hover 中心、coarse pointer / touch では tap で詳細表示を維持する方向で検討する。
- 月間 preview は小幅で body 横 overflow を出さず、必要なら calendar 内だけ scroll / scale する。

検証:
- `/tools/schedule-calendar` を `390 / 820 / 1024 / 1280 / 1366px` で確認。
- PC で hover が使いやすく、tablet / smartphone で tap 詳細確認ができること。
- localStorage versioned payload 周りは触らない。

### 公開後または別PRに回す

- Thumbnail Editor 登録済み素材 accordion。
- Thumbnail Editor layer drag reorder。
- Thumbnail Editor preset 一覧の rail / 横スクロール再設計。
- Thumbnail Editor export scale option (`1280x720` editor -> `1920x1080` export など)。
- 英語対応。Task 1-4 後、公開後 smoke で問題がなければ次優先にする。

## PC 表示レビュー

確認対象: `http://localhost:3000/`、`/tools/`、`/tools/schedule-calendar/`、`/tools/thumbnail-editor/`、`/tools/sns-split-image-maker/`。

### 公開前に直す候補

- 注釈 1: Home hero 右側 summary の上部 `V` は削除するか、利用者にとって便利な情報へ置き換える。3項目だけの表示に絞る案も候補。
- 注釈 2: Home hero の公開向け文言を調整する。公開中の入口として、いま使える3ツールと次にできることが自然に伝わる copy にする。
- 注釈 3: Home の suite card のツール数が Tools 一覧と合っていないため修正する。準備中 suite card はグレーアウトまたは低コントラスト表示にして、利用可能 suite と区別する。
- 注釈 4: Home の「公開版で使えるものと、今後の候補を分けて表示しています。」を公開向け copy に調整する。
- 注釈 5 / 7: 不具合報告 / 要望の導線はメールだけでなく X / Discord も候補に入れる。実 URL が未確定なら、リンクボタンを増やす前に文言だけで複数窓口予定を示す。
- 注釈 6: Tools page hero の「公開版で利用できる個別ツールは...」を公開向け copy に調整する。
- 注釈 8: 準備中ツールの text は「公開版ではまだ利用できません」よりも、「現在準備中です。公開後に順次追加予定です。」のような表現を検討する。テスター募集にも使うなら、別途「試験公開候補」などの言い方も候補。
- 注釈 9 / 10: Schedule Calendar の PC 表示では、予定 click による詳細固定表示は不要にする案。ただしタブレット横では click / tap による詳細表示キープが必要になりそうなので、一律削除せず pointer / viewport 条件を確認して決める。
- 注釈 15: Thumbnail Editor の縦長 9:16 / 真四角 1:1 は現時点で実質未実装のため、選択できないようにする。
- 注釈 16 / 17: Thumbnail Editor の preset / canvas size / ratio menu を確認する。Windows native select 風に見える箇所があるため、既存 UI と揃える。menu 外 click で閉じる挙動も入れる。
- 注釈 18: SNS Split Image Maker の preset landing card の説明文を、より短く分かりやすくする。
- 注釈 19: SNS Split Image Maker の `split-2` だけ `メイン分割` tab の表示が他 preset の投稿 preview と違って見える。`split-3` / `split-4` と意図が揃っているか確認し、必要なら表示 copy または preview mode を整える。
- 追加注釈 12: Thumbnail Editor header は PC 表示でも横幅が狭いと control が見切れる可能性がある。narrow desktop / tablet landscape 境界で、header controls を2行化するか、より compact な配置へ寄せる。

### 公開後でもよい候補

- 注釈 11: Thumbnail Editor の「登録済み素材」は accordion 化を検討する。デフォルト閉じのほうが見やすそうだが、閉じている時の label は「素材を追加」など、何ができるか分かる表現にする。
- 注釈 12: Thumbnail Editor の layer reorder は上下 button に加えて drag reorder を検討する。ただし pointer / keyboard / mobile / undo 履歴の扱いが絡むため、公開前の小修正には入れない。
- 注釈 13: Thumbnail Editor の preset 一覧は、カテゴリ「すべて」で縦に長くなる。PC 表示では 2 行程度の横スクロール chip / preset rail を検討する。英語対応で文言量が増える可能性もあるため、後続 UI polish として扱う。
- 注釈 14: Thumbnail Editor の書き出し倍率を canvas size と別に選べるようにする案。例: editor は `1280x720` のまま、export は `1920x1080`。比率変更は不可にする。export contract / SNS handoff への影響があるため新機能扱いで公開後に回す。

### 英語対応に回す候補

- Home / Tools の公開向け copy は、英語対応時に日本語 / 英語の両方で再点検する。
- 準備中ツールや suite card の status label は、英語化しても意味がぶれない短い文言にする。

## タブレット横 表示レビュー

確認対象: `http://localhost:3000/`、`/tools/`、`/tools/schedule-calendar/`、`/tools/thumbnail-editor/`。

### PC と同じ扱い

- 注釈 1: Home hero の公開向け copy は PC と同じく調整する。
- 注釈 2: Home hero 右側 summary の上部 `V` は PC と同じく削除または実用情報化を検討する。
- 注釈 3: Home suite card のツール数不一致と準備中 card の見え方は PC と同じく修正する。
- 注釈 4 / 6: 不具合報告 / 要望の導線は PC と同じく X / Discord も候補に入れる。
- 注釈 5: Tools page hero copy は PC と同じく公開向けに調整する。
- 注釈 7: 準備中 tools card の text は PC と同じく公開向けに見直す。

### タブレット横で追加確認する候補

- 注釈 8 / 9: Schedule Calendar の詳細表示は、タブレット横を考慮すると click / tap で詳細表示をキープする挙動が必要。PC の hover 前提と混ぜず、touch / coarse pointer では固定詳細を残す方向で確認する。
- 注釈 10 / 12: Thumbnail Editor header は tablet landscape と narrow desktop で窮屈。preset / canvas size / output ratio / action buttons が横一列で見切れやすいため、2行表示または compact grouping を検討する。
- 注釈 11: Thumbnail Editor の preset card が tablet landscape で2列だと大きすぎる可能性がある。PC の preset 一覧 polish と合わせて、tablet landscape では card density / columns / rail 表示を再検討する。

## タブレット縦 / スマホ 表示レビュー

確認対象: `http://localhost:3000/`、`/tools/`、`/tools/schedule-calendar/`、`/tools/thumbnail-editor/`、`/tools/sns-split-image-maker/?preset=split-4`。

### PC と同じ扱い

- 注釈 1: Home hero の公開向け copy は PC と同じく調整する。
- 注釈 2: Home hero 右側 summary の上部 `V` は PC と同じく削除または実用情報化を検討する。
- 注釈 3: Home suite card のツール数不一致と準備中 card の見え方は PC と同じく修正する。
- 注釈 4 / 6: 不具合報告 / 要望の導線は PC と同じく X / Discord も候補に入れる。
- 注釈 5: Tools page hero copy は PC と同じく公開向けに調整する。
- 注釈 7: 準備中 tools card の text は PC と同じく公開向けに見直す。

### タブレット縦 / スマホで追加確認する候補

- 注釈 8: Schedule Calendar の月間 preview がスマホ表示で見切れる可能性がある。致命的ではなさそうだが、月間 grid 内を横スクロールまたは収まる縮尺にするか確認する。
- 注釈 9: Thumbnail Editor の mobile top toolbar は現状の横一列だと厳しい。2行化、button group の折り返し、または primary action の優先表示を検討する。
- 注釈 10: Thumbnail Editor の label / usage chip 群はスマホ表示だと長くて見にくい。chip の横スクロール、2行制限、accordion / filter drawer 化を検討する。
- 注釈 11: Thumbnail Editor の bottom nav `テキスト` は、選択 layer が画像の時も設定 panel になるため意味が狭い。`編集`、`レイヤー`、`設定` など、text / image 両方に使える label へ変更する。
- 注釈 12: SNS Split Image Maker の `メイン分割` tab は、スマホでも投稿 preview のように縦に分断された見え方ではなく、縮小してでも1枚の画像として見える表示を検討する。現在は投稿ごとの切り出しが縦に並ぶため、最終配置の理解が弱い。

### 後続判断メモ

- mobile / tablet portrait の指摘は、portal copy と status 表示を除くと Thumbnail Editor の mobile controls と SNS Split preview に集中している。
- Thumbnail Editor の mobile toolbar / chip 表示は英語対応でさらに横幅が厳しくなる可能性が高いため、英語対応前に最低限の折り返しルールだけ入れるか、英語対応 PR の最初の layout guard に含める。
