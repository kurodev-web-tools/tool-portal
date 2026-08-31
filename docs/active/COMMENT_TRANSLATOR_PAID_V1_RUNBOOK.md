# Comment Translator Paid Core v1 運用Runbook

**対象:** Kuro Live Comment Translator Plus（Paid Core v1）

**状態:** repository-implemented。ローカル契約・security/privacy reviewは本Taskで確認する。外部設定、live Provider、live Stripe、deploy、activation、公開は未実施で、externally-unverified / approval-gated とする。

**適用範囲:** Paid entitlement、Checkout、Provider、Webhook、capacity、retention、account deletion、dispute、rollbackの運用判断を、本文・secret・private identifierを扱わずに行うための手順。Task 10はcopy/docs/testsのみであり、Gate 0、Task 11、production設定変更は実行しない。

## 1. 常に守る境界

- Paidの権限は、Checkout完了画面やブラウザの状態ではなく、署名済みWebhookから作られたserver-owned durable projectionだけを正本とする。
- Freeは常に維持する。Paidのentitlement、quota、cost、Provider、capacityが読めない場合はPaidをfail closedで停止し、Freeへ自動移行してPaidの利用を継続しない。
- 画面・ログ・runbook・運用報告には、status、count、時刻、error class、retry/stale件数などのsanitized metadataだけを出す。raw payload、コメント本文、Provider error本文、secret、token、Checkout URL、Customer/Subscriptionの値、provider target metadata、liveChatIdは出力・保存しない。
- disputeや障害は対象ownerの範囲を越えてグローバル停止へ拡大しない。対象を一意に特定できない場合は手動調査へ隔離する。

## 2. 公開文言と保存境界

公開するPaid条件は次で統一する。

| 項目 | Canonical wording / boundary |
| --- | --- |
| 価格 | JA: `US$6/月（支払総額・USD請求）`、EN: `US$6/month (total price, billed in USD)`、自動更新。適用される税がある場合はStripe Checkoutで表示する。カード会社の換算額・手数料は変動し得る。 |
| 利用枠 | 契約更新周期あたり最大50万入力文字（500,000文字）。保証文字数ではなく、個人・全体・運用上限で先に停止し得る。 |
| 販売 | 日本（JP）および米国（US）。クレジットカード、デビットカード等のカード系のみ。振込には対応しない。 |
| 解約・返金 | 解約は次回更新日から有効。日割り返金は自動提供せず、返金は二重課金、法令上必要な場合、重大障害等を個別確認する。 |
| Provider送信 | コメント本文は翻訳処理のためOpenAIまたはAzureへ送信される。Provider/model選択はserver-side policyで決める。 |
| 当サービスDB | sanitized feed snapshot（表示用コメント本文、翻訳結果、safe author display name）をsession終了後最大24時間保持する。 |
| 複製禁止 | Provider request detail、ログ、集計、冪等台帳へコメント本文を複製しない。 |
| Provider側 | OpenAIは標準のabuse monitoringにより最大30日保持される可能性がある。Azure TranslatorはMicrosoftのNo-Trace方針を前提とする。両者と当サービスDBの保持を混同しない。 |

「コメント本文を一切保存しない」「当サービスDBに保存しない」「自サービス非保存」という公開表現は使用しない。sanitized feed snapshotは当サービスDBに保存される明示的な例外ではなく、Paid v1の通常の表示・復元境界である。

保持期間の実装上の目安は、feed snapshot=session終了+24時間、Provider detailのowner/provider/UTC hour bucket=30日、session summary/Stripe event=90日、aggregate/終了Subscription=13か月とする。実際の適用は既存Retention contractとserver-side authorityに従う。

## 3. dispute対応

### 3.1 受付と対象特定

1. Dispute eventを署名検証し、対象Charge/PaymentIntentからCustomer、Subscription、対象ownerを一意に導出できるかを確認する。
2. 一意に導出できない場合は、対象を手動調査のreconciliationへ隔離する。全利用者のPaid、Checkout、Freeをグローバル停止しない。
3. 対象が確定した場合だけ、対象ownerのPaid翻訳と新規Checkoutを停止する。Freeは継続可能とする。
4. 判断・監視にはevent type、status、対象件数、最終試行時刻、sanitized error classだけを使い、本文やraw決済payloadを証拠保存しない。

