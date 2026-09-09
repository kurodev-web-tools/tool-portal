# Paid Core v1 Gate 1 — Production Supabase readiness

## 2026-09-09 Goal 3: bounded post-apply capture repair locally accepted, unpublished

Scope and design: the user authorized setting and executing the next local repair goal after Goal2. The measured post-apply query produced 1133757 bytes, so the former 1 MiB limit could not capture a complete catalog. Inspection also found the same limit in native psql normalization, the JSON parser and final artifact-reference validation. Use one exported POSTAPPLY_MAX_OUTPUT_BYTES = 4 MiB allowance across those boundaries. This gives bounded headroom above the measured catalog without introducing streaming/storage changes. An unrestricted increase was rejected; changing only the first reader would leave downstream failures.

The local Docker reader uses the shared limit for both spawn capture and UTF8 byte validation. The fixed collector opts into the same allowance through createPsqlTransport, whose optional numeric limit must be a positive safe integer no greater than 4 MiB. Its version probe and ordinary preflight default/parser stay at 1 MiB. Evidence-index validation and actual file reads allow 4 MiB only for catalog/catalog-expectations roles in previewReadback, rehearsalBackup, productionReadback and canonicalReadback. Other roles/stages, receipts and authority documents retain 1 MiB; the aggregate JSON allowance remains 32 MiB. Artifact hashes, metadata/path checks, exact JSON shape, target bindings, SQL and ACL/RLS/dependency comparisons are unchanged.

Verification: the initial four regression files reproduced the old capture/reference failures and invalid-limit handling. Final acceptance passed nine verification files (29 TAP checks across the final successful runs): postapply acquire, postapply query, preflight readonly, evidence, native postapply capture, runtime cleanup, postapply catalog, stage evidence and backup acquisition. All nine changed/new mjs files passed ESLint. The tests cover the observed size and exact 4 MiB acceptance; 4 MiB+1, multibyte UTF8 overflow, incomplete captures, ENOBUFS, signals, stderr and invalid bounds are refused without partial artifacts or automatic retry. Evidence tests exercise real bounded file reads for all four eligible stages and both roles, as well as wrong-stage/role rejection and the unchanged 32 MiB aggregate limit. Existing unknown-termination cleanup guards remain closed and their tests passed.

Native compatibility evidence is local only: real Node child-process pipes exercise the production psql transport's OS capture options at the observed size and boundary; they are not PostgreSQL execution. The retained Goal2 catalog was also emitted through a local Node pipe and accepted by the production transport, actual row parser and shape inspector: 1133756 bytes without its query newline, 1134034-byte stored artifact, history56, VALID_LOCAL_ONLY. Its original file hash is unchanged. The sanitized receipt is retained at the ignored local goal3-retained-catalog-compatibility.json. No DB connection, new backup, restore, migration, dependency installation or deployment occurred in Goal3.

The primary agent implemented, reviewed and verified directly; no subagents or model changes were requested. Repository configuration remains Astra Light; runtime model/effort was not independently observed. The producer set remains13 files and its public-source guard is not bypassed. The patch is locally accepted and unpublished; publication and formal DB execution remain separate steps. Prior Goal2 failure/recovery/cleanup receipts remain historical observations and are not promoted to formal Gate1 evidence. Goal3 is complete within its local scope, hosted Production recovery remains unproven and Gate1 remains NO-GO. The earlier Goal2 section's uncorrected 1 MiB limitation describes that earlier revision.


## 2026-09-09 Goal 2: full local restore and replay accepted; Gate 1 remains NO-GO

PR821 is merged at 28cd0b9c18ef4306f66fce6e718bfa12016e78c3. The published producer guard matched all13 files before fresh capture. Native capture attempt4 produced six artifacts totaling467983 bytes, including four gzip snapshot dumps. The checksum was observed75942ms after T0, the exporter closed successfully, the before/after Production baseline was identical, and Production writes were0. Original backups and receipts remain unchanged in their restricted local artifact stores; private data and paths are not embedded here.

The owned isolated A11 target restored all six transactions and passed strict source-state comparison before replay. Native CLI applied all34 pending migrations successfully with confirmed process termination. Readback matched the exact repository history56 rows (from22), canonical structure and archive structure. All original49 tables/500 rows retained their object identities, row counts and data digests; all original22 migration-history rows retained their full-row digest. Auth/Storage595 catalog objects and managed ACL/RLS/default privileges matched their recorded baseline. Source-era structure and native dependency edges matched before/after. Active cron jobs were0. This establishes the approved local full-restoration objective, including the repaired Windows binary transport.

Evidence qualification: the ordinary post-replay reader stopped at its1MiB output limit (POSTAPPLY_QUERY_CAPTURE_INVALID). The original failed restore receipt is retained. With the prior database query confirmed closed, an independent fixed read-only query read the same restored target using an explicit4MiB diagnostic bound and default_transaction_read_only=on. Its1133757-byte output passed all comparisons and the shape inspector as VALID_LOCAL_ONLY. The successful recovery receipt does not rewrite or convert the original failed receipt into a formal collector pass. The source collector remains capped at1MiB and must be repaired and verified separately before this route can supply formal Gate1 evidence.

Evidence chain retained under the ignored local auth-storage-review directory: goal2-a11-restore-receipt.json (original failure); goal2-a11-r2-recovery-receipt.json (successful readback, cleanup pending at that observation); goal2-a11-recovered-cleanup.json (subsequent cleanup PASS); goal2-a11-independent-cleanup.json (owned containers/volumes/networks/scratch each0). Both initialization candidates were removed after exact ownership/image checks, and native CLI stop confirmed termination before scratch removal. Unrelated resources and original backup evidence were preserved.

The primary agent performed verification and review directly; no subagents or model changes. This post-merge cycle changes only these operational documents, with no new commit/push/PR, deployment, hosted restore or remote migration apply. Goal2 is LOCAL_FULL_RESTORE_ACCEPTED; hosted Production recovery capability remains unproven and Gate1 remains NO-GO. The older checkpoints below are historical, including the pre-publication state.


## 2026-09-09 Goal 2: binary dump transport fix locally accepted, publication pending

The approved local source repair uses --compress=gzip for all four snapshot pg_dump commands. A shared decoder bounds both compressed input and decompressed output to32MiB, checks UTF8 without replacement, and preserves the original SQL bytes, including LF, CRLF and bare CR inside bodies/literals. Invalid gzip checksums, truncation, trailing padding/garbage, empty/NUL/invalid UTF8 and decompression overflow fail closed. No post-capture newline normalization is permitted. The existing reviewed pg_dumpall role recipe stays plain; this fix changes the four pg_dump streams that carry schema/data/history. The six-artifact format and existing transformation/restore transaction contract remain unchanged.

Every dump now records transport.encoding, stdoutBytes, stdoutSha256 and decodedBytes. rawSha256 remains the decoded raw SQL hash before restore transformations; the compressed native hash is kept separately. Acquisition, native process receipt and final stage validation require the exact transport shape, gzip for the four snapshot dumps, and matching plain byte/hash identity for roles. Older missing/plain snapshot transport observations cannot be used as proof of this repaired path. The decoder is included in the published producer guard (now13 files); the current uncommitted producer set correctly rejects the previous published110bc03 baseline. No source guard was bypassed.

