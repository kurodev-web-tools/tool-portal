# Paid Core v1 Gate 1 — Production Supabase readiness

## 現在の判断

`gate1_status=NO-GO` / `source_artifact=UNCOMMITTED/UNKNOWN` / `activation-closed`

source_artifactのUNKNOWNはGate 1で要求する承認済みimmutable authorityが未確立であることを示す。ソースPRのcommit作成とは別に確認する。

2026-09-08 R7 source修正はローカル受け入れ済み: 実測Preview専用の厳密な入口判定と78定義のA3収束を実装した。実適用用と同一hashのGo CLI2.109.0 / PostgreSQL17で、実測before81関数・履歴30の再現、旧source RED、pending26→履歴56、最終81関数の全metadata/raw MD5/security完全一致、異常系9件、失敗migrationの履歴非追加、運用行とCron/Vault metadata保全、Cron run delta0を確認した。旧構造経路の退避3テーブル/3関数・最終canonicalもPASS。source/fixture/検証差分はrootがレビューし、サブエージェント未使用。追加のPreview read-only確認は予約対象114・未知relation0・履歴30で、外部DB変更なし。最終期待値とユーザー編集2ファイルは変更していない。詳細と制限は既存計画R7を参照する。R7のcommit/push/PR/merge、修正sourceでの新bindingと完全preapply確認、Preview実適用・適用後受け入れは未実施であり、工程3は未完了、Gate1 NO-GOを維持する。

2026-09-08 工程3の読み取り記録: PR #814はPreview統合commit `4d346a8a78d3d5c1136ae75c635b7ccb18850f9a`へmerge済みで、source `a7532540c5a4d3998b36eaf1dec45d741348a810`と完全tree一致。native source collectorの56 migration照合、両環境の完全履歴照合、同梱Go CLI2.109.0による各1回のlist/dry-runが成功した。exact pendingはPreview26/Production34。Previewのfresh完全catalogは保存済みv2 baselineと全項目一致し、Advisorも取得時刻以外の全項目一致で新規/削除0。Production Advisorは今回のbaselineとして保持する。古いProduction診断fixtureのwrapper不足と、検証済みv2取得artifactを混同しない。詳細・digestはtask.mdとrestrictedなphase3記録を参照する。これは適用前の実測であり、適用後の完全catalog/security期待値、scheduler/Vaultの前後保存確認、最終9-stage authority、Preview/Production適用はまだ成立していない。CIは登録結果なし。Gate 1 NO-GOを維持する。

この文書は実行順序と停止条件の運用入口であり、実環境のPASS証跡ではない。仕様は[承認済みdesign](../superpowers/specs/2026-08-31-comment-translator-paid-v1-gate1-production-supabase-design.md)、作業と最終allowlistは[承認済みplan](../superpowers/plans/2026-09-01-comment-translator-paid-v1-gate1-production-supabase-readiness.md)、最新の実行記録は[task.md](../../task.md)を参照する。矛盾があれば実行せず、具体的な差を解消する。

2026-09-06の包括承認は、Gate 1 GOに必要な**費用を発生させない**操作に限る。承認の存在は、target照合・review・backup/recovery・実測条件の代わりにならない。各操作のscopeと前提は引き続き独立して記録する。Paid公開、Provider/Checkout実通信、通常deploy、Cron activationはGate 1に含まれない。

| 証拠状態 | 現在の扱い |
| --- | --- |
| repository-implemented | 工程1の9-stage verifierとnative GO接続を含むソースを実装。工程2でPR公開対象77ファイルを確定。全hosted planの完了ではない |
| locally-verified | 工程2で68 source checks・29 Node syntax・3 PowerShell syntax・4 entry guards、TypeScript/lint/Next/Cloudflare buildがPASS。レビュー修正後の11 stage groupsと関連テストもPASS。既存actual-local Vault/R4証跡は実行経路を保持。新たな独立レビューは行わずparentが確認。実証跡取得・hosted検証は未完了で、fixtureは運用GOの証拠ではない。詳細とexact hashはplan/task記録を参照 |
| 実tool | Docker Client/Server 29.7.2、Supabase CLI 2.109.0、PG client 17.11の確認済み記録あり |
| Preview-not-applied / production-not-applied | このGate 1実行では未適用。保存済みreadbackを現在状態と呼ばない |
| backup-not-run | 実backup、restore rehearsal、final snapshotは未実施 |
| Vault-not-written / Cron-not-configured | このGate 1実行ではhosted書込みなし。既存Preview状態とは区別する |
| hosted readiness | 実証跡producer・semantic verifier・接続入力が未完備 |
| 無償recovery capacity | 2026-09-07 Management API再確認で同一Free organizationの2件がACTIVE_HEALTHY、同一region。現時点の空き枠は未確保。復旧先確保・incident後の期限内provision/cutover手順は未実証 |