### 3.2 dispute利用者勝訴・全額返金

次の順序を崩さない。

1. 対象ownerのPaid entitlementを即時停止する（Paid即時停止）。
2. 対象Subscriptionへidempotentなcancelを要求する。二重cancelや別Subscriptionへの操作を行わない。
3. 現在Subscriptionを再取得し、Stripe側のcanceledを確認する。
4. canceled確認後だけ対象capacityを解放する。
5. cancel要求または再取得が失敗した場合は、Paid停止・capacity保持・manual reconciliationを継続する。先にcapacityだけを解放しない。

### 3.3 dispute運営勝訴

運営勝訴を受けても自動復元しない。現在Subscriptionを再取得し、次の全条件を満たす場合だけ残存periodのPaidを復元する。

- 現在Subscriptionが存在し、現在periodが有効である。
- payment failure、解約・返金、別dispute、quota/cost/infra停止、reconciliationなど他の停止理由がない。
- 対象ownerとSubscriptionのimmutable bindingが一致している。

いずれかが不明・不一致・取得失敗なら停止を保持し、manual reconciliationへ送る。

## 4. アカウント削除

- Paid契約中の通常削除要求はSubscriptionを期間終了時解約へ変更する。
- 支払済みperiodの終了まではPaidの契約条件を適用する。
- period終了後にアプリ側のアカウントと関連データを削除する。feed snapshotや短命receiptはRetention policyに従い、期限到来後にbounded cleanupする。
- Stripe側の法定・会計情報はStripeの保持方針に従う。アプリ側から完全削除できると断定しない。
- 法的理由等による即時削除は個別判断とし、dispute・返金・会計対応に必要な最小限の情報を先に確認する。

## 5. kill switch と安全停止

独立した設定を次の7つとして扱う。設定値はrunbookやログへ出さず、statusだけを確認する。

- `checkout_enabled`: 新規Checkoutの作成可否
- `us_checkout_enabled`: USからの新規Checkoutだけの作成可否
- `automatic_tax_enabled`: Stripe Checkout automatic taxの有効化
- `tax_registration_ready`: 必要な公的登録とStripe registrationの準備確認
- `paid_translation_enabled`: Paid翻訳全体の可否
- `openai_enabled`: OpenAI通常経路の可否
- `azure_fallback_enabled`: PaidのAzure fallback可否

欠損・不正・読み取り不能は安全側へ倒す。Full kill switchではPaid翻訳とfallbackを停止する。OpenAI障害だけで`paid_translation_enabled`を無条件に切り替えず、Provider failure class、circuit state、Azureの安全余白と台帳読取可否を確認する。

`automatic_tax_enabled=false`かつ`tax_registration_ready=false`はmonitoring-only modeとして新規Checkoutを許可でき、Stripeへ`automatic_tax[enabled]=false`を送る。両方trueはregistered-ready modeとして同`true`を送る。片方だけtrue、欠損、空白付き、大文字、alias値は`tax-settings-stopped`としてJP/US双方の新規Customer、hold、Session作成前に停止する。unbound recoveryも新しいSessionを作らずretryableへ収束する。

US switchは新規購入のadmission gateだけであり、既存Subscription、entitlement、translation、Webhook projection、Customer Portal、支払い方法、請求履歴、cancel-at-period-end、解約reconciliationへ適用しない。US停止で自動解約・返金・capacity releaseを行わない。US switchを落とす前に発行済みのCheckout URLと、すでにadmit済みの同一idempotency holdは既存in-flight residualである。国を永続化しないためUSだけを遡及判定せず、緊急時の発行済みSession expiryはglobal Checkoutの別承認運用とする。

### 5.1 Stripe Tax MonitoringとUS activation

Monitoringは法的判断authorityではなく、内部分類を`normal`、`approaching`、`needs-attention`、`legal-review-required`、`monitoring-unavailable-or-stale`に限定する。反映は最大7日遅れ得るため、threshold exceededを待たない。US新規Checkoutを許可できるのは、税務専門家が開始時点のregistration duty、physical/economic nexus、商品課税区分を確認して開始可と判断し、分類が`normal`、US switchが明示trueのときだけである。`approaching`以降またはunavailable/staleではUS全体の新規Checkoutを停止する。

