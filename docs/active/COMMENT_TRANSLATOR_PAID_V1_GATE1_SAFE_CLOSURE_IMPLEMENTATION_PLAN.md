# Gate1 Safe Closure Implementation Plan

**Goal:** 承認済み[移行仕様](COMMENT_TRANSLATOR_PAID_V1_GATE1_SAFE_CLOSURE_TRANSITION_DESIGN.md)のA01–A16をローカル実装・検証する。

**Architecture:** coreの通常UNKNOWN拒否を保持し、共有validatorで限定profileとcanonical grantを検証する。Workerが独立設定grantと旧stateを照合し、許可消費・新run登録を同期SQLite transactionへまとめる。Node verifierが登録済み旧証拠と新承認後の証拠を検証し、clientは同一grantを固定する。

**Tech Stack:** 既存Node.js test runner、Miniflare/workerd SQLite、Web Crypto。依存変更なし。

2026-09-12、ユーザーが仕様採用とローカル実装・検証を承認。同一タスクのprimaryが直接実行・レビューする。基準d33aeec、仕様SHA256 `34e4461a7d63e8466e1f5eab03c3ea79a3a852054d0b94a3153829068ec5e7a6`。Git公開・配備・credential・外部試行・namespace初期化は範囲外。既存封印済み証拠は読み取り専用。

**結果: LOCAL_IMPLEMENTATION_ACCEPTED（2026-09-12 JST、未公開）**。同worktree / `codex/gate1-safe-closure-transition-20260912`、HEAD `d33aeec41d4f3922a4e171a12454ac608767fe80`。単独primaryが実装・実差分レビュー・最終検証を実施。subagent、モデル/effort変更なし。設定Astra/lowと実行時effort未観測は区別する。仕様原本のbytesは保持し、採用と実装状態は本計画・運用記録に追記する。

## 1. 共有契約とarm入力

- [x] `workers/gate1-recovery-controller/safe-closure.test.mjs`に限定UNKNOWN profile、通常拒否、canonical/duplicate/size/期限/policy結合の失敗テストを追加してREDを確認。
- [x] 同ディレクトリの新`safe-closure.mjs`にprofile、grant parse、digest、旧policy結合、Worker期限関数を実装。`core.mjs`は任意`safeClosure`の2digest構造だけ追加し、内部認可markerは生成しない。
- [x] `node --test workers/gate1-recovery-controller/safe-closure.test.mjs workers/gate1-recovery-controller/core.test.mjs`でGREENを確認。

## 2. Workerの読み取り・一度の登録

- [x] 新`workers/gate1-recovery-controller/safe-closure-worker.test.mjs`にsynthetic限定終端のseed、実SQLiteのaudit/fault fixtureを置き、GET headerと移行を検証。
- [x] `worker.mjs`にappend-only監査table、同snapshotのstate/digest RPC envelope、optional grantの限定読み込み、追加2metadata GET、原子的な消費/登録を追加。
- [x] mismatch、空namespace、期限、snapshot/台帳/設定drift、同時arm/再使用、3write箇所のSQLite rollback、登録後障害と期限後cleanup/reload/alarmを検証。
- [x] `node --test --test-concurrency=1 workers/gate1-recovery-controller/safe-closure-worker.test.mjs workers/gate1-recovery-controller/predecessor.test.mjs workers/gate1-recovery-controller/state-diagnostics.test.mjs`を通す。

## 3. client固定入力

- [x] 新`scripts/comment-translator-paid-core-v1-gate1-safe-closure-client.test.mjs`でconstructor結合、caller変更、GET digest欠落/相違、期限/時計逆行、arm一度だけをREDで確認。
- [x] `scripts/lib/comment-translator-paid-core-v1-gate1-controller-client.mjs`にgrant固定、header取得、限定canonicalizer、journal digest、明示armを実装。正式停止proofと既存lease/POST上限を保持。
- [x] 新client suiteと既存client/proof suiteを実行し、実workerdとの接続も検証。

## 4. 独立証拠verifierとgrant生成

- [x] 新`scripts/comment-translator-paid-core-v1-gate1-safe-closure.test.mjs`で登録済み形式のsynthetic全証拠、欠落/改変/summaryのみ/未登録producer/偽proof/clone/古い承認/不鮮明な現在確認の失敗テストを作る。
- [x] 新`scripts/lib/comment-translator-paid-core-v1-gate1-safe-closure.mjs`でindex全bytes検証、root/path/size制限、retry2 adapter、fresh証拠と新承認の結合、WeakSet proof、canonical grant生成を実装。自由なURL/SQL/shell実行経路は作らない。
- [x] synthetic testsと旧実証拠のread-only replayを実行し、旧state digestと全封印ファイル不変を確認。fresh外部確認は実行しない。

## 5. 最終受入れ