現在のユーザー指示はサブエージェントの呼出し禁止。ユーザーが設定した現在の親モデルが実装・確認・受入れを直接担当する。以前のAstra/Luna分担は現在の実行指示ではない。runtime identityを独立確認したとは主張しない。単一writerを維持し、未コミット変更を保持する。

無償枠の制度根拠は[Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase): Free project上限はOwner/Administratorの所属organizationを横断して2件、paused projectは算入しない。ただし健康なsourceを枠確保のため停止してはならない。APIで確認したplan/statusと、復旧先の無償確保・期限内復旧能力は別証拠である。

## Source / inventory / artifact境界

- 作業branchは `codex/comment-translator-paid-v1-gate1-source-readiness`。開始HEADは `2775fba1f5ca687d23b25c88286ec5125d1663ec`。公開前にactual diff全体をreviewし、commit/treeを実測値へ更新する。merge先は `codex/comment-translator-paid-v1-preview`。
- [environment inventories](../../scripts/fixtures/comment-translator-paid-core-v1-gate1-environment-inventories.json)の完全version/name行をauthorityとする。最終は56件、保存済み履歴からのpendingはPreview 26・Production 34。実行直前のCLI一覧・dry-runは完全行で再照合し、countだけでは進めない。
- `final55`はforward適用前の定義drift診断baseline。最終56件との差は承認済み `20260904000000_comment_translator_paid_gate1_a3_canonical_convergence` の1件だけ。欠落・重複・未知migrationは拒否する。
- desired canonicalはrepositoryのLF source bytesと安全なsecurity contractから生成する。[bridge states](../../scripts/fixtures/comment-translator-paid-core-v1-gate1-bridge-states.json)と[canonical authority](../../scripts/fixtures/comment-translator-paid-core-v1-gate1-canonical-authority.json)を完全構造で検証する。Previewはobserved driftであり、canonicalへコピーしない。
- canonicalのrowCountは観測値として分離する。legacyの0行条件、owner/ACL/RLS、完全FunctionRow、raw definitionMd5、dependencyは厳密比較を維持する。PUBLIC/anon/authenticatedのPaid RPC EXECUTEは0、service_roleは明示最小権限のみ。
- 81件は直接宣言されたRPC identityの件数。identity-only SHA-256を完全FunctionRow manifestのMD5へ代用しない。旧82件要求・旧MD5はretired。
- 保存済みProduction SHA-256は `569c325d2e09274f1b24b8352b482e8e38fcd3c94478b45824bfc7f8254bd3db`、Preview r13は `489b36c13953b9fa1f508ea7e8bdb9a6ca5cb0aa0998de07cbbbe4189d174a16`。r13は `C:/ProgramData/Codex/Gate1/catalog-readback-20260903-r13` に保持する。
- legacy SQL入力は `C:/ProgramData/Codex/Gate1/legacy-sql-20260902-r2` の4件のみ。本文を出力、repositoryへコピー、変更、削除しない。取得artifactとr4〜r12も保持する。digest再確認は新しいremote readbackではない。

## 実行順序と共通preflight