登録義務が確認された場合は、(1) US新規Checkout停止、(2) 専門家が対象州と商品分類を確定、(3) 州当局へ登録、(4) Stripe active registration追加、(5) test/PreviewでTax計算・Checkout/invoice表示・inclusive totalを検証、(6) tax設定2値をtrueにする個別承認、(7) US switch再開の別承認、の順とする。Stripe registrationは州当局登録の代替ではなく、架空・便宜的registrationは禁止する。

## 6. Provider障害

- Network、timeout、408、429のbounded retry後、500、503、504だけを一時障害の候補として扱う。
- entitlement、owner、quota、cost、policy、認証・設定、invalid request、policy block、unsupported、kill switchの停止はAzureへ迂回しない。
- OpenAIのretry/fallbackは同じ論理attemptへ紐づけ、成功済みitemを再送しない。timeout・切断・crashで外部実行が不明なslotはTTLまたは完了確認まで保持する。
- Azure direct fallbackはOpenAI slot/RPM/TPM/costを取得せず、Paid quotaとAzure側の論理・物理安全枠だけを別に確保する。
- 3件/60秒のeligible failure、5分のdegraded、half-open probeというdurable circuit条件を維持する。Provider error本文はログやrunbookへ保存しない。

## 7. Webhook backlog とreconciler

- Webhookは署名検証、event receipt lease、現在object再取得、durable projectionの順で処理する。processing/retryable/再取得失敗は成功扱いにしない。
- backlog監視は未処理件数、retry件数、stale lease件数、最古の次回試行時刻、sanitized error classだけで行う。
- 既存Supabase Cronを標準の単一schedulerとし、利用不可時だけ既存Cloudflare Cronを代替にする。同一環境で通常時の二重authorityを作らない。
- reconcilerは1回最大50件、120秒leaseでclaimし、stale tokenを拒否する。cancel/expire/再取得が失敗した行はPaid停止・capacity保持・backoffを続ける。
- backlog解消のためにraw payloadを再出力したり、手動でPaid/capacityを直接書き換えたりしない。5回以上のretryはsanitized alertとmanual reconciliation対象にする。

## 8. 容量逼迫・インフラ閾値

次の閾値は新規購入・新規セッション・auto-pollを段階的に停止するための安全判定であり、自動的な有料プラン拡大やプラン変更を意味しない。

- 60%: 警告とsanitized監視
- 75〜80%: 新規Checkout停止
- 90%: 新規Paidセッション開始停止
- 95%: active clientのauto-poll停止、次のUTC reset時刻を返す

Supabase、Cloudflare、Azure、OpenAIの設定・使用量が読めない場合はPaidの新規開始を止める。Freeの通常経路は、Free固有の権限・台帳・上限を維持できる範囲で継続する。容量の解放は、対象Subscriptionの終端を確認した後だけ行う。

## 9. rollback

### 9.1 Trigger

- Paid entitlementの誤付与・誤停止、20枠超過、二重消費、raw data保存境界違反、またはProvider/Stripe/Webhookの高信頼な安全境界破綻。
- 機密値・private identifier・コメント本文がログ、ブラウザ、DB、運用報告へ出た疑い。
- migration/RPC、scheduler、Cloudflare、Provider、Stripeの外部設定が想定したauthorityと不一致。

### 9.2 手順

1. sanitized status/countと発生時刻だけを記録し、証拠としてraw payloadや画面本文を保存しない。
2. 必要な範囲で`paid_translation_enabled`、`checkout_enabled`、Provider別kill switchを停止し、Freeの安全な利用可能性を確認する。
3. entitlement、capacity、hold、receiptの行を直接削除・再割当てせず、既存のidempotent RPC/reconcilerとmanual reconciliationで収束させる。
4. repository rollbackは対象branch/commitの別承認を得て行い、production deploy、remote migration、Stripe/Provider/Cloudflare設定のrollbackを暗黙に実行しない。
5. rollback後にTask 10 legal/security/privacy contract、Task 2〜9 sibling contract、syntax、secret/private-identifier scan、lint/typecheck/buildを再実行する。外部状態は別のread-only確認で再検証する。

## 10. Security / Privacy review checklist