Verification:104 tests passed across dump transport, capture, snapshot, acquisition, native process receipt, stage evidence, artifact store, SQL transforms and rehearsal restore. All11 changed/new mjs files passed ESLint. The local native contract (node scripts/comment-translator-paid-core-v1-gate1-backup-dump-native-contract.mjs --local-only) used the existing Windows pg_dump17.11 and one owned PG17 container: non-compressed stdout reproduced definition drift for3/3 synthetic LF/CRLF/bare-CR functions; gzip dump→production decoder→native restore matched both definition and body hashes for3/3. Its labelled tmpfs container cleanup passed. Native synthetic roundtrip evidence is separate from full Production-backup restoration.

Primary agent implemented, reviewed the actual diff and performed acceptance directly; no subagents or runtime changes. No dependencies, original backup bytes/receipts, hosted DB state, migrations or bridge hash rules changed. Commit/push/PR were not performed. The next boundary is publication approval; after an accepted published source is verified, a fresh capture and full restore/replay remain necessary to establish Goal2. Current state: LOCAL_IMPLEMENTATION_ACCEPTED / UNPUBLISHED, Goal2 incomplete, Gate1 NO-GO. The previous diagnosis below records the failed plain-text path and is not a claim about the repaired producer.


## 2026-09-09 Goal 2: target baseline resolved; exact restore blocked on dump line endings

The user approved the isolated target adjustment. The local adapter verified the complete CLI Webhook dependency closure (25 objects, no external dependents) before removing that initialization, removed only the extra sequence-default grants, and reproduced the existing Storage owner's grant options. Role attributes and memberships remained unchanged. The original six artifacts and their hashes/receipts were preserved. All six transactions ran as normal postgres; the captured sourceState fields now match exactly, including48 relations, history22, ACL/RLS digests and Auth FK state. This sourceState comparison does **not** prove every function definition matches.

A8 native CLI replay applied the four pending pre-bridge migrations, then stopped at20260811000000 with SQLSTATE P0001; history readback contains26 rows. A9's inline diagnostic failed to locate a query boundary because the working SQL uses CRLF; its independent read-only observer still captured the exact bridge state. A10 corrected only that diagnostic query handling and confirmed the same three mismatches inline. The bridge's own catalog query differs from its expected legacy state only at the definitionMd5 of the three legacy Paid functions; tables, triggers, ACLs and dependency counts match, and canonical scope is empty.

Read-only native function diagnostics in A10 found33/81/52 carriage returns respectively. All three raw definition hashes mismatch; replacing CRLF with LF **for comparison only** yields the expected MD5 for all three. No function body, backup artifact or bridge comparison was changed. The captured schema.sql contains3077 CRLF sequences and15 bare LF sequences (the producer also appends generated SQL). This is an exact-definition restore failure, not accepted recovery. PostgreSQL17's [official archiver implementation](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/bin/pg_dump/pg_backup_archiver.c#L2285-L2298) leaves uncompressed plain-text stdout in Windows text mode; archive/compressed stdout uses binary mode. This explains the observed carriage-return insertion.

Proposed next source repair: use a binary-safe native dump transport, such as gzip-compressed stdout with bounded decoding in the producer, preserving original CR/LF bytes rather than normalizing SQL after capture. Keep compressed/native byte observation, decoded/transform hashes, snapshot binding, output bounds, child termination, deadline and durable receipt lineage explicit. Local regression must include original LF, CRLF and bare CR in function bodies/literals, corrupt/truncated/oversized gzip rejection, and native round-trip function hashes. The sourceState check must not substitute for definition readback. Publication and a necessary fresh capture remain subsequent steps; the current original artifacts remain immutable evidence of this failed path. No producer source repair or fresh recapture was performed in this target-adjustment slice.

A10 deliberately stopped before replay on the known native mismatch. Candidate cleanup2 and CLI cleanup2actions passed; independent final inventory confirms containers0/volumes0/networks0/scratch0. Production writes0; no hosted restore, deployment or activation. Goal2 remains incomplete, final history56/canonical/archive/source-era/data preservation after replay are NOT_VERIFIED, and Gate1 remains NO-GO. Primary agent alone performed implementation and diagnosis; no subagents or runtime setting changes.

Restricted evidence: auth-storage-review/goal2-a8-restore-differences.json, goal2-a8-failed-history.json, goal2-a9-observer-receipt.json, goal2-a10-target-profile.json, goal2-a10-native-bridge-diff.json, goal2-a10-function-line-ending-diagnosis.json, goal2-a10-restore-receipt.json and goal2-a10-independent-cleanup.json under .tmp/gate1-evidence-20260909/. This section supersedes the target-adjustment approval wait below.


## 2026-09-09 Goal 2: fresh backup captured; isolated restore blocked on target baseline

PR820 is merged at `110bc03149d4904abd0293fb203fa0f48ae3a836`; the existing worktree was fast-forwarded and all12 producer files matched the published source. Fresh native capture produced six artifacts (471938bytes), four identical-snapshot dumps, and durable acquisition/process records. Checksums completed79459ms after T0; the outer receipt was created118694ms after T0. Managed baseline before/after matched. Production writes0; subsequent read-only diagnosis matched the captured sourceState and observed idle transactions0.

All six artifact transactions completed as normal postgres in an owned isolated target. Strict readback stopped before replay on `rowCounts` and `grantsRlsSha256`. A second diagnostic run with the same immutable backup identified the entire difference:

- Source48 relations are present. Target adds three empty CLI Webhook tables: `net._http_response`, `net.http_request_queue`, `supabase_functions.hooks`.
- Security rows: source662/target713, source-only0. The51 target-only rows comprise net33, supabase_functions15 and its supabase_admin default ACLs3. CLI2.109.0 initializes this Webhook schema and pg_net unconditionally in its normal database startup template ([official template](https://github.com/supabase/cli/blob/v2.109.0/apps/cli-go/internal/db/start/templates/webhook.sql)).
- Three shared rows differ: postgres/public sequence defaults retain UPDATE for anon/authenticated/service_role on the target, while source has only owner privileges; storage.buckets/objects have the already explained owner-only grant-option representation difference. This is not accepted as an exact hash match.

Both runs cleaned up their two candidate containers and two CLI cleanup actions. Independent final inventory confirmed containers0/volumes0/networks0/scratch0 (goal2-a4-independent-cleanup.json). Replay22→56 remains NOT_EXECUTED. No backup recapture, mutation of original artifacts, comparison relaxation, hosted restore, deploy or Production DDL was performed.

Next proposed target-only adjustment is reviewable in ignored `goal2-target-baseline-proposal.sql`: before importing data into a newly owned empty target, inspect the complete dependency closure of the CLI-only Webhook objects, remove only that initialization (schema removal needs specific approval), reset the three extra sequence-default grants, and reproduce the existing owner's grant-option representation without adding non-owner privileges or role membership. Recheck raw security/catalog and all six original artifacts strictly before replay. No proposed DROP or GRANT has been executed. This supersedes the previous publication/clock wait checkpoint; Goal2 remains incomplete and Gate1 NO-GO.

Evidence is restricted under `.tmp/gate1-evidence-20260909/`: `goal2-capture-attempt3.json`, `auth-storage-review/goal2-a3-restore-receipt.json`, `goal2-a4-restore-receipt.json`, `goal2-a4-security-differences.json`, `goal2-source-security.json`. Raw SQL/data and connection values are not copied into this document. Primary agent implemented and inspected the operational drivers directly; no subagents.

## 2026-09-09 Goal 2: clock fix locally accepted, publication pending

ユーザー承認の時計修正をローカル実装・検証した。DB T0が受信したPC時刻より最大1000ms未来でも許容し、それを超える値はmicrosecond精度で拒否する。DB T0原文を変更しない。受信時の残り時間は `300000 - (hostNow - Date.parse(T0)) - 1000` msで固定し、以後は単調時計で減算する。許容差を5分枠へ加算しない。dump timeout・held persistence前後・exporter closeも同じ期限を使用する。`elapsedMs` はこの保守的な消費予算を表す。PC観測時刻は実時刻のまま保存し、逆行・非数値は失敗としてcleanupする。

取得record・native process receipt・stage validatorはDB/PCをまたぐ順序のみ1秒を許容し、PC内のdump順序・checksum/close/persistence順序は厳密に保つ。完了上限は `T0 + 299000ms`。78関連tests PASS、最終microsecond境界追補後のsnapshot/capture32tests PASS、変更9mjsのESLint/syntax・actual diff review・diff check PASS。primary単独で実装・検証。今回remote操作なし。この状態はUNPUBLISHEDであり、公開済producer照合を迂回して取得しない。ソースのcommit/push/PRと公開が済んだ後に、既存Goal2のnative取得・full restore/replayを再開する。Goal2未完了、Gate1 NO-GO。以下のWindows同期待ちは旧checkpointであり、現在の次条件は修正ソースの公開。

## 2026-09-09 Goal 2: 時計同期待ち

2026-09-09 Goal 2 started / WAITING_FOR_LOCAL_CLOCK_SYNC: 最新Production6file取得＋隔離full restore/replay22→56をユーザー承認で開始。公開済source12producer照合・Goal1 baseline前確認PASS。保存先ACL初期設定は子Windows PowerShellのmodule path競合で停止し、空directoryを保護した後に再開。native captureはSNAPSHOT_METADATA_INVALIDで停止。固定RR/RO診断はPG17/read-only/isolation/sourceState22/defaultACL12/metadata形式が正常、DB T0が受信時369ms未来。別clock観測でもserver ahead516–899msを確認。時計検証を緩和せずWindows同期待ち。新規6file/取得record/process receiptは各0、残存idle transaction0。本番書込み0、復元/replay未実施、Goal2未完了、Gate1 NO-GO。

証跡はignored `goal2-capture-attempt2.json` / `goal2-capture-diagnostic.json` / `goal2-metadata-diagnosis.json` / `goal2-clock-cleanup.json`。OS時刻変更は未実施。再確認でもserver ahead538–969ms、idle transaction0、保存先各0を観測。ignored復元driverを準備し構文確認済みだが未実行。native取得receipt/source/manifestを照合してから所有local環境を作成し、Auth/Storage公式初期化・全local service停止・6transaction復元・sourceState厳密一致を確認する設計。synthetic26用のsource-era欠落を許すチェッカーは本番22の受け入れに流用しない。同期後に時刻条件を再確認し、同じ承認範囲でnative取得・完全復元・migration replayを続行する。失敗時の保存先は空で保護済み、既存バックアップは変更していない。

## 2026-09-09 Goal 1: 管理baseline差の説明と復元先条件

Goal 1は `MANAGED_BASELINE_DIFFERENCES_EXPLAINED`。以下が現在のAuth/Storage判定であり、後続の過去checkpointの `BLOCKED_ON_BASELINE` / user delta未確定を置き換える。実際のhosted復元先は未観測、本番復旧可能性は未証明、Gate1は **NO-GO** のまま。

固定CLI2.109.0/PG17.6.1.140で新規の所有隔離環境を作成し、生成configの `[storage].enabled=false` でCLIの事前Storage migrationを止めた。`--exclude storage-api`だけでは `initSchema15` の初期化jobを除外できない。空のStorage履歴から、承認済みStorage v1.72.11 imageの公式 `runMigrationsOnTenant` を `MULTI_TENANT=true`、`DB_INSTALL_ROLES=false`、migration refresh/vector migration無効で実行。Auth v2.192.0は公式 `GOTRUE_INDEX_WORKER_ENSURE_USER_SEARCH_INDEXES_EXIST=true` で起動した。管理tableの手動DROP、手動管理DDL、role権限拡大なし。公式根拠: [CLI初期化](https://github.com/supabase/cli/blob/v2.109.0/apps/cli-go/internal/db/start/start.go)、[Storage migration実装](https://github.com/supabase/storage/blob/518862dff5b2e4f3386ad51e4a172e91d0ce2ad2/src/internal/database/migrations/migrate.ts)。これはlocal再現条件であり、Production service設定の直接観測ではない。

| 比較対象 | 確定した結果 |
| --- | --- |
| 履歴・構造 | Auth77、Storage68/name/hash全件一致。Auth4索引あり、Iceberg追加2tableなし。native catalog595件中593件が完全一致、共通function21定義も完全一致 |
| ACL2件 | storage.buckets/objectsの所有者自身のgrant option表記のみ。他のACL、owner、RLS属性は完全一致。所有者は常にgrant optionを持つため実効権限差ではなく補正GRANT不要（[PostgreSQL 17権限仕様](https://www.postgresql.org/docs/17/ddl-priv.html)）。生ACL差は保持 |
| 内部依存 | source/local各RI trigger92行とTOAST29行。pg_trigger/pg_constraint/親relationのnative情報で意味上のidentityを対応付け、raw identityと重複行数を保持。単純なOID除去・重複排除なし |
| 外部依存 | source795/local762行の差33行はpublic policy→auth.uid()の13行とpublic FK→auth index/columnの20行。アプリschema復元に属し、管理schema差分SQLには含めない。未説明の比較差0 |

**利用者差分:** 観測した管理baselineへの追加利用者DDLは不要。空ファイルを作って取得済みbackupとは扱わず、この判断と比較artifactのhashを保持する。アプリpolicy/FKの省略は認めない。次のfresh captureでsource状態の整合を再確認し、変化があれば再レビューする。今回のread-only再取得は以前のsource595objects/795dependenciesと完全一致したが、将来snapshotの保証にはしない。

**実際の復元先の必須条件:**

1. PG17と互換な公式Auth/Storage baseline・owner/role・RLS/ACL・関数/索引・履歴name/hashを復元先自身で確認する。不足はplatform/serviceの正式経路で整え、利用者postgresの権限拡大や管理table DROPで合わせない。local環境変数をhosted操作手順へそのまま転用しない。
2. public schemaのdefault ACLを含む既存restore recipeを守り、public→Authの33依存行をschema復元後に確認する。
3. Authデータとprovider/redirect等の設定、Storage実体、6fileのsnapshot/hash、通常postgresによるrestoreと22→56 replayはGoal 2以降の実測条件。この比較で成立したとは扱わない。
4. 実hosted destinationの適合・作成可能性・復旧時間・切替は別証拠と承認が必要。未観測のままGOにしない。

restricted evidence: `.tmp/gate1-evidence-20260909/auth-storage-review/goal1-acceptance.json`、同directoryのraw catalog/identity/外部依存一覧・初期化receipt。最終candidate cleanup2件、CLI cleanup2actions PASS。primary agentが実測・比較・受け入れを担当、サブエージェントなし。本番はTLS verify-full/read-only管理catalog再取得のみで書込み0、fresh6file取得・deploy・activationなし。

2026-09-09 Auth/Storage delta review BLOCKED_ON_BASELINE: merged source1509dabの12producer照合PASS後、承認済みProduction Directをnative PG17.11/verify-full/read-onlyで確認。history22、legacy/Vault/Storage/vector0。Auth/Storage schema-onlyをrestricted artifactへ取得し、既存固定CLI2.109.0/PG17.6の所有ローカル隔離環境と比較。Auth migration77/latest20260625000000は一致、StorageはProduction68/latest67とlocal61/latest60で不一致。初期SQL token集計は本文保持不足のため無効（後続native catalog比較で置換）。これは管理baseline差を含み、review済みuser deltaや空auth_storage_changes.sqlの根拠にしない。schema dumpとversion queryは別snapshot。native CLIの既知TLS問題を回避するためhosted CLI diffは未実行。local cleanup2actions PASS、独立container/network/volume/scratch各0。本番書込み0、fresh6file capture未実施。次は復元先自身の管理baseline/依存関係を満たす経路を確定し、user-executable差分を再レビューする。Gate1 NO-GO。

2026-09-09 pre-publication review / lint LOCAL_REVIEWED・UNPUBLISHED: primary agentが実diffと新規moduleを直接レビューし、重大な指摘なし。既存lock固定のnpm ci --ignore-scripts --no-audit --no-fundを作業worktree内cacheで実行（691 packages）、manifest/lockfile SHA256不変。変更23 MJSのESLint --max-warnings=0 PASS、コード修正なし。直前の46 tests/native6file復元＋history56 replayの対象source/log SHA256不変を照合し、受理済み実行は反復しない。過去entryのESLint SETUP_BLOCKEDは今回解消。commit/push/PR・新本番backup・本番rehearsal・9-stage受理は未実施、Gate1 NO-GO。次は明示承認されたsource公開。

2026-09-09 Production rehearsal preparation / default ACL capture LOCAL_VERIFIED・UNPUBLISHED: 検証済みdefault-table-ACL SQL/生成器をbackup-default-acl.mjsへ共通化。Production captureのRR/RO exporterにtableDefaultsを必須追加し、不足/不正/重複/許可外scope-role-privilegeを拒否、freezeしてschema artifactへ結合。対象はpostgresのglobal/public table defaultsとanon/authenticated/service_role。26件ローカル検証と同じ処理を使うがProduction source-stateは22固定を維持。source producer12filesに追加し未公開HEADを拒否することを確認。関連46 tests・5 syntax PASS、共通化後native6file復元state完全一致→history56/canonical/archive PASS、独立cleanup全0。ESLint setup-blocked。旧backupには新しい同snapshot default ACL/正式producer証跡がないため最終T0証拠には昇格させない。順序は公開前レビュー/必要チェック→明示承認によるcommit/push/PRとsource確定→別途承認された最新backup等の取得→本番22history/実データの隔離rehearsal→9-stage判定。本番変更/deployはその後の別承認。今回hosted接続/再取得/変更0、Gate1 NO-GO。

2026-09-09 six-file restore + migration replay LOCAL_VERIFIED: --phase=local-restore-replay --local-cli=pinned-goを固定PG17/CLI2.109.0の所有隔離環境で完遂。ローカル26historyから同snapshot4dumpとrolesを取得し、6fileをhash確認してsingle-transaction/ON_ERROR_STOPで復元。復元前後source-state SHA256完全一致、その後history56/canonical構造/archive3tables・3functions PASS。空targetではhistory schema自体がない場合を受理。native診断でpublic12relationのtarget既定ACL混入を検出し、ローカルschema artifactに同snapshot取得のglobal/public既定table ACLの一時解除・正確復元を含めて修正。比較条件は維持し、Production validatorは22固定、local26専用validatorを分離。関連40 tests・8 syntax PASS、ESLintは依存未配置でsetup-blocked。独立inventoryでGate1 container/network/volume各0・scratch0。失敗attempt1–4も保持。これは本番22history/実データ/全source-eraの再現ではなく、Production6fileの完全rehearsal・9-stage受理・source公開は未完了。hosted接続/変更0、Gate1 NO-GO。

2026-09-09 isolated local migration replay LOCAL_VERIFIED: --phase=local-replay --local-cli=pinned-goで既存postapply経路を実行。過去hosted catalogは読まず、fixture一致の旧SQL4件と現在migrationで検証。固定CLI2.109.0/PG17・既存cacheを使用し、privateなproject内scratchで起動。実SQL適用、履歴56件、canonical構造、archive3 tables/3 functionsがPASS。source-era0のためProduction shapeはsource-era-mismatchで拒否されることを確認し、hostedEvidence=falseを維持。関連3 tests/2 syntax PASS。終了後独立read-only inventoryでGate1 container/network/volume各0・scratch directory0。full6file backup restoreとmigration replayの一体実行/9-stage受理は未実施。hosted接続/変更0、Gate1 NO-GO。

2026-09-09 legacy SQL recovery LOCAL_VERIFIED: 明示承認された保存backupのhistory_data.sqlのみread-onlyで解析。22history rowsから対象4件を抽出し、statements.join("\n")/末尾改行追加なしで既存fixtureのbytes/MD5全件一致。既存validateLegacyInputs PASS、parsed statement数17/25/17/25。合計32988 bytesをprivate ACLのignored recovered-legacy-sqlへ保存しreadback照合、secret scan PASS。元backup変更なし、SQL実行/hosted接続なし。CLIと元SQLの準備は解消したが、過去catalog証跡・隔離migration replay/完全rehearsal受理は未解決。Gate1 NO-GO。

2026-09-09 pinned CLI runner接続 LOCAL_VERIFIED: --local-cli=pinned-goの明示選択で固定Go経路を利用し、npm配置がなければ承認済みignored tools配置へ解決。毎回のSHA256/symlink拒否、local transport、bounded runner、既存npm既定を維持。CLI存在preflightをprofile対応。実runner経由native2.109.0 PASS、runtime-cleanup/cli-atomicity-order/postapply-queryの3 tests PASS。元SQL4件のGit履歴8revisionを照合したがbyte/MD5一致0。元SQL・過去catalog証跡不足のためreplay未実施。次は外部保存backupのhistory_dataから4件のみのローカル抽出と既存fixture照合が必要（プロジェクト外読取の範囲確認後）。hosted操作0、Gate1 NO-GO。

2026-09-09 CLI限定setup完了: 承認済み範囲でlock固定platform packageのSHA512とGo exe SHA256を照合し、ignored .tmp/tools/supabase-2.109.0へ配置。native --version=2.109.0 PASS、必要Docker image8種は既存cacheに存在。manifest/lock/node_modules変更・npm lifecycle・image pullなし。既存runnerはnode_modules entry前提のため未接続。旧履歴replayに必要な元SQL4件が未配置で、migration replay/完全rehearsalは未実施。hosted操作なし、Gate1 NO-GO。

2026-09-09 合成データの6file復元・source-state照合・失敗transaction rollbackを隔離PG17で実証。22 tests PASS、所有container残存0。CLI限定setupは下記のとおり完了。元SQL4件が未配置でmigration replay/完全rehearsal証跡はinput-blocked。hosted操作なし、Gate1 NO-GO。

2026-09-09 same-snapshot source-stateとfinalBackup観測adapterのローカル接続を検証済み。関連56 tests PASS、隔離PG17で同snapshot不変/新接続増分、RLS・function/sequence/default privileges変化を実測。通常captureで状態取得を必須化。rehearsal restore・9-stage全体受理・hosted backupは未実施、Gate1 NO-GO。詳細はR6。

## 現在の判断
2026-09-09 外側process記録のローカル実装: 固定取得CLIの実終了・stdout bytes/hashと保存済取得record/6file/source10files/runを照合し、別protected directoryへbackup-process.jsonを排他的保存する。秘密はstdinのみ。timeout時の所有child tree停止と終了済PID非操作を検証。ローカルprocess証拠であり、本番backup・9-stage authorityではない。同snapshot source-stateとstage adapterは未完了、Gate1 NO-GO。詳細はR6。
2026-09-09 保存/source-run結合のローカル実装: snapshot保持中に6file＋manifestの保存/fsync/readbackを完了し、close後に別の保護先へsource8files・run・target・T0・dump・manifestの記録を保存するnative APIを追加。caller入力変更/原本上書きを防止し、source前後不一致・保存失敗・5分期限超過を拒否。現HEADでは新producer未公開につきnative source guardで停止を実測。外部backup/復元未実施、outer native-process receipt/stage adapterと実証は未完了、Gate1 NO-GO。詳細はR6。
2026-09-09 native証跡結合のローカル実装: capture自身がnative T0・binding/snapshot digest・dump時刻/終了結果/hash・exporter close観測を返す。時計異常は成功にしない。保存前の観測追加であり、旧原本復元・信頼済みreceipt・arm/GO成立ではない。次はrestricted保存とsource/run receiptの結合。外部backup/復元未実施、Gate1 NO-GO。詳細はR6。
2026-09-09 Auth/Cron再照合完了: Production Auth18項目は保存exportと現在UI/設定GET応答で差分0。native Directの10分24秒後観測でProduction0job/0run、Preview同一inactive1job/27run、両方run増分0。Previewのjob ID・command・5分周期・postgres・最大run ID保持を確認。連続監視や将来のProduction Cron設定完了とは扱わない。Cloudflareログイン後のDashboard実測でProduction/PreviewともCronトリガー未設定、Preview authority=supabase-cron、Productionはauthority名なし。Cloudflare Cron fallback absentを観測時点で確認。稼働version表示はProduction f45136b2/Preview 9e1a72be（各100%）。配備annotationはartifact独立照合ではなくARTIFACT_IDENTITY=UNKNOWNを維持。DB/設定変更・backup/復元なし、Gate1 NO-GO。以下のAuth/10分差分未確認は過去checkpoint。
2026-09-09 Direct接続前提の復旧完了: 保存済み接続設定/CA/credentialと既存PG17.11 clientを再利用し、両環境のverify-full/TLS1.3/PG17/読み取り専用RRを実測PASS。外部保存先の6-file backupは旧受け入れmanifestと同一bytesでnative検査PASS、Auth exportも残存している。旧worktree内証跡の原本欠落と区別する。Auth exportの旧hash/現在設定一致、backup取得provenanceと9-stage結合は未回復。旧backupは最終T0に使わない。新規backup/復元/DB変更なし。以下のDirect入力不在・backup所在未確認は前段のcheckpoint。詳細はR6。
2026-09-09 新規read-only baseline: 承認済み既存Production/Previewを接続済みconnectorで観測。RR/ROの完全history/catalogはProduction22/pending34、Preview56/pending0、未知履歴0。Preview canonical33表/81関数/依存1443行。Production Vault0/Cron0、Preview予約Vault2件とinactive5分postgres Cron1件を確認。各観測の日時・完全結果・hashをrestricted保存し、旧原本の代替や旧時刻の復元とは扱わない。Direct verify-full設定は不在でnative証跡結合は未成立。Advisorは今回baselineのみ、Auth設定export/fallback/10分run delta/backup/復元は未確認。DB変更0。詳細はR6。

2026-09-09 証跡再取得方針（ユーザー承認）: Gitに残る実装・手順・過去の結果報告は保持する。復旧後に存在しない旧 `.tmp/gate1-evidence-20260908` 配下の証跡は「原本欠落」とし、hash・PASS報告だけから原本を再構成しない。ローカルテストは新しい日時で再取得する。Production backup・DB観測・復元試験は必要範囲と個別承認の確認後に新規実行し、旧観測時刻へ遡及させない。旧6-file backupの保存先原本は別途所在確認が必要で、作業フォルダー欠落だけから消失を断定しない。再取得は最終T0 backupの代用にならない。詳細はR6の再取得表。

2026-09-09: PR #818のPreview merge/source包含/完全tree一致は前回確認済み（task.md参照）。復旧した同じ2d79 worktreeで元HEAD・既存branchへ復帰した。ただし参照先のprivate phase5 local acceptance証跡が存在せず、復旧後の証跡保持・hash連続性は未確認。以下の未公開・watchdog未実装案内は過去checkpoint。次の証跡結合と実運用入力はR6を参照。Gate1 NO-GO。

`gate1_status=NO-GO` / `source_artifact=UNCOMMITTED/UNKNOWN` / `source_publication=PR818_MERGED_PREVIEW` / `trusted_nine_stage_authority=UNKNOWN` / `activation-closed`

trusted_nine_stage_authorityのUNKNOWNはGate 1で要求する承認済みimmutable authorityが未確立であることを示す。ソースPRのcommit作成とは別に確認する。

2026-09-08 PR #817 merge確認: source `ae544a55443ed90daf71d8975d2fcb2e45393b57` / Preview統合 `5a110ae110fe24689132440dc470b1105b08aa8e` は完全tree一致。native source collectorで56 migrationを再照合し、公開source8ファイル・既存証跡13件のhashを検証した。工程4のlocal6-file復元/bridge受け入れは保持。次は本番適用前の実watchdog・復旧/cutover手順・native authority取得経路の準備。既存State modeは状態判定のみで、期限を監視してpause/停止確認する実行経路の準備完了とは扱わない。古いbackupをfinal T0に流用せず、Preview applyも繰り返さない。新規hosted操作0、追加費用0、サブエージェントなし。Gate1 NO-GO。

2026-09-08 工程4 LOCAL_RESTORE_AND_REPLAY_REVIEWED。修正済みrecipeでfresh6-file backupを取得（同一snapshot4dump/13112ms、前後50表一致、保存bytes/hash/ACL検証済み）。空の復元先でpostgres自身のpublic既定権限を解除してから通常postgresで6段階復元し、50表data/Auth/history一致、34 migration/bridge再実行、履歴56件と既存22件の完全保持を確認。最終canonical33表/81関数は独立受け入れ済みPreviewと構造・権限一致。archive3表/3関数は0行・application ACL拒否、source-eraはfresh Productionと一致して保持、Vault/Cron/jobs/runs0。Storage multi-tenant8表、Auth77/Storage68履歴一致、owner ACL80項目同等。Auth非一意4索引は明示した管理性能差分で性能同等は未主張。親が実測・独立比較しサブエージェントなし。最終3コンテナ削除済み。source repair未公開・hosted Recovery未実施・9-stage authority未結合のためGate1 NO-GO。詳細と必須の復元前設定は計画R5。

復元先の初期既定権限を残した最初の試行では、legacy3表のACLが本番各16項目に対し各32項目へ増え、bridgeが正しく停止した。既存表の権限を後から変更して通すのではなく、新規空DBでpublicの既定権限を整えてから元の6ファイルを復元する。計画R5の必須準備を省略しない。以下は過去のcheckpoint。

2026-09-08 管理baseline追加診断: cached公式Storage imageの実装を確認し、MULTI_TENANT=trueが移行接続のstorage.multitenant=trueへ渡されることを特定した。新規隔離DBで公式tenant migratorと履歴hash検証済み追加7 migrationを実行するとStorage8表・iceberg内部表0となり、Auth77/Storage68の完全移行履歴がProduction観測と一致した。従来の内部2表DROPはsingle-tenant初期化によるlocal差分であり、hosted復元SQLへ含める根拠にならない。作成3/削除3/残存0、hosted接続0、host port0、データ投入0。別途Production read-only catalogでAuth4索引は全て有効な非unique・非primary・非exclusion索引、関連constraint/dependent0と確認したが、性能影響と復元先での存在は未検証。owner ACLの文字列表現差についても有効権限の同等性はまだ未証明。全431文の文字列一致を元仕様の必須条件とは扱わないが、未知差分を無視したり失敗SQLを削除して復元成功と扱うこともしない。次は4索引・owner ACLの互換性判定を確定し、正式な利用者差分とfresh6-file復元へ進む。元backup保持、source変更/公開・Production変更・サブエージェントなし。Gate1 NO-GO。

2026-09-08 最新工程4・バックアップ修正local受け入れ: 親タスクで実装・レビューし、サブエージェントは未使用。同一RR/RO exporter内でStorage管理2表の件数を直接取得し、両方0の場合だけdata dumpから除外する。欠落・非空・不正な応答・RLSで隠れた行はdump前に停止し、呼び出し元の0件申告や無効化flagでは迂回できない。GO検証器にもsnapshot一致とsource/restored stateの2表0件を必須化した。19 snapshot/capture tests、12 stage groups、backup contract、変更7JSのlint/syntax、PowerShell parseがPASS。実local PG17で4dump/1959ms・6段階復元・synthetic data/Auth/history/RLS/grants一致、snapshot後の同時書き込み分離、非空2ケース・表欠落・RLS非表示時の停止/接続終了を確認。最終2コンテナは削除済み、独立確認で残存0。実装は未公開で、Production接続・変更・実backup再取得はなし。元のbackupも保持。残るのは復元先の管理baselineと利用者差分の確定、およびfresh Production backupによる正式復元/security/bridge検証。Gate1 NO-GO。以下は過去のcheckpoint。

2026-09-08 最新工程4・原因確定: Productionのread-only設定とlocal検証から、管理表DROP2件・Auth索引作成4件は42501、session_replication_role設定とowner ACL4文は実行可能と判明。別途、data.sqlに含まれるstorage.buckets_vectors/vector_indexesへの空COPYも両方42501となり、ProductionのINSERT権限なし・両表0行を確認した。以前検証したlocal platform-admin baseline上で、この空COPY2ブロックのみをメモリ内で除外する追加診断を実施し、非superuser postgresによるデータ/履歴復元後の全50表件数・digest、Auth/Storage全431文、Cron0件が一致した。元の6ファイルは保持し、通常の6段階復元が成立したとは扱わない。次は同一snapshotでの空判定を伴う正式backup recipe修正と、復元先のplatform管理baselineと利用者差分の責任分離が必要。source/migration変更は未実施。各4回の隔離診断で作成3/削除3/残存0、Production変更・サブエージェントなし。Gate1 NO-GO。以下は過去のcheckpoint。

2026-09-08 最新工程4・時刻同期後: 承認済みWindows再同期が管理者承認経路でexit0となり、native DBとの時刻検証も54msでPASS。Productionの6ファイルbackupを保存し、同一snapshot4dumpは10697ms、exporter正常閉鎖、前後50表の件数/digest一致、独立した保存済みbytes/hash/ACL検証はPASS。実際の非superuser postgresによるlocal復元はroles/schemaの2段階後、auth_storage_changes.sqlで42501となり、データ投入前に停止した。作成3コンテナは削除済み。以前の全431文一致はlocal platform administratorでの比較元整備であり、通常復元roleでの手順成立を証明しない。保存済みbackupはbytes検証済みだが復元未受け入れで、Production最終適用には使わない。次はplatform管理スキーマの初期状態と利用者が実行可能なAuth/Storage差分を区別して手順を解決する。時刻検証緩和・DB権限昇格・Production変更なし。Gate1 NO-GO。以下の時刻blockerは解消済みの過去記録。

2026-09-08 最新工程4: Auth設定の実値を保護されたバックアップ先へ保存し、hash/ACLを確認済み。native verify-fullのAuth/Storageスキーマ取得と、Productionと同じAuth77/Storage68管理migrationを用いる隔離環境での差分replay後、全431文と関数本文21件が一致した。これはlocal rehearsal baselineの証拠であり、差分SQLのhosted実行許可ではない。Productionバックアップはスナップショット開始時刻がPCより約1.3秒先行するため、厳格な時刻検証で停止した。exporterは閉鎖済み、保存先は空、6ファイルbackup/restoreは未成立。時刻条件を緩和せず、Windows時刻同期の確認・必要時再同期に対するOS範囲の許可を得てから再検証する。詳細は計画R5。以下のAuth未保存・差分未取得の記載は過去のcheckpointである。

2026-09-08 工程3最終受け入れ完了: PR #816の統合 `c1bcd3dc4cebe8a748322ab04081ac56a03ff673` とsource `53c49f74197116f71b5ffc9c0a0d5b7260432e73` を完全tree照合し、native source observationで56 migrationを確認した。公開済み検証器でPreviewの履歴56/pending0、完全canonical33表/81関数/依存1,443行、運用行とCron/Vault metadata保持、run delta0がPASS。Advisorは適用直後から追加変化なし。migration再適用なし。工程4は復旧準備に移行し、同一Free organization・東京の2 healthy projects、PG17、6ツール、Production Vault0/Storage0/Cron0/履歴22をread-only確認済み。無償枠は障害sourceの期限内停止確認後に確保する既存設計を維持し、常時空き枠を要求しない。復旧先はユーザー確認済みの同一Free organization・東京、project作成見積りは月額0。見積りと障害時の実provision/期限内復旧能力は別証拠である。Auth/provider/redirect/cutover設定、Auth/Storage差分reviewとrehearsalは未成立。ユーザーログイン後のDashboard read-only確認でEmailのみ有効、他24無効、custom/third-party0、Site URL1/redirect4、最小password長8、OTP3600秒/8桁を確認した。制限領域に設定digestと集計を保持したが、URL実値の永続exportは未実施であり、復旧用設定保存完了とは扱わない。Auth/Storage diffは未実行。CLI代替pg-schema経路のURL変換では検証済みTLS構成を保持できず、process-wide verify-fullはlocal shadowにも及ぶため、この経路やTLS緩和は試していない。実pause/provision/backup/Production適用は未実施。詳細は既存計画R8/R5を参照する。工程3受け入れと最終9-stage authority/GOは別であり、Gate1 NO-GOを維持する。

2026-09-08 最新工程3記録: PR #815のmerge後、fresh完全入口確認を経てPreviewへexact26を1回適用済み。独立したCLI一覧/dry-runは履歴56・pending0。33テーブル/81関数の完全定義・ACL/RLS、依存関係1,443行、既存運用行とCron/Vault metadataの前後一致、Cron run delta0を確認した。証跡検証器が適用前からあるpg_depend重複3行を拒否したため、重複を削除せず期待値との出現回数まで照合するR8限定修正をローカル実装・root受け入れ済み。実native collectorと関連契約はPASSだが、R8の公開/mergeとsource binding整合後の最終read-only受け入れが残る。工程3はR8_PUBLICATION_PENDING、Gate1 NO-GOを維持する。Advisor新規Paid範囲0/high-critical0、範囲外性能指摘13件は記録済み。Production変更なし。Previewの再適用は不要かつ実施しない。詳細は既存計画R8を参照し、以下の記録は以前のcheckpointとして扱う。

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

## Watchdog runner and recovery handoff (2026-09-08)

Local implementation: [watchdog runner](../../scripts/comment-translator-paid-core-v1-gate1-watchdog-runner.mjs), [deadline supervisor](../../scripts/lib/comment-translator-paid-core-v1-gate1-watchdog.mjs), [native transport](../../scripts/lib/comment-translator-paid-core-v1-gate1-watchdog-transport.mjs), [focused tests](../../scripts/comment-translator-paid-core-v1-gate1-watchdog.test.mjs). This implements execution, not operational GO. The CLI admits only native dependencies and rejects producer files whose actual bytes differ from its explicitly selected source commit. The new source is currently unpublished. The exported dependency seams are for local tests; results obtained through them are not native hosted authority.

Run the runner as a separate process using Node and its script path, with no credentials or JSON in argv. The trusted operator supplies bounded UTF8 NDJSON through private stdin. Sequence starts at0 and increases by exactly1. `init` carries policy (schemaVersion1, real snapshot-server T0, runId, sourceCommit, Production binding SHA), exact private binding, minimal libpq environment, Management API token, target/run/source-bound read/pre-authorized pause/confirmation permissions and an existing ignored journal directory below this checkout's `.tmp`. No secret or project identifier is emitted. The journal contains only sanitized metadata and a sequential hash chain, opened exclusively and fsynced. It is separate from the immutable six backup files.

Wait for `ready`, send `backup` with the exact six-file manifest/directory and producer completion/checksum timestamps, then wait for `backup-accepted`. The runner performs native persisted-byte/ACL inspection and requires completion, checksums, inspection and durable acknowledgement within T0+5 minutes. The supervising operator must independently bind that manifest and those timestamps to the native same-snapshot capture receipt; the runner's byte inspection alone cannot establish acquisition provenance or make an old rehearsal backup current. Send `arm` and wait for the durable `armed` acknowledgement immediately before starting DDL. No DDL may run after absent/failed acknowledgement. After actual migration and decisive catalog/security verification, send `success` with same-run/source/target identity and the actual ordered completion timestamps. These are reports from the trusted native executor, not a replacement for full readback evidence. On decisive failure send `failure`; retain the process/channel until its terminal receipt. EOF, malformed or out-of-order input after arm latches pause. Do not terminate the watchdog to cancel an armed run.

The separate process uses monotonic elapsed time plus wall-clock progress, with a one-second request scheduling margin before the10-minute deadline. Requests are one-shot and individually bounded. Request rejection/timeout does not imply a stopped project; confirmation continues independently. Lost time, failed durable records, late results and20-minute expiry cannot establish recovery eligibility. A process or machine outage is not proven safe by the local timer tests: the actual execution host, supervisor lifetime, native input/receipt bindings and emergency authority must be accepted before arming. A wake after expiry may finish its one bounded pause attempt, but cannot authorize restore. Even `SUCCESS_DISARMED` returns whole-Gate `NO-GO`; the separate nine-stage verifier remains mandatory.

Native pause uses the fixed [pause endpoint](https://supabase.com/docs/reference/api/v1-pause-a-project); project identity/status uses the fixed [project endpoint](https://supabase.com/docs/reference/api/v1-get-project). TLS is mandatory, redirects are rejected, and the token goes only to the Management API origin. Preflight requires exact ACTIVE_HEALTHY identity and a successful read-only PostgreSQL17 probe. The currently implemented confirmation oracle requires exact fresh INACTIVE identity, explicit connection refusal on the bound Direct database endpoint, and HTTP503 from both the bound REST and Auth endpoints. DNS errors, TLS errors, timeouts, pending statuses, generic non-success and authorization failures remain UNKNOWN. This oracle has local transport-contract coverage; its behavior on an actual paused hosted project has not been observed. Do not claim emergency readiness or relax it merely because the normal-state preflight succeeds.

The incident checklist below maps all ten required configuration entries to concrete consumers and stop conditions. Values remain in protected operator artifacts; a row's specification is not proof that the hosted setting has been applied.

| Entry | Exact preparation / incident action / verification |
| --- | --- |
| region | Preserve the user-selected same Free organization and `ap-northeast-1`. Recheck the zero-cost plan/quote and active limit before arm. Provision only after exact source inaccessibility is confirmed within20 minutes; healthy Production is never paused to create a rehearsal slot. Verify the new project's actual identity/region/PG17 before restore. |
| extensions | Compare the complete captured extension/version inventory and require the design's pg_net, pg_cron and Vault availability. Check managed Auth77/Storage68 compatibility and the explicitly bounded index/ACL differences. Perform the R5 empty-public default-privilege preparation as ordinary postgres, then restore the unchanged six files. Stop on an unknown platform baseline or permissions difference. |
| authProviders | Restore the protected Auth export's selected providers and settings; the saved selection is Email enabled with other providers disabled. Independently read back configuration. Auth table restoration is separate from provider configuration; do not create replacement user IDs. |
| authRedirects | Restore the exact protected Site URL/redirect list, including the application confirmation flow implemented in `app/auth/confirm/route.ts`. Compare saved values privately; never infer new callbacks or expose URL/private input lists in logs. |
| endpointCutover | Identify the actually deployed Production application artifact first; `wrangler.jsonc` names `v-streamer-tools`, but source configuration is not deployed identity. Prepare an emergency rebuild of that accepted production application revision with the Recovery public URL/key and server credentials. `lib/supabase/env.ts`, `server.ts`, `browser.ts`, billing runtime and durable stores consume these settings. Rebuild/redeploy is required for browser-bundled NEXT_PUBLIC values; a server-secret update alone is insufficient. Keep normal feature deployment/Paid activation outside this operation. |
| secretRotation | Replace the recovered project's `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and actually consumed `SUPABASE_SERVICE_ROLE_KEY` together. `SUPABASE_SECRET_KEY` is a declared server name, not a substitute for consumers that explicitly read service-role. Obtain new project credentials through protected input; do not copy a paused project's project-scoped credentials. Preserve the existing application-level YouTube credential-reference/token-store key references and versions needed to read restored records; `lib/comment-translator-youtube-oauth-token-store-persistence.ts` identifies `YOUTUBE_OAUTH_TOKEN_STORE_KEY_REF` / `_VERSION`. Do not blindly rotate these independent keys or OAuth/Stripe secrets. |
| clientReauthentication | Keep old project tokens/cookies out of the new session. Exercise the new-project login and `/auth/confirm` path with the same restored account identity. `app/account/actions.ts` supplies signOutAction, but remote sign-out against an unavailable old project is not proof of global invalidation. Verify old tokens fail and the new authenticated session is bound to Recovery; never inspect or log browser token values. |
| freeSmoke | With only the approved operator able to reach the recovery application, verify login/account, `/tools/comment-translator`, saved Free settings/quota projection and the approved bounded session Start/Stop path. `app/api/comment-translator/session/route.ts` is the route boundary. A live translation/provider/OAuth exercise requires its specific incident authorization and fixture; otherwise report that portion unverified. Confirm no Paid entitlement promotion, Checkout or maintenance execution. |
| reopenWrites | Keep an approved edge-level maintenance/access restriction until readback and operator smoke pass. The existing `COMMENT_TRANSLATOR_FREE_BETA_RUNTIME_ACCESS` / `COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES` gate in `lib/comment-translator-private-launch-access-gate.ts` can restrict Translator access, but does not cover every Auth/webhook/direct writer. Do not use it as a global write freeze. Exact edge rule/allowed operator, all writer coverage and reopening authority are still required; cutover remains blocked if they are absent. Restore the reviewed access configuration only after explicit writes-reopen approval. |
| exactSourcePause | Bind the source ref privately to the reviewed Production Direct binding. Retain the watchdog pause/confirmation receipt and independent complete history/data/Auth/grants/RLS/Vault/Storage readback. Keep the source paused; no automatic unpause or deletion. In `workers/comment-translator-paid-open-next-wrapper.mjs`, prevent `COMMENT_TRANSLATOR_PAID_SCHEDULER_AUTHORITY` from selecting `cloudflare-cron-fallback`; verify actual fallback state separately from the source guard and preserve inactive database Cron. |

Remaining operational inputs are explicit: trusted native backup/executor receipt binding, actual paused-project oracle support, accepted supervisor host/lifetime, deployed Production application identity, protected recovery credential references, complete edge restriction/writer coverage and the individual incident/cutover/reopening approvals. No existing local PASS or checklist hash fills these gaps. No source pause, project provisioning, Auth change, credential rewrite, deploy, restore or cutover was performed in this local cycle.

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

2026-09-09 Storage baseline release identified: native verify-full/read-onlyでProduction storage.migrationsの68件を取得。公式storage v1.72.11 commit518862dff5b2e4f3386ad51e4a172e91d0ce2ad2のtenant SQL1-67は全件Git blob整合・本番name/hash一致。bootstrap0もpostgres-migrations v5.3.0公式SQLのname/SHA1(filename+SQL)一致、合計68/68。固定local storage v1.61.7は0060までで、差分0061-0067は公式platform更新と確認。v1.72.11は比較候補であり、本番稼働imageや復元先catalog適合の証明ではない。新image取得/新version起動/管理SQL適用は未実施。次は承認済みの使い捨てlocalサービスとして候補版を起動し、完全Auth/Storage catalog・ACL・依存関係を再比較する。本番書込み0、user delta未確定、Gate1 NO-GO。

2026-09-09 Storage v1.72.11 local candidate comparison: 承認済みimageを取得しsha256:d189b8072865b5d8289af9435dee18eb6eef82f465e1d7d092fa9665bbd4ce54へ固定。既存所有local CLI環境内のStorageのみ候補serviceへ切替、local DB alias/network一致を確認しhosted credentialは渡さず実行。Auth77/Storage68とStorage name/hash全68一致。しかしnative RR/RO catalogはsource595/candidate621 objects、dependencies795/802で不一致。共通function21の定義は完全一致、source-only Auth index4、candidate-only Iceberg2tablesと関連18columns/5constraints/5indexes、共通storage.buckets/objectsのowner grant-option表記2差が残る。Auth4indexは公式Auth v2.192.0 indexworkerの定義に一致し、Storage0038/0047/0048はstorage.multitenantでIceberg table作成を分岐する。これは初期化設定差の説明であり、本番service設定の直接観測ではない。既存SQL token比較は文字列/dollar本文を十分保持していなかったため旧14/23・8/20件は判定根拠から除外。生本文を保持するとCRLF/LF由来の関数差も含むため、最終判断はnative catalog比較を使用する。2回目は不足していたnative定義/ACL/依存関係取得のため実施。両runの候補container cleanupとCLI cleanup2actions PASS、独立CLI container/network/volume・候補container・scratch各0。次は管理サービスの正式な初期化設定（Auth indexworkerとStorage multitenant分岐）を空の隔離環境で再現する設計確認。管理tableの手動DROP、role権限拡大、本番書込み、6file本番backupは未実施。user delta未確定、Gate1 NO-GO。