1. branch/HEAD/actual diff、適用するdesign/plan、writer、必要toolとinputを実行する同一processで確認する。
2. source契約・実DB/Vault検証・reviewを完了する。未実装・未実行・SETUP_BLOCKEDをPASSに変換しない。対象外差分、package/lock変更、秘密値・private identifier混入を検査する。
3. review済みsourceのcommit/push/PR、CI、Preview統合lineへのmergeを確認する。作業branchの存在やlocal commitだけではsourceCommit要件を満たさない。
4. Previewのfresh preflight、exact pending、適用、final56とcanonicalの完全readbackを確認する。既存inactive schedulerとVault値を変更しない。失敗中はProduction backup/DDLへ進まない。
5. DB/TLS、無償recovery capacity、rehearsal backup/restore、watchdogとcutover準備を実証する。
6. final snapshot backupとchecksumを完了し、arm後にProductionのexact pendingを適用する。完全history/catalog/security readbackが成功するまでVault/Cronへ進まない。
7. Vaultの2名を原子的に作成・count readbackし、その後にCronを原子的にinactiveで作成する。10分観測とfallback確認を完了する。
8. 全GO条件をactual evidenceで再監査する。単なるJSONのPASSラベル、synthetic結果、保存fixture、未実装verifierはGO根拠にならない。

Direct接続はprivateなtarget bindingのSHA-256、CAファイルのSHA-256、host/user/database/portの完全一致を必要とする。`verify-full`、PostgreSQL 17、`PGGSSENCMODE=disable`を維持する。接続値はsecure inputからtask process内へ渡し、chat・history・argv・stdoutへ出さない。CA未取得、binding不一致、秘密値表示が必要な経路では停止する。

read-only取得は固定query、REPEATABLE READ / READ ONLY、default transaction read-only、bounded timeout/output、最後のROLLBACKを使用する。適用前の22/30件契約と適用後56件契約を混同しない。Productionのcanonical wrapper欠落を空配列で補完しない。完全metadataはrestricted artifact内で検証し、外へはsanitized scalarだけを出す。

## 操作scope登録票

各行の実行記録には、private target binding、review済みsource revision、入力artifact digest、preflight結果、実施時刻、結果、停止時対応を結び付ける。値自体は公開しない。以下はcopy-readyなscope欄であり、空の証拠欄を自動的に承認済み結果へ変換しない。

| Scope | 許される操作と実行前条件 |
| --- | --- |
| source-implementation | plan allowlist内のsource・契約・docs。単一writer、既存差分保持、独立reviewが必要 |
| tooling-setup | 既存tool/imageの再利用を優先。追加費用は禁止。導入をPASSと推定せずversion/digest確認 |
| preview-apply | fresh一覧がexact pendingと一致し、source review/merge後のみ。scheduler/Vault/activation除外 |
| recovery-cost-capacity | plan・枠・region・PG17復旧先の無償確保を実証。有料project/PITR/IPv4/add-onは禁止 |
| recovery-project-provisioning | 確定済み無償枠とexact対象でのみ新規復旧先を作成。枠を空けるため本番を停止しない |
| recovery-region-extensions-auth | 復旧先のregion/extensions/Auth provider・redirectをreview済み構成と照合 |
| rehearsal-backup-restore | Preview gate後、Production read-only backupから新規隔離local Supabase PG17へrestore |
| final-backup | 同一exported snapshotに結び付くschema/data/historyと別rolesをrestricted保存 |
| bounded-rpo-watchdog | RPO最大20分・緊急停止/cutoverの条件を記録。実pause完了を証明できなければarm禁止 |
| production-migration-apply | backup/checksum、rehearsal、無償復旧能力、exact pendingが全部揃ってからarm・適用 |
| vault-write | schema/security readback後、予約2名だけ。rotation/update/decrypted read除外 |
| inactive-cron-configuration | Vault確認後、予約1jobだけをcommit前にinactive。activation除外 |
| incident-source-pause | arm後の失敗・deadlineに対するexact source project pauseだけ。健康なsourceの事前停止は禁止 |
| pause-confirmation | APIの要求成功だけではなく、deadline内の実際のinaccessibilityを確認 |
| recovery-restore | pause確認がT0+20分以内の場合だけ、新規復旧先へfinal backupをrestore。source上書き禁止 |
| endpoint-credential-cutover | 検証済み復旧先へ必要最小限の緊急endpoint/credential切替。通常deployと区別 |
| client-reauthentication | emergency cutoverに伴う再認証。秘密値を証拠へ含めない |
| reopening-writes | 復旧readbackとsanitized Free smoke成功後だけ。schedulerはinactiveを維持 |
| source-unpause-deletion | GO達成に必須ではなく、暗黙承認しない。原sourceはforensics用に保持 |
| activation | Gate 1外。Paid/Provider/Checkout/Cron activationを行わない |