- [ ] high-confidence secret scan: secret/token/OAuth/service-role/private credentialの値が0件。
- [ ] private identifier scan: owner、Customer/Subscription、provider target metadata、liveChatId、raw message referenceの値が0件。
- [ ] ログ出力review: raw provider payload、raw error、コメント本文、Authorization header、Checkout URLを出さず、sanitized class/count/statusだけを扱う。
- [ ] Browser review: billing authority、entitlement、country authority、private billing identifierをlocalStorage、sessionStorage、IndexedDB、cookie、handoff payloadへ保存しない。
- [ ] Route review: Terms、Privacy、Tokushohoの3 routeがcanonical `legalDocuments`を描画し、Paid条件との境界が一致する。
- [ ] Raw-content review: feed snapshot以外のProvider detail、ログ、aggregate、idempotency ledgerに本文が入らない。
- [ ] Review結果はrepository-implemented / locally-verified / setup-blocked / externally-unverified / approval-gatedを混ぜずに記録する。

## 11. 法務・専門家確認（未確認のまま残す項目）

公開前に、次を専門家または公的情報で確認する。Task 10では未確認事項を断定しない。

- 税務: JP/USの販売対象、税務登録、申告・納付、Stripe Taxの設定だけで足りるか。
- 特商法: 販売価格、支払総額、適用税のCheckout表示、自動更新、解約、返金、提供時期、事業者情報、カード系のみ・振込非対応の表示。
- Privacy: sanitized feed snapshotのsession終了+24時間、OpenAI最大30日保持可能性、Azure No-Trace、Stripe・Supabase・Cloudflareの委託/越境/保持説明。
- Terms: 50万文字が保証値ではなく安全上限で先行停止し得ること、disputeのowner限定処理、account deletion、返金の個別判断。
- Provider/Stripe: 実環境のデータ利用、保持、ZDR資格、税・決済手数料、支払方法、Webhook/Portalの最終条件。

## 12. 承認順と現在の状態

承認順は `Gate 0 test/Preview設定承認 → Local/Preview QA → Gate 1 live/production設定承認 → production dark deploy → live無課金readiness → Gate 2 Paid activation/公開承認 → activation` とする。

Task 10の現在状態:

- repository-implemented: legal copy、Paid条件、privacy/security contract、runbook。
- locally-verified: focused RED/GREEN、Task 2〜9 sibling/Free baseline、静的scanとdiff検証を行う。
- setup-blocked: `node_modules`不足等でlint/typecheck/buildまたは起動可能なbrowser QAが実行できない場合は、その範囲だけを未確認とする。依存 installは行わない。
- externally-unverified: test/Preview Supabase、Stripe、Provider、Cloudflareの設定・live/read-only状態、実使用量、実Webhook delivery、deploy/activation。
- approval-gated: Gate 0、Task 11、production設定、remote migration/RPC/Cron、live Stripe/Provider/Cloudflare操作、deploy、公開、commit、push、PR、merge、cleanup。

Task 10は、Gate 0の承認やTask 11 Local/Preview QAを代替しない。

## 13. Task 11 Preview bounded load harness

### 13.1 範囲と安全境界

Task 11 Preview harnessは、共有Previewへ実行する前提の、合成データだけを使うbounded load commandである。既存の`comment-translator-paid-core-v1-task11-local-load-fixture.ps1`とそのSQLはlocal-container専用のまま変更せず、Preview harnessへ転用しない。

- `run-id`は`task11-preview-YYYYMMDD-<8〜24文字の小文字英数字>`を明示する。run-idからowner、session、attempt、reservationのnamespaceを決定し、同じrun-idの残留があれば開始せずfail closedとする。
- 実行上限は同時20 session。runtime fixtureは20 session、720 poll/session、180 coalesced heartbeat/session、1 comment/minuteの60-message boundary、同じUTC hourのOpenAI/Azure fallback accountingを測る。
- 24時間分は20×8のrestart plan（160 window、115,200 planned poll/request fixture）として記録する。DB clockを偽装せず、24時間経過そのものは測定しないため`restart_elapsed=not-simulated`とする。
- provider、Stripe、Cloudflare、YouTube、schedulerへの実通信は行わない。OpenAI/Azureはreceipt/accounting fixtureだけであり、Cloudflareはrequest-count fixtureだけである。
- SQLは`BEGIN`から`ROLLBACK`までのtransactionで合成行を測定し、run namespaceだけをcleanupしてから結果を返す。共有のUTC poll bucket、provider circuit、既存fixtureを直接削除・resetしない。
- storage fixtureは共有`public` relationへ書き込まず、schema形状に対応するrun専用temporary relationと一時indexへlogical attempt/attempt receipt 129,600行、provider source/hourly 28,800行、session summary 14,400行を投入し、`pg_total_relation_size`/`pg_indexes_size`を測る。temporary relationはtransaction終了時に破棄するため共有Previewのrelation/index bloatを残さない。これは`temporary-relation-transaction-only`のSQL観測であり、Supabase Dashboardのpersistent Database quotaや本番artifact identityの証拠ではない。