- [x] Worker README、task.md、既存readinessへ使用条件・ローカル検証結果・未実施の外部境界を記録。
- [x] 元の8suite99checks＋新suiteの最終状態を1回検証。対象lint/構文、operator-contract、disabled simulation dry-run、`git diff --check`を実行。
- [x] primaryが実diff、A01–A16対応、scope、旧証拠保全、失敗時の不変条件をレビューし、未解決必須事項0でのみLOCAL_IMPLEMENTATION_ACCEPTEDとする。

## 最終受入れ証拠

最終の関連12テストファイルで**131 checks / pass131 / fail0 / skip0**（元の99件を含む）。対象ESLint（warning0）、変更JS10ファイルの`node --check`、operator-contract（remote0/mutation0）、実設定disabledのsimulation build dry-run、`git diff --check`がPASS。primary reviewの未解決必須事項0。機能・テストの最終状態を変更せず、結果を記録した。

| ID | 検証と結果 |
| --- | --- |
| A01 | 実retry2をread-only replay。156証跡＋保全5file＋公開source51file一致。旧canonical state SHA `0c3f0ebf595e7663ee3cfa7fb29d26b16153cf6b348abc6efbad83139635c8e4`一致、通常関数は拒否。旧ファイル書込0。 |
| A02 | shared profile / Worker testsで許容2種のPreview restore結果とRecovery操作0を確認。UNKNOWN一般化、未終端・未知項目などを拒否。 |
| A03 | grant canonical/duplicate/size/case/type/time、旧新ID/source/policy/manifest/deadlineと明示digestの不一致を拒否。core単体は認可markerを作らない。 |
| A04 | verifierで全bytes/SHA、登録形式/producer、完全な全relation内容/security・native/API、欠落/改変/summaryだけ、偽・clone proofを確認。caller参照変更から入力を固定。 |
| A05 | 旧承認・新承認結合違反、fresh確認の欠落/古さ、namespace/対象/version drift、同じ承認からの再発行を拒否。観測起点の5分期限を維持。 |
| A06 | pure clock境界でPC先行を許容し、Worker残存10分/旧期限後60秒/新20分を検証。実transactionで期限driftを拒否し、時計・metadata鮮度の再検査を実差分で確認。 |
| A07 | 空namespace・通常predecessorへのsafeClosureを拒否。元のclient/通常predecessor suiteを保持してPASS。 |
| A08 | source変更前後のGET本文・digest一致とread-only、期限切れGET、unauth/disabled/通常runのheader非表示、snapshot drift拒否を確認。 |
| A09 | 実workerd/SQLiteで1回の登録、旧used_runs bytes一致、新sequence0/全attempt0/grant row1、reload保持を確認。 |
| A10 | metadata失敗/古さ・live fixture対象org不一致、state/旧行欠損・改変/grant driftを拒否。許可前mutation0。 |
| A11 | 同時arm/重複/応答喪失後replayを拒否。実SQLiteでgrant ID・旧run・新run・digestの4独立UNIQUE制約、未知audit schema拒否を確認。 |
| A12 | grant insert、新used_runs insert、current slot writeの各実SQLite失敗で全transaction rollback。 |
| A13 | 登録後alarm/初期観測失敗でも消費済み。grant削除/不正/期限切れ後の新run abort/cleanup、reloadとalarmを確認。 |
| A14 | 実clientの固定grant/旧tuple、constructor後caller変更、旧sequence/lease非採用、初期GET不一致時arm POST0、arm再送なし。 |
| A15 | 実client＋workerd＋独立synthetic正式proofで4操作各1回、reload/古いalarm/重複command拒否を確認。実Supabase通信0。 |
| A16 | 元99件を含む131checks、対象lint/構文、operator-contract、disabled dry-run、primary実差分reviewがPASS。 |

実証跡adapterは、保存されたtarget policyに旧公開sourceを差し替えた実行時policyと、配備receiptのhashを照合する。secret撤去による最終version変更と、hardEnd前の独立安全終了を旧形式どおり扱う。Worker登録時の旧期限後60秒条件は別に維持する。旧native/APIの完全なproducer receiptを検証するが、未保存の過去wire payloadを復元したとは扱わない。fresh evidenceのproducer起動・完了と出力の由来は、新実行packetをレビューするprimaryが独立に確認する必要がある。

ローカル受入れ証拠: `.tmp/gate1-safe-closure-implementation-20260912/`。旧実証跡replay: `.tmp/gate1-safe-closure-design-20260912/retained-replay.json`。fresh外部収集・実用grant発行・credential・設定・配備・Hosted新試行・Git公開・namespace操作は0。旧UNKNOWN/正式停止false/Hosted未受入れとGate1 NO-GOを保持する。次の公開・外部実行にはそれぞれ具体的な新承認が必要。