commit/push/PR/mergeはreview済みsourceの統合のための独立した記録を持つ。CI未確認や必須local検証未完了のままsource readinessを受け入れない。backup/artifact削除はGate 1の前提ではなく、保持する。local試験の生成物だけは、そのrunのID・label・digest・mount・path所有確認後にcleanupする。

## Backup / restore / watchdog

### 固定版CLIのargument recipe

以下は2026-09-06にCLI 2.109.0とPG17.11の各`--help`でflagを確認した**非実行レシピ**。private linked targetの照合、Direct/TLS強制、sanitized captureを備えた実行producerは未完備であり、その完成前には実行しない。接続値を引数へ埋め込まず、raw stdout/stderrをterminalへ流さない。

| 段階 | CLI引数 | readback / stop |
| --- | --- | --- |
| 適用前一覧 | `migration list --linked` | bindingとlinked targetをprivateに照合し、全version/name行をfixtureと比較 |
| pending確認 | `db push --linked --dry-run --include-all` | Preview26 / Production34の期待完全一覧と一致。未知・重複・欠落は停止 |
| exact apply | `db push --linked --include-all` | source統合、一覧一致、環境別backup gate後に1回。seed/roles追加は禁止。失敗時は自動再試行しない |
| 適用後一覧 | `migration list --linked` | final56完全一致とpending空。別途fresh完全catalog/security readback必須 |
| filtering discovery | `db dump --linked --dry-run` | scriptはrestricted capture内で引数として検証し、実行可能textとして評価しない |
| Auth/Storage差分 | `db diff --linked --schema auth,storage --file <restricted-output-name>` | `--file`は新migration出力機能。repositoryで実行せず、専用restricted copied work directory内の生成先を確認。差分はreview後だけ利用 |
| roles | `db dump --linked --role-only --file <restricted>/roles.sql` | snapshot外。exit0、bytes、SHA-256を確認 |

`--include-all`は承認済み過去versionを含むexact集合のためだけであり、未知migrationを許可しない。`<restricted...>`は解決済み保存先の説明記号。`--linked`だけではDirect/TLSを証明できない。`--db-url`、password引数、`--debug`は禁止。`db diff`のshadow runtimeも専用生成物に限定し、既存runtime/volumeを流用しない。

snapshot dump本体はネイティブ`pg_dump`を使う。snapshot値は非表示pipeでrunnerへ渡す。

| artifact | PG17引数（非実行レシピ） |
| --- | --- |
| schema.sql | `--schema-only --snapshot <private-snapshot> --file <restricted>/schema.sql` + reviewed filters |
| data.sql | `--data-only --snapshot <private-snapshot> --file <restricted>/data.sql` + reviewed filters |
| history_schema.sql | `--schema-only --schema=supabase_migrations --snapshot <private-snapshot> --file <restricted>/history_schema.sql` |
| history_data.sql | `--data-only --schema=supabase_migrations --snapshot <private-snapshot> --file <restricted>/history_data.sql` |

COPYはPG17 `pg_dump`の既定。`--use-copy`はSupabase CLI専用でありネイティブへ渡さない。`--inserts`、`--column-inserts`、`--rows-per-insert`を拒否してCOPYを維持する。command-planのflag混入修正と直接回帰テストは親検証・再レビューで受入済み。これは実backup/restoreの成功ではなく、実行producer・接続・snapshot・復旧証拠は別途必要。

plain SQL restoreは下記の順に、新規専用targetで`psql --no-psqlrc --set=ON_ERROR_STOP=1 --single-transaction --file <restricted-artifact>`を配列呼出しし、各fileのexit0を要求する。失敗targetをreset/reuseして続行しない。`pg_restore --version`確認をplain SQLへの`pg_restore`実行に置き換えない。このレシピを実行済み証拠やhosted GOに昇格させない。

実行toolはPG major 17とCLI 2.109.0をpinし、CLIのdry-runから得たSupabase filtering argumentsをreviewする。command plan出力はbackup実行証拠ではない。[backup preflight](../../scripts/comment-translator-paid-core-v1-gate1-backup-recovery-preflight.ps1)の既定動作は非実行である。