### 13.2 実行モード

次の例は説明用のsanitized run-idとproject-ref placeholderである。project-refの実値、token、service-role key、CLI出力をチャットやログへ貼らない。CLIの通常profile認証を使い、`SUPABASE_SERVICE_ROLE_KEY`、`--db-url`、`--local`は使用しない。

```powershell
$env:COMMENT_TRANSLATOR_PAID_TASK11_PREVIEW_TARGET = "preview"
$env:COMMENT_TRANSLATOR_PAID_TASK11_PREVIEW_PROJECT_REF = "<verified-preview-project-ref>"
$runId = "task11-preview-20260831-abcd1234"
$harness = "scripts/comment-translator-paid-core-v1-task11-preview-load-harness.mjs"

node $harness --dry-run --fixture runtime --run-id $runId
node $harness --preflight --fixture runtime --run-id $runId --confirm-preview-target
```

`--dry-run`は外部へ接続しない。`--preflight`はlinked migration listだけをread-onlyで確認する。`--execute`はPreview target確認、別途の明示approval flag、下記のapproval environment valueをすべて要求する。runtime/storageを分けて実行し、`all`は両方を順番に実行する。

```powershell
$env:COMMENT_TRANSLATOR_PAID_TASK11_PREVIEW_LOAD_APPROVAL = "I approve the Task 11 bounded Preview load harness against the currently verified Preview target only; use synthetic fixtures with transaction rollback and exact run cleanup; do not run providers, Stripe, Cloudflare deploy, scheduler activation, production, or main."
node $harness --execute --fixture runtime --run-id $runId --confirm-preview-target --approved-preview-load
node $harness --execute --fixture storage --run-id $runId --confirm-preview-target --approved-preview-load
```

通常のexecuteはrollbackする。中断後にrun namespaceの残留がread-only確認で認められた場合だけ、同じrun-idを指定し、cleanupの別承認でexact cleanupを行う。cleanup対象はderived owner、run prefix、session referenceに一致する行だけで、global bucketや別fixtureを対象にしない。

```powershell
$env:COMMENT_TRANSLATOR_PAID_TASK11_PREVIEW_CLEANUP_APPROVAL = "I approve exact cleanup of the Task 11 synthetic Preview run namespace only; do not delete shared, production, or unrelated fixture data."
node $harness --cleanup --fixture all --run-id $runId --confirm-preview-target --approved-preview-cleanup
```

### 13.3 Egress / Realtimeの外部測定境界