- backup前にVault total/required-name rows=0、Storage objects=0をfresh確認する。非zeroなら既存設計では進めない。
- Auth/Storage差分はexact CLIの機能でread-only確認する。差分ありならreview済み `auth_storage_changes.sql` をrestricted artifactとして扱う。未reviewの差分は停止する。
- 必須artifactは `roles.sql`、`schema.sql`、COPY形式の`data.sql`、`history_schema.sql`、`history_data.sql`。本文、接続値、snapshot IDは表示・commitしない。filename/bytes/SHA-256/exit/timestampsのみ報告する。
- `T0`はsnapshot export元の同一REPEATABLE READ / READ ONLY transactionのserver時刻。schema/data/historyのdump完了までexport元transactionを保持する。rolesはsnapshot外の別取得として記録する。
- restore順は roles → schema → review済みAuth/Storage差分（ある場合）→ data → history schema → history data。対応toolでON_ERROR_STOPとtransactionを使用し、非対応modeまで単一transactionと主張しない。
- 新規local targetでhistory完全一致、legacy 3表0行、非Paid aggregate counts、Auth/FK/schema、bridge/canonical rehearsalを確認する。local restoreはhosted復旧枠の証明ではない。

| State / deadline | 必須動作 |
| --- | --- |
| PRE_DDL_UNARMED | backup/checksum中。pauseは禁止 |
| T0+5分まで未完了 | ABORTED_NO_DDL_NO_PAUSE。候補を復旧に使用せず、DDL/pauseなし。次回は新snapshot/T0 |
| ARMED_BEFORE_FIRST_DDL | backup/checksum完了後、最初のDDL直前にarm |
| T0+10分より前にmigration＋決定的readback成功 | SUCCESS_DISARMED。pause latchがあれば成功へ戻さない |
| arm後の決定的失敗／T0+10分まで未成功 | 即時、遅くともT0+10分にPAUSE_REQUESTED |
| T0+20分以内 | exact sourceのinaccessibilityを確認してPAUSE_CONFIRMED |
| deadline内のpause未確認 | T0 backupによるrestore/cutoverは禁止。NO-GO、証跡保持、review済みforward対応へ |

emergency recoveryはsource停止確認 → 無償復旧先のprovision/config → 所定順restore → history/data/Auth/Storage/grants/RLS/catalog/Vault readback → endpoint/credential cutover → client再認証 → Free smoke → writes再開。原sourceを自動unpause/deleteしない。Freeでのzero-loss rollbackは主張しない。

## Vault / inactive Cron

2026-09-06 PG17拒否境界訂正: `\quit 4/5`は終了コード指定として機能しないため使用禁止。reserved名の既存/partial拒否は固定SQLSTATE `PGT01`、commit前postcondition失敗は`PGT02`のSQL例外で現在transactionをabortし、`ON_ERROR_STOP=1`のpsql exit3で停止する。bound runner/local adapterには`VERBOSITY=sqlstate`を指定し、本文・直接メッセージを表示しない。local harnessはexit3と唯一の期待SQLSTATE ERROR recordを組で検証し、stdout0、有限capture、既存行保持または独立zero-row readbackを要求する。generic nonzero、別SQLSTATE、context内のトークン、複数/欠落ERROR recordは期待拒否として受理しない。second-createのtest-only注入例外は`PGT03`として同じ厳密判定を行い、故障タイミングは変えない。advisory lock、既存predicate、bound input、暗号化、成功時だけのCOMMIT、hosted readinessによる接続前blockは維持する。変更対象はVault runnerとlocal integration contractの2ファイルだけ。

2026-09-07 bound値忠実性訂正: PG17の同一adapter・新規隔離環境で、非秘密stress値と予約名の独立MD5比較を各形式1回実施した。SQLリテラル用の変数展開は両値不一致、raw変数展開は両値一致（各exit0/stderr0）だった。runnerとpartial fixtureのbind引数はraw変数展開へ統一し、SQL文字列連結やshell再評価へ置換しない。source回帰は旧形式を拒否する。actual-local成功caseでは実runnerから取り出した同じbind行と既存adapterを用い、引用符・改行・バックスラッシュ・空白を含む非秘密値の独立期待digestとのサーバー側一致を最初に要求する。結果は固定一致フラグのみ検証し、値・digest・decrypted secretは表示/取得しない。不一致時は書込み前停止する。既存4ケース・厳密出力/SQLSTATE・readback・cleanup・hosted接続前blockを維持し、success出力の外部形式は変更しない。

Vault予約名は `comment_translator_paid_maintenance_url` と `comment_translator_paid_cron_token` の2つ。deterministic transaction advisory lock下で両名の不在を再確認し、bound/session inputから原子的に作成する。commit前にcount=distinct count=2、encrypted record non-null、duplicate=0を確認する。作成・assertion失敗は両件rollback。decrypted値は取得しない。現在のhosted Writeはreadiness未検証で接続前blockを維持する。

actual-local試験は実runnerのtransaction生成を再利用し、成功2件、rerun拒否、partial-existingのID保持、second-create失敗とpost-create assertion失敗の独立rollback readbackを確認する。syntheticだけでは完了しない。既存DB/volumeを使わず、cached digest、network none、tmpfs、log-driver none、秘密非表示、所有確認cleanupを必要とする。

2026-09-06 local harness訂正: cached image既定の`postgres -D /etc/postgresql`を保持し、その後に既存のlogging保護設定を付ける。所有検証も同じ完全CMDを照合する。bare case DBへのextension導入ではimage primaryとACL初期状態が異なるため、4ケースを順次別々の新規owned containerのimage-initialized primary DBで実行する。第1環境は成功とrerun、第2はpartial-existing保持、第3はsecond-create rollback、第4はpost-create assertion rollback。各環境の開始前にreserved名不在と既存のmetadata/権限条件を確認し、終了ごとに所有確認cleanupとresidue確認を行う。失敗したら後続ケースを開始しない。既存runtimeのreuse/reset、DB clone、GRANT/ALTER ROLE/owner変更、adminによる通常secret transaction代替は禁止。runner SQL、stress input、期待値、security比較は変更しない。primary単独成功は全matrix成功へ昇格させない。

隔離local case DBのschema scaffoldと通常検証は`postgres`を維持する。superuserが必要なextension導入だけは、所有確認済み新規container内で既存`supabase_admin`の存在・login・superuser能力を確認して実行する。ロールへのgrant、ALTER ROLE、owner変更はしない。導入後のmetadata/readback/secret transactionは必ず`postgres`へ戻す。bootstrap能力不足ならSETUP_BLOCKEDとし、hosted実行の権限や接続方式へ流用しない。

Cronは予約名 `comment-translator-paid-maintenance`、cadence `*/5 * * * *`、承認済みprivate maintenance-from-Vault呼出しだけ。database/usernameはpostgres。1transaction内で不在確認 → schedule → commit前にactive=false → exact row確認を行う。直接cron.job更新、二重scheduler、activationは禁止。

commit前baselineと新job identityをprivateに束ね、commit後10分（2 cadence）の開始・終了でinactive、同じjobのbaseline後run delta=0を確認する。無関係な過去job履歴を混ぜない。matching=1、active=0、scheduler process=1、承認済みcommand digestとcadence一致、Cloudflare fallback absent/inactiveを実測する。

## Rollback / stop / GO監査

bridge commit前はtransaction失敗に伴うcatalog/historyの原子性を確認する。commit後にarchiveだけを戻してhistoryを残す操作は禁止。review済みforward修正か、期限内pauseが確認された復旧先restore/cutoverのみを使用する。Vault/Cronの値や業務行を直接書き換えてrollbackを模擬しない。

target/commit/pending/fingerprintの不一致、legacy非zero、source-era変更、完全manifest/ACL/RLS/raw digest/dependency不一致、backup/recovery未完備、advisorの新規in-scopeまたはhigh/critical問題、Vault重複、Cron active/run発生、fallback二重化、秘密表示の必要性は停止条件。失敗したmutationを自動再試行しない。原因と変更するscopeを確定してから実行条件を更新する。

GOには、review済みsourceのPreview統合merge、両環境final56と完全canonical/security一致、archive/source-era保持、実backup/rehearsal/final snapshot/watchdog/無償復旧能力、extensions利用可能、Vault exact2名、inactive Cron exact1件と10分run0、fallback無効、phase別rollback証拠がすべて必要。通常deployとactivationは未実施のままとする。未取得、未実装、stale、間接証拠、矛盾が1つでもあればNO-GO。