SQL harnessのRPC latency、row count、relation/index bytesは、Supabase Management/DashboardのEgress・Realtime使用量とは別の証拠である。Egressは[Supabase Egress usage documentation](https://supabase.com/docs/guides/platform/manage-your-usage/egress)のUsage画面で、同じorganization、Preview project、期間を選び、Total Egressとcached/uncachedのbaseline/deltaを記録する。Realtimeは[Realtime reports](https://supabase.com/docs/guides/realtime/reports)のConnected Clients、Broadcast、Presence、Postgres Changesを同じ期間で記録する。

- 60% gateは実行時点のplan quotaに対して適用し、固定値の推定やSQL row countからEgress/Realtimeを換算してPASSにしない。
- Dashboard/Management APIの対象project、期間、plan quota、baselineまたはdeltaが取得不能・粒度不一致なら、その項目は`UNKNOWN`とする。UNKNOWNを測定済みPASSへ置き換えない。
- `pg_total_relation_size`はDatabase relation allocationでありEgressではない。DB change row countはRealtime client event countではない。Realtime eventを測るには実際の購読状態とRealtime reportの観測が必要である。
- quotaの現行値・plan区分は実行時に[Supabase billing and quotas](https://supabase.com/docs/guides/platform/billing-on-supabase)を再確認し、Database sizeの意味は[Database size documentation](https://supabase.com/docs/guides/platform/database-size)に従う。

### 13.4 Evidence state

- `repository-implemented`: Preview harness、runtime/storage/cleanup SQL、focused contract、Runbook。Preview実行で検出したPL/pgSQLの`utc_hour`変数/カラム衝突は、focused contractのRED→GREEN後に変数を`v_utc_hour`へ限定修正した。
- `locally-verified`: focused contractは修正後PASS。既存local-only fixtureは変更していない。
- `deployed Preview`: Cloudflareのactive versionはread-only確認済み。ただしGitHubにPR #808のcheck/deploy runがなく、active version metadataにも比較可能なsource revisionがない。
- `external measurement`: 2026-08-31 18:45 JSTにPreview project限定でruntime/storageを実行し、SQL transaction observationとDashboard即時値を取得した。詳細は13.5。
- `artifact identity`: PR #808 merge SHAとactive Preview versionを比較できるdigest/tag/messageがないため`UNKNOWN`。
- `scheduler activation`: `false`。activation、production/live、commit、push、PR、mergeは別承認。

### 13.5 2026-08-31 Preview execution evidence

- target/preflight: linked project metadataと明示Preview project refが一致し、service-role environmentなし。`dry-run`とlinked migration `preflight`はPASS。
- runtime: run id `task11-preview-20260831-a31f9c2d`。20 sessions、14,400 poll reads、3,600 heartbeat writes、160 restart windows、115,200 Cloudflare request plan、1,200 message commits、同一UTC hour provider rows 2、empty polls 14,400、provider calls 0、cleanup rows remaining 0。Provider/Stripe network calls、Cloudflare deploy、scheduler activationは0/未実施。
- runtime repair: 初回実行はSQLSTATE 42702でtransaction rollback。原因はPreview fixtureのPL/pgSQL変数`utc_hour`と`provider_detail.utc_hour`の曖昧参照。focused contractで再現してから`v_utc_hour`へ限定修正し、contractとPreview runtime再実行がPASS。
- RPC latency: p95はread poll budget 103 µs、heartbeat 1,105.05 µs、message reserve 530.05 µs、message finalize 615 µs、OpenAI hourly fixture 954.2 µs、Azure fallback hourly fixture 803.85 µs、session start 1,177.95 µs。
- storage: temporary relation transaction限定でlogical attempts 129,600、attempt receipts 129,600、provider source receipts 28,800、provider hourly rows 28,800、session summaries 14,400。relation total 161,161,216 bytes、index 65,839,104 bytes、cleanup rows remaining 0。共有`public` relationへのpersistent fixture rowは残していない。
- Egress: organization UsageをPreview projectへ限定し、同じbilling periodの実行直前/直後を観測。即時表示は0 GBのままで、表示上60%未満。Dashboard注記どおり最大1時間の反映遅延があるため、遅延後deltaは`pending-refresh`。
- Realtime: Preview projectのObservability > Realtimeを`Last 60 minutes`で実行後に再観測。Connected Clients、Broadcast Events、Presence Eventsはno data、Postgres Changes Eventsは0で、表示上60%未満。最大24時間のUsage反映遅延があるため、billing usage側の遅延後deltaは`pending-refresh`。
- cleanup: runtime/storageのtransaction observationはいずれもcleanup rows remaining 0で、exact remote cleanupは不要。session-onlyの未追跡実行計画は削除し、follow-up evidence branch/worktreeはPR review用に保持する。remote branch deletionは未実施。
- acceptance classification: `preview_runtime=PASS`、`preview_storage=PASS`、`immediate_egress_gate=PASS-under-60`、`immediate_realtime_gate=PASS-under-60`、`bounded_preview_harness_acceptance=PASS`、`delayed_usage_delta=pending-refresh`、`ARTIFACT_IDENTITY=UNKNOWN`、`task11_full_acceptance=NO-GO-pending-delayed-usage-and-artifact-identity`。SQL row countやrelation bytesをEgress/Realtimeへ換算していない。
