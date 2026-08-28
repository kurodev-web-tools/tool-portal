# Comment Translator Paid Core v1 新規仕様設計

**状態:** Paid Core v1承認済み。2026-08-27のJP免税表示・US Checkout・Stripe Tax安全仕様はTask 11 local implementation authority。remote mutation、deploy、commit/push/PRは別承認。

**作成日:** 2026-08-12

**基準ブランチ:** `origin/main` (`6aad699afe692650dbbb684dfb912e2c45d8e270`)

**対象:** Kuro Live Comment Translator の有料プラン本体（Paid Core v1）

## 1. 文書の権限と境界

この文書は、現在の`main`に実在するFree版コードと、2026-08-12までの新規設計会話で明示的に承認された事項だけを根拠とする。

以下はすべて仕様根拠として無効とし、参照・復元・再利用しない。

- 過去の有料プラン仕様書・設計書・作業サマリー
- 過去の有料プラン実装、作業ブランチ、PR、レビュー
- 過去の承認・未承認、partial-stop、blocker、risk acceptance
- 過去の公開条件一覧から推測される仕様

現在の`main`に有料プラン向けのコードやテストが残っていても、それは現状把握と置換範囲の特定にだけ使用する。仕様上の正本は本書と、今後の明示的な承認だけである。

本書の承認までは、実装、マイグレーション適用、Stripe/OpenAI/Azure/Supabase/Cloudflareの設定変更、デプロイを行わない。

## 2. 目的

既存Free版を壊さず、コメント翻訳を大量に利用する配信者向けに、原価を予測可能な月額有料プランを提供する。最初は本番環境の先着20名アーリーアクセスとして公開する。課金ライフサイクルと障害系はStripe test mode/Test ClockおよびProvider fixtureで事前検証し、最初の実顧客以降は実運用の負荷・費用・到達性を監視する。

## 3. スコープ

### 3.1 Paid Core v1に含む

- Stripeによる月額サブスクリプション
- サーバー所有のPaid entitlement
- 契約更新周期ごとの50万入力文字枠
- Paid向けOpenAI GPT-4o-mini翻訳
- OpenAI一時障害時のAzure Translator fallback
- 利用量・原価・枠数の永続的かつ原子的な制御
- JP/US限定の販売地域ゲート
- 先着20名アーリーアクセス
- Checkout、Customer Portal、Webhook、支払い失敗、解約、dispute、アカウント削除
- 利用状況表示、障害表示、同意取得
- データ保持・自動削除・運用監視

### 3.2 Paid Core v1に含めない

- 年額プラン、無料トライアル、従量課金、追加文字購入
- 複数Paidプラン、Provider選択、モデル選択
- 銀行振込、コンビニ、PayPay、ACH、請求書払い
- 正式なウェイトリスト、空き通知メール、順番待ち
- EU、英国、カナダ、豪州、韓国、中国などJP/US以外への販売
- 辞書、優先コメント表示、OBS専用オーバーレイ、共有、履歴、CSV、AI要約等の追加機能
- 外部有料監視、専用サーバー、追加メール配信サービス
- Zero Data Retentionを公開必須条件にすること

辞書等はPaid Coreとは別仕様・別タスク・別PRとする。

## 4. 維持するFree機能

Paid追加を理由に、現在のFree版の利用権、認証、YouTube接続、表示、設定、セッション制御を削除・縮小しない。

少なくとも次を回帰保護する。

- Freeは常時利用可能
- Freeの通常翻訳ProviderはAzure Translator
- Freeの月間入力文字上限は20,000文字
- Freeの1分あたり翻訳上限は30件
- Freeのセッション・日次時間制御
- 1ユーザー1同時セッション
- Google/YouTube OAuth、接続解除、credential refresh
- 対応言語、短文・重複・翻訳不要判定、キャッシュ
- Start/Stop、heartbeat、feed表示、セッション終了後の既存表示
- 現在のFree利用量表示と、上限到達時の安全停止
- raw provider payload、secret、OAuth値、provider target metadata、`liveChatId`をブラウザへ返さない境界
- 現在のAdmin権限境界と未認証・未許可時のfail-closed

FreeとPaidの利用台帳は論理的に分離し、PaidのAzure fallbackによってFree利用者個人の20,000文字枠を消費しない。

## 5. 商品・価格・販売

### 5.1 商品

| 項目 | 決定 |
| --- | --- |
| プラン名 | `Kuro Live Comment Translator Plus` |
| プラン数 | 1 |
| 価格 | 月額US$6 |
| 請求通貨 | USDのみ |
| 価格表示 | 支払総額US$6。日本の消費税を徴収しているとは表示しない |
| Stripe Price | 月額、`tax_behavior=inclusive` |
| 自動更新 | あり |
| 年額 | なし |
| Trial | なし |
| 追加課金 | なし |

Canonical表示は日本語「US$6/月（支払総額・USD請求）」、英語「US$6/month (total price, billed in USD)」とする。Checkout前に「適用される税がある場合はStripe Checkoutで表示されます。」「Any applicable tax is shown in Stripe Checkout.」を表示する。カード会社による円換算額や海外利用手数料は変動し得ることを補足する。

既存Priceの`tax_behavior=inclusive`検証は、適用税がある場合も最終支払総額をUS$6に固定するStripe上の価格挙動として維持する。これは日本の消費税を徴収している、日本側の税務上の資格を示す、または税額を区分表示するという主張ではない。本変更では新規Priceを作成せず、Product/Price/Tax Code/registrationをremote変更しない。

現在の日本の免税事業者モードは`automatic tax=false`かつ`registration ready=false`とする。税務登録、申告、納付がStripe Taxの有効化だけで完了するとは扱わない。将来の日本側税務状態変更は別の法務確認・仕様・remote設定承認を必要とする。

### 5.2 割引

アーリーアクセス割引の有無と割引率は公開前に別途決定する。割引する場合も、同じProduct/PriceにStripe CouponまたはPromotion Codeを適用する。

- 別プラン、別entitlement、別の利用上限を作らない
- 割引利用者も通常Paidと同じ50万文字・機能を持つ
- 割引終了後の価格と適用期間はCheckout前に明示する

### 5.3 支払い方法

初期版は次だけを許可する。

- クレジットカード、デビットカード
- カードを基盤とするApple Pay、Google Pay
- Stripe Link
- Stripeが要求する3D Secure

`automatic_payment_methods`による未知の支払い方法の自動追加は行わず、許可する支払い方法を明示する。振込は要望が確認された後の別仕様とする。

## 6. 販売地域

### 6.1 対象地域

- 初期販売対象: 日本（`JP`）、米国（`US`）
- 韓国、中国: 将来候補
- その他の地域: Paid v1では販売しない

販売地域と翻訳元言語は独立する。日本語、英語、韓国語、中国語を翻訳元として利用できても、購入可能地域が増えるわけではない。

### 6.2 判定方法

Cloudflare Workerの`request.cf.country`をCheckout作成時の販売地域ゲートとする。

- `JP`または`US`: Checkout作成を許可
- その他、欠損、未知値: fail-closedでCheckoutを作成しない
- ブラウザのボタン非表示だけに依存せず、サーバー側で強制する
- 居住国の自己申告、手動審査、決済後の国照合は行わない
- 国判定結果をSupabaseへ永続保存しない
- 外部GeoIP API、KV、D1を追加しない
- VPNやIP誤判定は残余リスクとして受容する

US新規Checkoutにはglobal switchに加えて独立したUS switchの明示`true`を要求する。false、欠損、不正値ではUSの新規Customer、hold、Checkout Sessionを作成せず、JPには影響させない。US switchは既存Subscription、entitlement、translation、Webhook projection、Portal、支払い方法変更、請求履歴、cancel-at-period-end、解約reconciliationへ適用しない。州や完全なbilling addressをアプリDB、browser storage、logへ追加せず、Stripe Checkout/Customer側で扱う。

US switchを落とす前に発行済みのCheckout URLと、すでにadmit済みの同一idempotency holdは既存in-flightとし、国を永続化しない設計上USだけを遡及判定しない。緊急時に発行済みSessionまで止める操作はglobal Checkout/Session expiryの別運用とし、自動解約・返金・capacity releaseを行わない。

対象国外のアクセスには「現在の接続地域では購入できません」と表示する。IP由来の接続地域判定であり、居住国を断定しない。決済後に自動返金して地域不一致を処理する方式は、Stripe手数料が戻らないため採用しない。

## 7. アーリーアクセスと20枠

クローズベータではなく、本番課金される「先着20名アーリーアクセス」とする。

### 7.1 枠の数え方

| 状態 | 枠 |
| --- | --- |
| `active` | 使用する |
| 期間終了時解約 | 終了日まで使用する |
| 支払い失敗 | Paid翻訳は即停止し、7日間は枠を保持する |
| 支払い失敗から7日超過 | 契約終了・枠解放 |
| Checkout作成済み・未完了 | 30分間仮確保 |
| `incomplete` Subscription | 対応するCheckout holdまたは非終端枠を使用する |
| Checkout失効・放棄 | 仮確保解除 |
| dispute調査中 | 枠を保持する |
| cancel確認待ち | 枠を保持する |
| `paid-unentitled-reconciliation` / refund・dispute reconciliation | 枠を保持する |

Supabaseトランザクションまたは同等の原子的処理で枠を確保し、同時Checkoutでも20枠を超えないようにする。

### 7.2 満員時

- Checkoutを作成しない
- 「現在、新規受付を停止しています」と表示
- メール収集、空き通知、順番待ち、仮予約は実装しない
- 枠が空いたら自動的にCheckout作成を再許可
- 人数上限を自動拡大しない

### 7.3 Checkout・capacity lifecycle

次をDB不変条件とする。

- 1 ownerにつき、非終端billing lifecycleは最大1件
- 非終端には、未失効checkout hold、未完了Checkout Session、`incomplete` Subscription、`active`、`cancel_at_period_end`、`past_due`/`unpaid`の7日hold、dispute、cancel確認待ち、`paid-unentitled-reconciliation`、refund/dispute reconciliation、その他の終了確認前状態を含む
- 1 ownerにつき、非終端lifecycle配下のCheckout Session bindingとSubscription bindingはそれぞれ最大1件
- Stripe Customer IDのowner bindingは最大1件でimmutableとする。各billing lifecycleのCustomer参照も作成後は変更できない。同じCustomerは同じownerの後続lifecycleから新しいimmutable参照として再利用できるが、過去lifecycleの参照を移し替えない
- 1 Stripe Checkout Session ID、Subscription IDはそれぞれ複数ownerまたは複数billing lifecycleへbindできない。最初の関連付け後はinsert-only / immutableとし、owner/lifecycleの更新・再割当てを永続的競合として拒否する
- capacity消費状態であるcheckout hold、`incomplete`、`active`、期間終了待ち、payment-failure 7日hold、dispute、cancel確認待ち、paid-unentitled/refund/dispute reconciliationの合計は常に20以下

同じbilling lifecycle内でhold、Session、Subscriptionの複数stage rowが存在してもcapacityは1枠として数え、二重計上しない。

ownerと`is_terminal=false`に対するpartial unique index、外部ID unique constraint、原子的RPCで上記を強制する。同一ownerから同時にCheckout作成要求が来た場合、最初のRPCだけがopaqueな`billing_lifecycle_id`と`hold_id`を作り、後続要求は同じlifecycle/holdを取得する。Stripe Checkout Session作成には`ct-paid-checkout-{hold_id}`をidempotency keyとして使い、同じowner/lifecycleから複数SessionやSubscriptionを作らない。

Checkout Session作成順序は次で固定する。

1. Stripe Customerを作成または再利用し、Customer IDをownerへimmutableにbindする。既存bindingとの不一致・再割当て要求は永続的競合として拒否する。
2. DB transactionで非終端billing lifecycleとholdを作成または取得してlockし、`checkout_expires_at_target = server_now + 31分`とopaque idempotency keyを固定する。
3. transactionを跨ぐStripe API呼出として、固定idempotency key付きでCheckout Sessionを作成する。Stripe最短30分への60秒余白を含む同じtarget秒をSession `expires_at`へ渡す。
4. Stripeが返したSession ID、Customer ID、`expires_at`を、同じlifecycle/holdへ原子的にinsert-only bindingする。Stripe値をDBの権威値として保存し、target不一致またはimmutable binding競合ならSession expire処理へ移す。
5. DB commit成功後だけCheckout URLをブラウザへ返す。URLは保存せず、commit前、binding失敗時、Session再取得不能時には返さない。

StripeでSession作成成功後にDB bindingまたはcommitの失敗が確定した場合は、Checkout URLを返さず、そのlifecycleを`expire_required`として同じSessionをidempotentにexpireする。以後そのSessionを新規bindingしてURL返却へ戻さない。expire成功とStripe `expired`再取得を確認した後だけholdを解放する。expire要求または再取得に失敗した場合はholdを保持し、`next_reconcile_at`を設定してdurable reconcilerへ送る。一方、Stripe response消失やWorker crashでSession作成・binding結果が不明な場合は、同じidempotency keyの再実行でStripe側の作成済みSessionを回収し、まだ`expire_required`でなくimmutable条件が一致する場合だけ同じlifecycle/holdへ一度だけbindできる。DB binding前のWebhook到着も永続拒否にせず、この回収経路またはWebhook retryへ収束させる。

holdは`expires_at`到達だけでは再利用しない。期限到達後にStripe Sessionを再取得し、`expired`を確認してから原子的に解放する。再取得不能時はholdをcapacityへ数えたままretryable reconciliationとし、21枠目を作らない。完了時刻の権威データは、同じSession IDに対するStripe `checkout.session.completed` Eventの`created`（Stripe UTC epoch秒）とし、DB受信時刻やWorker時計を使わない。現在Sessionが`complete`、権威Eventの`created <= Session.expires_at`、対象Invoiceの支払い成功、binding一致、Subscription現在状態が有効、holdが未解放なら、そのholdを有効とみなし、同じtransaction内でactive枠へ変換してentitlementを投影する。Webhookが欠落してEvent時刻を取得できない場合はStripe APIから同じSessionのEventを回収するまでPaidを付与せずretryableとする。

hold expiryとcompletionが競合した場合もStripe現在状態を再取得して1つのtransactionへ収束させる。既に`expired`確認後に`complete`が届く矛盾、解放済みslotに対する支払い済みSession、ownerの別Subscription存在は自動付与せず`paid-unentitled-reconciliation`へ隔離する。新規枠を超過付与せず、重複Subscriptionを作らず、運営が返金またはcapacity是正を選ぶ。

`payment_failure_started_at`は、現在状態の再取得を伴う投影で最初に`past_due`/`unpaid`へ遷移したSupabase transactionの`server_now`に一度だけ固定する。同じ失敗期間中のduplicate、out-of-order、古いWebhookでは後退・上書き・リセットしない。現在Subscriptionが`active`へ正常復旧したtransactionでのみclearし、その後に別の支払い失敗へ遷移した場合だけ新しい起点を作る。起点から7日後は、現在Subscriptionを再取得し、まだ`past_due`/`unpaid`ならidempotentに即時cancelを要求する。Stripeで`canceled`を確認した後だけ枠を解放する。cancel失敗・再取得失敗中はPaid停止かつ枠保持を継続し、durable reconcilerが次回再試行する。既に`active`へ回復していれば7日cancelを行わずPaidを復元する。枠解放後に遅延`invoice.paid`が届いても、対象Subscriptionが終端済みなら無条件に再有効化せず手動reconciliationへ送る。

非終端lifecycleが存在するownerには新規Checkoutを作成しない。`past_due`/`unpaid`の利用者はCustomer Portalで既存Subscriptionの支払い方法を更新し、新しいSubscriptionを作成しない。lifecycleを終端へ変更できるのは、Checkout `expired`、Subscription `canceled`等のStripe終端状態と未解決reconciliationなしを現在objectで確認したtransactionだけである。

公式根拠: Stripe Checkout Sessionの`expires_at`は作成後30分から24時間の範囲で指定できる。<https://docs.stripe.com/api/checkout/sessions/create>

### 7.4 Durable billing/control-plane reconciler

時刻経過またはWebhook/response欠落だけで処理が必要になる状態は、利用者アクセスや次のWebhookに依存させない。環境ごとに既存Supabase Cronを標準の単一schedulerとして使用する。Supabase Cronを既存構成で利用できない環境に限り、既存Cloudflare Cronから同じSupabase claim RPCを呼ぶ。両方を同一環境の通常実行主体にはせず、新しい有料scheduler、Queue、Durable Object、外部監視サービスは追加しない。

billing lifecycle/control-plane rowは少なくとも`next_reconcile_at`、`payment_failure_started_at`、`reconcile_lease_until`、推測不能なopaque `reconcile_lease_token`、`reconcile_attempt_count`、`reconcile_backoff_seconds`、sanitized `last_reconcile_error_class`を持つ。時刻はserver UTCとし、本文、Stripe raw payload、Checkout URL、secret、private identifierをerrorへ保存しない。

reconcilerは`next_reconcile_at <= now()`かつlease失効済みの対象を1回最大50件のbounded batchで、`FOR UPDATE SKIP LOCKED`相当のRPCにより原子的にclaimする。claimは120秒leaseと新しいopaque tokenを発行し、attempt countを増やす。finalize、次回時刻更新、状態投影は一致するtokenだけを許可し、stale tokenを拒否する。Worker crash後はlease失効後に別実行が再claimできる。同時Cron、重複実行、途中停止でも外部操作のidempotency keyとDB transactionにより一度だけの終状態へ収束する。

失敗時は1分、5分、15分、1時間、以後最大6時間のbounded exponential backoffで`next_reconcile_at`を更新する。Stripe再取得不能、DB transaction失敗、cancel/expire要求失敗ではPaid停止・capacity保持のままretryし、transient failureを自動的な終端や枠解放へ変えない。5回以上はsanitized alert対象とするが自動放棄しない。

対象は少なくとも次を含む。

- Checkout `expires_at`到達後のSession再取得、`expired`確認、hold解放
- Session作成途中のWorker crash、Stripe response loss、DB binding前失敗、未bind Sessionのidempotency key回収・expire
- `payment_failure_started_at + 7日`到達後のSubscription再取得、未回復時のidempotent cancel、`canceled`確認後の枠解放
- cancel確認待ち、全額refund、dispute利用者勝訴、`paid-unentitled-reconciliation`、その他refund/dispute reconciliation
- 個人Stripe billing period切替とUTC月切替における文字・OpenAI原価・Azure fallback reservationの照合、前期間close、次期間開始許可

必須fixtureは、Webhook欠落かつ利用者アクセスなし、duplicate `past_due`で7日起点不変、`active`復旧後の新しいpayment failure、Cron同時実行、Cron途中停止、stale lease token、7日後cancel失敗から次回成功、原価period切替時のreconcile不能から後続復旧を含む。

## 8. Paid entitlement

### 8.1 権限の正本

Checkoutのsuccess redirectやブラウザ状態はPaidの証拠にしない。次を満たしたサーバー所有の永続projectionだけを権限の正本とする。

- Stripe署名検証済みWebhook
- 対象Product/Priceの一致
- 対応するStripe Customer/Subscriptionと内部ownerの一意な関連付け
- entitlement状態のSupabaseへの永続化
- イベント重複・順序逆転に耐えるidempotentな更新

entitlement読取、owner、session、usageのいずれかが不明な場合はPaidを付与せずfail-closedとする。

### 8.2 Stripe状態

| 状態 | Paid翻訳 | Free | 枠 |
| --- | --- | --- | --- |
| `active` | 許可 | 維持 | 使用 |
| `cancel_at_period_end`かつ期間内 | 許可 | 維持 | 使用 |
| `past_due` / `unpaid` | 停止 | 許可 | 7日保持 |
| `incomplete` | 停止 | 許可 | Checkout仮確保に従う |
| `incomplete_expired` / `canceled` | 停止 | 許可 | 解放 |
| dispute調査中 | 停止 | 許可 | 保持 |
| cancel確認待ち | 停止 | 許可 | 保持 |
| `paid-unentitled-reconciliation` / refund・dispute reconciliation | 停止 | 許可 | 保持 |
| 読取不能・不整合 | 停止 | 許可 | 安全側 |

支払い失敗にアプリ独自のPaid猶予期間は設けない。7日は再決済のための枠保持であり、Paid翻訳の利用猶予ではない。

## 9. Paid利用制限

| 項目 | Paid v1 |
| --- | --- |
| 入力文字上限 | 500,000文字 / Stripe subscription billing period |
| 1分あたり | 60コメント |
| 1セッション | 最大3時間 |
| 同時セッション | 1 |
| 1コメント | 最大500 Unicode code points |
| OpenAI出力 | 1コメントあたり128 tokensを計画予算とする。hard limitはrequest全体とitem最大1,000 Unicode code pointsで強制 |
| 月間コメント件数上限 | 公開上限なし。内部集計のみ |
| 日次時間上限 | Paid固有の公開上限なし |

### 9.1 リセット

- 50万文字はStripe subscription periodの更新時にリセットする
- カレンダー月ではない
- 権威時刻はサーバーのUTC timestamp
- UIでは利用者のタイムゾーンで次回リセット日時を表示
- 更新支払い失敗時は新しい50万文字を付与しない

### 9.2 上限到達

- Paid契約中はPaidの50万文字枠だけを使う
- 上限到達後、次回の正常な更新までOpenAI/Azureの新規翻訳を停止
- Freeの20,000文字枠へ自動移行・併用しない
- 追加課金、従量課金、追加枠購入は行わない
- 契約期間終了後にFreeへ戻り、その時点からFreeの現行ルールを適用

UIは現在のFree表示に合わせ、使用文字数、残り文字数、次回リセット日時を表示する。token数や内部原価は利用者へ表示しない。

## 10. 文字数消費

利用者の50万文字枠と、運営のProvider原価台帳を分離する。

### 10.1 利用者文字枠

- Provider呼出前に対象原文の文字数を原子的に仮確保する
- OpenAI成功: 消費確定
- OpenAI失敗後Azure成功: 1回分だけ消費確定
- 両Provider失敗: 仮確保を戻す
- リトライ、fallbackで二重消費しない
- cache hit、空文字、重複、翻訳不要判定: 消費しない
- 残量よりコメント全体が長い場合: 部分翻訳せず全体を拒否
- Unicode code pointsで、Providerへ実際に送る原文部分だけを数える
- system prompt、辞書、制御指示は利用者文字数に含めない

### 10.2 冪等性

YouTubeから取得したコメントのProvider message IDを、取得中のWorkerメモリ内でowner/sessionに束縛し、次の短命な内部識別子を作る。

`attempt_id = HMAC-SHA-256(server_secret, owner_user_id || session_reference_id || provider_message_id || target_language)`

- `attempt_id`はquota/costのreserve・commit・release、microbatch応答照合、同一セッション内の再送抑止にだけ使う
- DBへ保存する場合は最大15件の`attempt_id`と各状態を1つのbounded batch receiptへまとめ、期限だけを保存し、provider message ID、コメント本文、コメントハッシュは保存しない
- TTLはセッション終了+24時間以内とし、feed snapshot削除と同時または先に削除する
- retry回数はkey構成に含めない。1つの論理翻訳に対するretry/fallbackは同じ`attempt_id`配下の別provider attemptとして記録する
- provider message IDが欠損・不正なら永続的な重複排除を推測で作らず、そのコメントを安全にskipする
- HMAC keyには非機密のkey versionを付ける。rotation時は新規attemptを新keyで生成し、旧keyは最大TTL終了まで再計算専用で保持してから破棄する
- Worker retryは最初のreserveで返した`attempt_id`/key versionを引き継ぎ、再生成の揺れを防ぐ
- sessionをまたいだ同一コメント判定は行わない。cleanup後の古いsession再送は終了済みsessionとして拒否し、新しいsessionでは新しいattemptとして扱う
- コメント本文、本文の単純hash、raw YouTube message ID、author channel IDをkeyまたは永続列に使わない

これにより同一コメントの再送、Worker再実行、タイムアウト後の重複処理で利用者文字枠を二重消費しない。一方、本文一致による横断的dedupeは行わない。

## 11. Provider

### 11.1 通常経路

- Free: Azure Translator
- Paid: OpenAI GPT-4o-mini
- 利用者によるProvider/モデル選択は不可
- OpenAI Responses API等を使う場合は永続会話機能を使用せず、`store=false`を明示する
- OpenAI用Project/API keyをComment Translator Paid本番専用に分離する
- 本番とテストのAPI keyを分ける
- API keyはCloudflare Secretだけに保存し、ブラウザ、Supabase、ログへ出さない
- OpenAI Admin Keyをruntimeへ置かない

### 11.2 OpenAI microbatch

PaidのOpenAI呼出は1コメント1requestではなく、同一owner・同一session・同一言語ペアのコメントだけをまとめるmicrobatchとする。異なるowner/sessionを同じrequestへ混在させない。

| 項目 | v1固定値 |
| --- | --- |
| feed poll周期 | 現行どおり15秒 |
| batch最大件数 | 15コメント |
| batch最大入力 | 7,500 Unicode code points |
| 追加待機 | poll結果取得後、最大250ms。次の15秒pollまで意図的に待たない |
| 同一sessionのin-flight | 1 batch。Supabase leaseで強制 |
| Paid全体の同時OpenAI request | 最大8。Supabase leaseで強制 |
| 1コメント出力 | 計画予算128 tokens、hard limit 1,000 Unicode code points |
| request出力予約 | `batch件数 × 128 + JSON envelope 384 tokens` |

OpenAI APIはrequest全体のusageしか返さず、microbatch内の各item token数を権威的に測定できないため、128 tokensをitem単位の厳密なhard capとは扱わない。`max_output_tokens = batch件数 × 128 + 384`をrequest hard limitとし、各`translated_text`はapplicationで最大1,000 Unicode code pointsを強制する。超過itemは失敗として、より簡潔な翻訳を求める未解決subset retryを1回だけ行い、再超過時はそのitemだけ非消費の安全エラーにする。

request/responseはstrict structured outputで、`{ items: [{ attempt_id, status, translated_text }] }`の対応を要求する。成功済みitemは再送せず、欠損、重複ID、未知ID、型不正、1,000 code points超過のitemだけを失敗扱いにして未解決subsetを最大1回再試行する。response全体がparse不能な場合も未解決batchだけを最大1回再試行し、再失敗時は安全エラーとする。parse/schema/policy拒否をAzure fallbackで迂回しない。

### 11.2.1 Durable concurrency / backpressure

Cloudflare Workerのプロセス内変数を権威にせず、Provider呼出前のSupabase RPCを次の2モードへ分離する。

`openai_attempt`:

- owner/sessionのbatch lease: unique、TTL 120秒。retry/fallbackを含む論理batch全体で1件
- Paid全体OpenAI request slot: 最大8、TTL 120秒。OpenAI HTTP timeoutは20秒
- UTC minute RPM bucket: 実Project RPMの70%まで
- rolling TPM bucket: 直近60秒の予約合計を実Project TPMの70%まで
- Paid文字quotaと個人/全体OpenAI cost reservation

`azure_direct_fallback`:

- owner/sessionの同じbatch lease
- Paid文字quota reservation
- Azure Paid fallback 20万文字論理枠と、Free実使用量を含む物理共有枠reservation
- OpenAI slot、RPM、TPM、OpenAI costは取得しない

degraded中に最初からAzureへ送る経路は`azure_direct_fallback`だけを取得し、OpenAI capacityを一切消費しない。OpenAI失敗後のfallbackでは、同じbatch leaseを維持したままAzure論理/物理枠を追加予約する。

複数Workerが同時に取得しても、DB一意制約とtransactional RPCによってsession 1 in-flight、全体8 slot、RPM/TPM 70%を超えない。DBまたはRPCを読めない場合はProviderを呼ばずfail-closedにする。

正常終了ではusage/cost/文字数をcommitし、該当Provider reservationとsession leaseをreleaseする。OpenAI retryは新しいOpenAI slot/RPM/TPM/cost reservationを必要とするが、同じsession batch leaseをCASで延長する。

OpenAIが明示的に完了した応答ではslotをreleaseできる。timeout、接続切断、Worker異常終了等で外部処理継続が不明な場合はslotを即時再利用せず、`uncertain-inflight`として開始時刻から120秒のTTL終了または明示的な完了確認まで保持する。retryや他Workerはこのslotを使用済みとして数えるため、推定上の外部OpenAI同時実行数も8を超えない。Provider未到達と証明できるreservationだけをreleaseし、課金不明なRPM/TPM/costは保守的に期間内保持する。stale lease tokenによるfinalizeは拒否する。

Azure fallbackは、OpenAI完了が明確ならOpenAI slotをreleaseしてから実行する。継続不明ならOpenAI slotを`uncertain-inflight`で保持したままAzure予約を別取得して実行し、Azure経路自体はOpenAI capacityを追加消費しない。Worker異常終了時は各TTL後にCASでreclaimする。

予測使用量が確認済みlimitの70%を超えるrequestはProviderへ送らず、最大で次のfeed周期まで待つ。それでも確保できなければ対象batchを`provider-capacity-paused`として非消費で返す。これはsession終了ではなく一時待機であり、session時間は進む。20人×60コメント/分の公称上限を支えられるRPM/TPMと30%余白が本番Projectで確認できなければ公開不可とし、上限値を黙って下げない。

### 11.3 Azure fallback対象

OpenAIの一時障害に限って自動fallbackする。

対象:

- network/connection error
- timeout、HTTP 408、504
- OpenAI 500、503
- 通常の429 rate limitを短いbounded retry後も解消できない場合

対象外:

- entitlement、支払い、owner、session、usageの不明・無効
- 50万文字到達、個人/全体原価上限到達
- OpenAI credit不足、spend/usage limit到達
- 401、403、404など認証・設定不備
- 400、413などinvalid request
- policy block、安全拒否
- 未対応言語
- 管理者full kill switch

strict JSON parse failureはOpenAIへ最大1回だけ再試行し、それでも失敗したら安全エラーにする。Azureへfallbackして安全拒否を迂回しない。

### 11.4 リトライとcircuit breaker

- OpenAIリトライは最大1回
- fallback対象失敗が60秒内に3回: degradedへ遷移
- degraded中は5分間Azureへ直接送る
- 5分後にOpenAI half-open probeを1回
- 成功: OpenAIへ復帰
- 失敗: degradedを延長
- 状態はSupabaseへ永続化し、Workerプロセス内Mapを権威にしない
- OpenAI復旧時は自動復帰し、セッション再起動を要求しない

UIには「AI自然翻訳が一時利用できないため、標準翻訳へ切り替えています」と表示する。辞書機能が将来追加された場合、fallback中は辞書効果が弱まる可能性も表示対象とする。

### 11.5 Azure fallback予算

- 既存Azure Translator resourceを利用する
- 公開前にF0であることを確認する
- S1等へ自動変更しない
- Paid fallbackはUTCカレンダー月20万文字まで
- Free通常利用とPaid fallbackを別集計する
- Paid fallback上限到達後はPaid翻訳を安全停止する
- Azure quota error後にOpenAIへ無限に戻さない

20万文字はPaid利用者全体のfallback専用論理上限であり、個人の50万文字枠とは別である。Paid v1は既存Freeと同じAzure resourceを使用する設計なので、物理的なF0月間枠は共有される。現在のresource tier、月間実使用量、他用途との共有範囲はコードから確認できず、外部readiness事項である。公開前に次を強制する。

- F0公称月間枠200万文字に対し、30%（600,000文字）を未知使用量・計測差の安全余白として確保する
- `free実使用量 + paid fallback予約済み + 600,000文字 < 2,000,000文字`をProvider呼出前に強制し、等号到達を許可しない
- actual usageを取得できない、または他用途との共有範囲が不明な場合は`azure_fallback_enabled=false`で公開し、OpenAI障害時はPaidを安全停止する
- Azure resource/tierを自動変更せず、Paid fallback停止によってFree通常翻訳の継続を優先する

Freeの理論最大は`当月に枠を使い切るFree利用者数 F × 20,000文字`、Paid fallbackを足した最大は`F × 20,000 + 200,000文字`である。600,000文字の余白を含む非厳密な容量境界は`F <= 60`だが、runtimeは厳密な`< 2,000,000`を使うため、Paid fallback 200,000文字も全Free利用者の満額も同時に予約する場合、F=60の等号到達を拒否し、実際に全員満額を許可できる整数上限はF=59である。実使用量をProvider側meterと内部台帳で照合し、理論人数だけで許可しない。Azure quota error時は対象Paid batchを非消費で失敗させ、circuitをOpenAIとの相互無限切替に使わず、次のhalf-open条件または運営再開までPaid fallbackを停止する。

## 12. 原価制御

### 12.1 価格根拠と計算前提

2026-08-12確認時点のOpenAI公式GPT-4o-mini価格、入力US$0.15/100万tokens、cached input US$0.075/100万tokens、出力US$0.60/100万tokensを基準にする。cached inputは成立を前提にせず、通常input価格で計算する。価格変更時は公開前・毎月の照合時に再計算する。

計画用の保守前提は次とする。実装後は実prompt/token計測で置換し、上限内に収まることを再承認する。

- 固定system/developer prompt: 220 input tokens/request
- 言語指定・Structured Output schema: 180 input tokens/request
- batch固定入力合計: 400 input tokens/request
- 標準コメント: 平均60文字、入力90 tokens、出力40 tokens
- 高頻度短文: 平均20文字、入力30 tokens、出力30 tokens
- Unicode上限予約: 1文字あたり最大4 input tokens
- batch: 最大15コメント
- retry: 未解決subsetだけ最大1回。通常計算にretryを含めず、感度として100% retryを併記

### 12.2 単位原価とケース別試算

| ケース | 文字・コメント・batch想定 | OpenAI原価概算 | 100% retry時 |
| --- | --- | ---: | ---: |
| 1,000標準コメント | 60,000文字、67 batches | US$0.0415 | US$0.0830 |
| 軽量利用 | 100,000文字、2,000 comments、134 batches | US$0.0830 | US$0.1660 |
| 標準50万文字 | 8,334 comments、556 batches | US$0.346 | US$0.692 |
| 高頻度50万文字 | 平均20文字、25,000 comments、1,667 batches | US$0.663 | US$1.326 |
| 5文字短文50万文字 | 100,000 comments、6,667 batches、入出力各8 tokens/comment | 約US$1.00 | 約US$2.00 |
| 500文字上限だけで50万文字 | 1,000 comments、67 batches、最大入力/出力予約 | 約US$0.381 | 約US$0.762 |
| 3時間・標準60文字 | 139分で50万文字に達し停止 | US$0.346 | US$0.692 |
| 3時間・1文字短文 | 10,800 comments、720 batches | 平均出力2 tokensならUS$0.063、128-token予算を全itemが使うならUS$0.879 | US$0.126〜US$1.758 |
| 病的上限 | 1文字×500,000 comments、全itemが128-token予算を使い切る | 約US$40.70 | 上限前に停止 |

標準50万文字の内訳は、入力約972,460 tokens（US$0.146）と出力約333,360 tokens（US$0.200）。最大15件batchの不明課金reservationは、入力30,400 tokensと出力予約2,304 tokensから1requestあたり約US$0.006とする。価格計算は税・Stripe手数料を含まず、OpenAI API原価だけを表す。

3時間セッションを60コメント/分で使い切ると最大10,800コメントである。平均60文字なら50万文字へ約139分で到達する。短文では3時間上限が先に到達する。したがって文字枠、時間枠、コメントrateは相互に代替せず、最初に到達した制限を適用する。

20人全員が各billing periodで標準50万文字を利用した場合は約US$6.92、高頻度ケースは約US$13.26、5文字短文ケースは約US$20.00。全体US$25上限は標準ケースには余裕があるが、短文・長出力・retry集中では20人が50万文字を使い切る前に到達し得る。

### 12.3 OpenAI上限と利用者挙動

- 1ユーザー: US$3 / Stripe billing period
- Paid全体: US$25 / UTC calendar month
- token数・原価は利用者へ表示しない
- 上限は収益計算ではなく異常利用を止める安全上限

API呼出前にbatch最大入力と`batch件数 × 128 + envelope`による保守的な原価を仮確保する。

- 応答に`usage`あり: 実原価へ置換
- OpenAI未到達が明確: 仮確保解除
- timeout/5xx等で課金不明: 仮確保を原価として保持
- JSON parse failure: 実tokenを原価計上
- retryとfallback試行: 別の内部原価・試行として記録

リアルタイム停止にはSupabaseの保守的台帳を使い、OpenAI Costs API/Dashboardを請求額の照合正本とする。専用OpenAI Projectで他ツールの原価と混ぜない。

個人US$3へ到達した利用者は、残り文字数があっても当該billing periodのPaid翻訳を停止する。全体US$25へ到達した場合は、全Paid利用者の新規OpenAI翻訳を停止する。いずれもAzureへ迂回しない。文字quotaは未送信分を消費せず、UIはtoken/金額ではなく「安全上限により今期の翻訳を一時停止しました」または「サービス全体の安全上限により一時停止しています」と表示する。

個人上限は次の正常なStripe billing period開始時、全体上限は次のUTC月開始時に、7.4のdurable reconcilerが前期間reservationを照合・closeした後だけ自動復旧する。reconcileは前期間の未確定reservation、OpenAI Costs API/Dashboard、内部commit/release、Azure fallback文字台帳を比較し、次期間へ未確定額を黙って繰り越したり削除したりしない。reconcile不能時は`next_reconcile_at`とbackoffを更新して停止を維持し、後続成功時だけ次期間を開始許可する。期中の手動増額・再開は、OpenAI Dashboard/Costsとの差額、原因、上限変更値を提示した別承認が必要である。

50万文字は利用可能量の上限であって、個人/全体安全上限より常に優先される保証ではない。この制約をCheckout前のPaid利用条件へ明示する。この解釈は人間再承認対象である。

### 12.4 Kill switch

最低限、独立して次を制御する。

- `checkout_enabled`
- `us_checkout_enabled`
- `paid_translation_enabled`
- `openai_enabled`
- `azure_fallback_enabled`

full kill switchではfallbackも含むPaid翻訳を停止する。設定値が欠損・不正な場合は安全側へ停止する。

Checkout tax設定は`COMMENT_TRANSLATOR_PAID_AUTOMATIC_TAX_ENABLED`と`COMMENT_TRANSLATOR_PAID_TAX_REGISTRATION_READY`を既存strict literal boolean parserで読む。空白付き、大文字、alias、欠損は不正とする。有効な組合せは両方falseのmonitoring-only mode（Stripe `automatic_tax[enabled]=false`）と、両方trueのregistered-ready mode（同`true`）だけである。片方だけtrue、欠損、不正値ではJP/US双方の新規CheckoutをCustomer/hold/Session作成前に`tax-settings-stopped`でfail closedする。unbound recoveryも同じtax resolverを使い、新しいSessionを作らない。

### 12.5 公式根拠

- OpenAI GPT-4o-mini model/pricing: <https://developers.openai.com/api/docs/models/gpt-4o-mini>
- Azure Translator pricing（F0月200万文字）: <https://azure.microsoft.com/ja-jp/pricing/details/translator/>
- Azure Translator service limits: <https://learn.microsoft.com/azure/ai-services/translator/service-limits>

## 13. Checkout・同意・Portal

### 13.1 Checkout前提

- ログイン済み利用者だけ購入可能
- JP/US販売地域ゲート通過
- 20枠の原子的な仮確保成功
- 利用規約・プライバシーポリシー・Paid利用条件への必須同意
- ownerに非終端billing lifecycleがない

非終端lifecycleがある場合は状態別の既存導線だけを返す。未完了Checkoutは既存Session、`past_due`/`unpaid`はCustomer Portal、期間終了待ち/activeは契約管理、dispute/cancel確認待ち/reconciliationは処理中表示へ誘導し、新規Checkoutを作成しない。

Checkout直前に次を表示する。

- US$6/月（支払総額・USD請求）、自動更新
- 適用される税がある場合はStripe Checkoutで表示されること
- 50万入力文字 / 契約更新周期
- 解約は次回更新日から有効
- コメント本文を翻訳処理のためOpenAIまたはAzureへ送信すること
- 利用規約、プライバシーポリシー、Paid利用条件へのリンク

Supabaseにはowner、同意日時、文書種別、文書versionを保存する。ブラウザのチェック状態だけを根拠にCheckoutを作成しない。重要な規約変更時は次回Paid翻訳開始前に再同意を要求するが、同意未完了でも解約・請求履歴確認を妨げない。

Stripe Tax Monitoringは監視補助であり法的判断authorityではない。内部分類は`normal`、`approaching`、`needs-attention`、`legal-review-required`、`monitoring-unavailable-or-stale`に固定する。US新規Checkoutを許可できるのは、税務専門家が開始時点のUS sales-tax registration duty、physical/economic nexus、商品課税区分を確認して開始可と判断し、分類が`normal`のときだけである。Monitoringは新規transactionの反映が最大7日遅れ得るため、threshold exceededを待たず、`approaching`以降またはunavailable/staleでUS switchをfalseにする。本sliceではMonitoring状態をruntimeへ自動取込しない。

登録義務が確認された場合は、US新規Checkout停止、専門家による対象州・商品分類確定、州当局登録、Stripe active registration追加、test/Preview Tax表示検証、tax設定2値の個別承認、US switch再開の別承認、の順とする。Stripe registration追加は州当局登録の代替ではなく、架空・便宜的registrationは禁止する。

### 13.2 Customer Portal

Stripe Customer Portalで次を提供する。

- 支払い方法更新
- 請求履歴確認
- 期間終了時解約

アプリはカード番号や完全な請求先住所を保存しない。

## 14. Webhook・整合性

### 14.1 必須イベント群

実装時に使用するStripe API versionのイベント仕様を再確認し、少なくとも次のライフサイクルを処理する。

- Checkout完了
- Subscription作成・更新・削除
- Invoice支払い成功・失敗
- dispute作成・終了
- refund/credit noteが状態へ影響する場合

### 14.2 処理原則

処理順は次で固定する。

1. raw bodyと署名secretでStripe署名を検証する。失敗時は何も保存・投影しない。
2. event IDをreceipt tableの一意制約へ`processing`としてclaimする。receiptはStripe Event `created`をUTC時刻へ変換した`stripe_event_created_at`、`processing_started_at`、`lease_until`、`lease_token`、`attempt_count`を持つ。
3. allowlist化したevent typeと、object ID/型の最低限の整合性を検証する。
4. 内部owner、Stripe Customer、Subscription、Product、Priceのbindingを検証する。既存binding競合、Customer不一致、Product/Price不一致、複数owner候補だけを永続的拒否とする。最初のSubscription binding未成立は本節のbinding規則に従って作成またはretryableにする。
5. event種別ごとの再取得規則に従い、Stripe APIから現在objectを取得する。取得失敗は`retryable`とし、Paidを付与・更新しない。
6. Supabase transaction内で、取得した現在状態、既存projection、対象billing period、支払い事実を照合してentitlement/capacityを投影する。
7. 投影成功後、同じ`lease_token`を持つ処理だけがreceiptを`complete`へ遷移できる。永続的なtype/binding不正だけを`rejected`、外部取得・DB・Worker失敗を`retryable`とする。

processing leaseは120秒とする。`complete`/`rejected`は再claim不可。`processing`でlease有効中の同一eventは二重処理せず、成功応答もせず再送対象の応答を返す。`retryable`または`lease_until < now()`のstale processingは、原子的compare-and-swapで新しい`lease_token`へclaimし、`attempt_count`を増やす。古いWorkerはlease失効後にprojection/completeできない。5回以上のattemptはsanitized alert対象にするが、transient failureを永続拒否へ変えない。

Webhook HTTP成功応答は`complete`と永続的`rejected`だけに返す。Stripe再取得失敗、DB transaction失敗、処理中lease競合、`retryable`は非2xxでStripe再送対象にする。署名不正はreceiptを作らず拒否する。

entitlementまたはcapacityへ影響するallowlist eventは、event payload snapshotだけで投影せず常に現在objectを再取得する。

- `checkout.session.completed` / `checkout.session.expired`: Checkout Sessionを再取得し、SubscriptionがあればSubscriptionと最新Invoiceも取得
- `customer.subscription.*`: Subscriptionと最新Invoiceを取得
- `invoice.*`: InvoiceとSubscriptionを取得
- refund/credit note: Refund/ChargeまたはCredit Note、対象Invoice、現在Subscriptionを取得
- dispute: Dispute、Charge/PaymentIntent、対象Invoice、現在Subscriptionを取得

再取得不要allowlistは、既に`complete`/`rejected`のduplicate receiptと、entitlement/capacityへ影響せず記録もしない明示的なignored event typeだけとする。未知eventは状態を変えず永続的`rejected`とする。

**最初のSubscription binding:**

最初のSubscription bindingはCheckout redirectではなく、署名済みWebhook処理中のSupabase transactionで確立する。

CustomerとCheckout Sessionのbindingは7.3のCheckout作成処理で先に確立し、Subscription bindingはWebhook projectionで追加する。Customer IDのowner、各lifecycleのCustomer参照、Checkout Session IDとSubscription IDのowner/lifecycleは作成後に変更できない。同じCustomerを同じownerの後続lifecycleで再利用する場合は新しいlifecycle参照を追加し、過去参照を更新しない。既存bindingへの同値再実行だけをidempotent成功とし、別owner/lifecycleへの再割当て、update、delete-and-reinsertを永続的競合として拒否する。

- `checkout.session.completed`では、ownerへbind済みの非終端billing lifecycle、未解放hold、Checkout Session、Customerをlockし、再取得したSessionのSubscription ID、Product、Price、最新Invoiceを検証する。Session binding前に到着した場合は、同じidempotency keyによるSession回収・bindingを待つ`retryable`とし、永続拒否しない
- 既存Subscription bindingがなく、hold/Session/Customerからownerを一意に導出できる場合、同じtransaction内でSubscription bindingを新規作成し、holdをactive capacityへ変換する
- `customer.subscription.created`または`invoice.paid`がCheckout eventより先行しても、Customerと永続化済みSession/hold/lifecycleからownerを一意に導出できれば同じbinding RPCで作成できる
- 一意に導出できるが必要object/DB行がまだ到着していない場合は`retryable`とし、永続的`rejected`にしない
- 既存Subscription bindingとの競合、同じCustomer/Subscriptionに複数owner候補、SessionとCustomerの不一致、Product/Price不一致だけを永続的`rejected`とする
- binding作成とentitlement/capacity projectionは同じtransactionで行い、bindingだけ、Paidだけ、capacityだけが残る部分成功を許さない

fixtureは`customer.subscription.created`先行、`invoice.paid`先行、`checkout.session.completed`先行の3順序、DB binding前のWebhook到着と後続retry、先行event時のretryable、既存binding競合、複数owner候補、Customer不一致、binding後のowner/lifecycle変更拒否を含む。

projectionの新旧順序判定に`event.created`だけを使わない。例外として、同じSession IDの`checkout.session.completed` Event `created`は7.3のexpiry境界判定にだけ使用する。Stripe Subscriptionに存在しない汎用的な単調増加`version`を仮定しない。現在のStripe objectを再取得してから収束させ、既存projectionを後退させない。`invoice.paid`がSubscriptionイベントより先に届いても、Customer/Subscription/Product/Priceのbindingと現在Subscriptionの取得が成功した場合だけ対象periodを有効化する。再取得不能ならPaid付与なしのretryable failureとする。

raw Stripe payloadは保存しない。event ID、type、object種別、object IDの末尾など照合に不要な識別子を除いた内部参照、処理状態、処理時刻、allowlist error classだけを90日保持する。Checkout success redirectから直接entitlementを有効化しない。

必須fixtureは、duplicate、新しい更新後に古いeventが届くout-of-order、`invoice.paid`先行、Subscription更新先行、`canceled`投影後の古い`active` event、再取得失敗、Customer/Subscription/Product/Price不一致、owner二重binding、同一event同時処理、stale processing recoveryを含む。crash pointはreceipt作成直後、projection transaction途中、projection成功後かつ`complete`直前の3点を注入し、再送後に一度だけ収束することを確認する。

## 15. 解約・返金・dispute・アカウント削除

### 15.1 解約

- 期間終了時解約
- 支払済み期間終了まではPaidを利用可能
- 期間終了後にFreeへ戻す
- 日割り返金・日割りクレジットは自動提供しない

### 15.2 返金

自動返金は行わない。二重課金、法令上必要な場合、重大障害は個別判断する。初期割引の有無にかかわらず返金ルールは同じとする。返金操作自体は運営の別承認を必要とし、Webhook投影は次の決定表へ収束させる。

| 返金状態 | Paid entitlement | Stripe Subscription | capacity |
| --- | --- | --- | --- |
| 現在period Invoiceの一部返金 | 期間状態に従い維持 | 維持 | 維持 |
| 現在period Invoiceの全額返金 | 即時停止 | `proration_behavior=none`で即時cancelを要求 | Stripe `canceled`確認まで保持し、その後解放 |
| 過去period Invoiceの一部/全額返金 | 現在状態を自動変更しない | 現在Subscriptionを再取得して維持 | 維持 |
| refund対象とowner/Invoice/Subscriptionのbinding不明 | 自動変更しない | 自動変更しない | 保持し手動reconciliation |

一部返金を追加利用権やquota補填へ変換しない。全額返金後のcancel要求または再取得に失敗した場合はPaid停止・枠保持でfail-closedとし、先に枠だけを解放しない。

### 15.3 dispute

- dispute通知時点で、対象Charge/PaymentIntentから一意に辿れたCustomer/Subscription/ownerだけPaid翻訳と当該ownerの新規Checkoutを一時停止する
- bindingが一意に確定できない場合はグローバル停止へ拡大せず、対象eventを要手動調査として隔離し、Checkout全体停止は運営が別途判断する
- 調査中の対象ownerはFreeのみ利用可能
- 運営勝訴: 現在Subscriptionを再取得し、現在periodが有効で、payment failure、解約/返金、別dispute、quota/cost/infra停止、reconciliation等の他停止理由がない場合だけ残存期間のPaidを復元
- 利用者勝訴: Paid entitlementを即停止し、対象Subscriptionをidempotentに即時cancelする。Stripe `canceled`確認後だけcapacityを解放
- 利用者勝訴後のcancelまたは現在object再取得に失敗した場合: Paid停止、枠保持、manual reconciliation。先に枠だけを解放しない
- 同一請求へ重複返金しない
- 初期版の証拠提出はStripe Dashboardから手動
- rawコメント・翻訳結果を証拠保存しない
- 契約、同意version、利用集計、ログイン・Provider集計の必要最小限だけを使う
- 1回のdisputeだけで永久停止せず、悪質反復は個別判断

### 15.4 Paid契約中のアカウント削除

- 通常削除要求時はSubscriptionを期間終了時解約へ変更
- 支払済み期間中は利用可能
- 期間終了後にアプリのアカウントと関連データを削除
- Stripe側の法定・会計情報はStripeの保持方針に従う
- 即時削除を法的理由等で求められた場合は個別対応
- 即時削除でも原則日割り返金なしと事前表示

## 16. データ最小化・保持

### 16.1 保存禁止

- rawコメント
- raw Provider response/payload
- コメントハッシュ
- Stripe raw webhook payload
- 完全なカード情報・完全な請求先住所
- secret、token、Authorization header
- provider target metadata、`liveChatId`、author channel material

ここでいうrawコメントはYouTube APIのraw payload、未選別メタデータ、provider識別子付き原文を指す。現行コードの`browser-safe feed snapshot`は表示用projectionとして`originalText`、`translatedText`、safe author display name等を含み、Supabaseへ永続化されるため、「コメント本文を一切保存しない」設計ではない。Paid v1でもこの既存Free機能を維持し、表示に必要なsanitized本文だけをセッション終了+24時間まで保存する。Provider request detail、ログ、集計、冪等台帳には本文を複製しない。

ログには文字数、Provider、モデル、token数、処理時間、成功/失敗分類だけを保存する。Provider error本文は保存せず、allowlist化したエラー分類へ変換する。

### 16.2 保持期間

| データ | 保持期間 |
| --- | --- |
| browser-safe feed snapshot | セッション終了 + 24時間 |
| Provider request detailの1時間bucket（本文なし） | 30日 |
| session summary | 90日 |
| 月次aggregate | 13か月 |
| Stripe event ID/type/status | 90日 |
| active Customer/Subscription/entitlement | active中 |
| 終了済みSubscription reference | 13か月 |
| 同意version記録 | 契約・法務上必要な期間。最低13か月を実装前に法務確認 |

詳細行はCronで自動削除し、aggregateだけを長期保持する。7.4/17章と同じく既存Supabase Cronを標準とし、利用不可時だけ既存Cloudflare Cronから同じbounded cleanup RPCを呼ぶ。環境ごとのschedulerは1つに固定し、新しい有料サービスを追加しない。

Provider detailはrequestごとの無制限な行追加を避け、owner/provider/UTC hourごとのcounter rowへupsertする。session別情報は90日session summaryへ集約する。request数、session数、comment数、input/output tokens、文字数、成功/失敗分類、latency histogram、原価だけを保持し、本文・attempt IDは含めない。

### 16.3 Provider側

- OpenAI APIの入力・出力は標準設定で学習に使われない
- 標準のabuse monitoringで最大30日保持される可能性を表示する
- `store=false`を明示し、Conversation/Thread/File等の永続型機能を使わない
- ZDRは利用可能になった場合の改善候補
- Azure Translatorのテキスト翻訳はMicrosoftのNo-Trace方針を前提にする

利用者向け文言は次へ統一する。「当サービスDBでは、画面表示とセッション復元に必要なsanitized feed snapshot（表示用コメント本文、翻訳結果、safe author display name）をセッション終了後最大24時間保存します。Provider request detail、ログ、集計、冪等台帳にはコメント本文を複製しません。Provider側では各社の処理・保持方針が適用されます。」

「コメント本文を一切保存しない」「当サービスDBに保存しない」「自サービス非保存」とは表示しない。Legal copy、Privacy、Paid利用条件、画面説明、contractで同じ境界を使う。

## 17. インフラと追加費用

初期構成は既存のCloudflare WorkerとSupabaseを使う。billing/control-plane reconcileとretention cleanupは、既存Supabase Cronを標準schedulerとして同じ環境のbounded RPCを起動する。既存Supabase Cronが利用できない環境だけ既存Cloudflare Cronを代替schedulerとし、同じDB lease contractを呼ぶ。環境ごとに権威schedulerを1つへ固定し、設定値・最終成功時刻・claim件数・retry件数をsanitizedに監視する。

- KV、D1、R2、Durable Objects、Queuesを新規追加しない
- 新しい有料scheduler、外部workflow、message queueを追加しない
- 外部GeoIP、外部監視、専用サーバー、独自SMTPを追加しない
- Cloudflare/Supabaseの自動プランアップグレードを行わない
- Free枠超過時は課金継続ではなく安全停止を選ぶ

運用目安:

- 60%: 警告
- 75〜80%: 新規Checkout停止
- 90%: 新規Paidセッション開始停止

Workers Paid、Supabase Pro等が必要になった場合は、費用と効果を提示して別承認を得る。

Cronが一時停止しても利用者アクセスやWebhookを回収主体にしない。復旧後に`next_reconcile_at`超過行をbounded batchで再claimし、Stripe再取得不能中はPaid停止・枠保持・原価period停止を維持する。Previewとproductionでは、選択した既存Cronの可用性、最小実行間隔、実行上限が7.4のbackoff/lease/batch条件を満たすことを各Gateで確認する。

### 17.1 Supabase無料枠の容量試算

2026-08-12確認時点の公式Free枠は、Database size 500MB/project、Egress 5GB、MAU 50,000、Storage 1GB、Edge Function invocations 500,000、Realtime messages 2,000,000である。DB read/write回数の単独課金枠は公式表にないため、DB compute飽和はPreview負荷試験で確認する。

Paid固有の日次時間上限は追加しない。1セッション3時間終了後に再開できるため、最大8 sessions/日、24時間継続を計画ケースへ含める。Provider batchはreserve RPC 1回とfinalize RPC 1回、session heartbeatは最大1回/分へcoalesceし、コメントも状態変化もない15秒pollでProvider/attempt/feed rowを書かない。

最大20 sessions、15秒pollではピーク80 batches/分、160 Provider RPC/分である。Provider concurrency/RPM/TPM leaseを含め、1 batchあたり内部read/writeを各12回の計画上限とし、Previewで実測する。

| 20人の30日計画ケース | poll request | Provider batches | Provider RPC | naive minute detail（1 / 2 Providers） | 採用hour detail（1 / 2 Providers） |
| --- | ---: | ---: | ---: | ---: | ---: |
| 毎日3時間、各pollに対象comment | 432,000 | 最大432,000 | 最大864,000 | 108,000 / 216,000 | 1,800 / 3,600 |
| 24時間再開、各pollに対象comment | 3,456,000 | 構造上最大3,456,000 | 構造上最大6,912,000 | 864,000 / 1,728,000 | 14,400 / 28,800 |
| 24時間再開、1 comment/分 | 3,456,000 | 864,000 | 1,728,000 | 864,000 / 1,728,000 | 14,400 / 28,800 |
| 24時間再開、対象commentなし | 3,456,000 | 0 | 0 | 0 / 0 | 0 / 0 |

内部read/write計画値は、3時間/日最大batchで各約518万、24時間最大batchで各約4,147万、1 comment/分で各約1,037万である。空pollではProvider RPC/attempt/detailを作らないが、1分coalesce heartbeat最大864,000 upserts/月と、最大4,800 session開始/poll-budget reservationsが発生する。Supabaseに公開されたread/write課金枠はないもののcompute負荷は実測必須であり、この構造上最大値を通常保証しない。

24時間の構造上最大値は文字quota・個人/全体原価上限・infra安全停止を無視した負荷注入値で、提供保証値ではない。従来の108,000 minute rowsは「20人×3時間/日×30日×単一Provider」の前提付きケースであり、OpenAIとAzureが同じ分に記録されれば216,000 rowsになる。24時間では最大1,728,000 rowsとなりFree DBへ収まらないため、Provider detailはowner/provider/UTC hour bucketへ変更する。session別情報はsession summaryへ分離する。

採用設計の30日detailは2 Providersでも最大28,800 rows、data+index平均1.4KB/rowで約40MB。attempt batch receiptは最大15 IDsをcompact binaryで1 row、data+index計画1.2KB/rowとし、最大rateの27時間分約129,600 rowsで約156MB。90日session summaryは8 sessions/日で最大14,400 rows、約14.4MB。Stripe receipts 5MB、13か月aggregate/終了Subscription 1MBを計画枠とする。cleanupはhour detail最大960 rows/日、期限切れattempt最大115,200 rows/日をbounded batchで削除する。

feed snapshotはowner/sessionごとに最新1行、標準8KB・hard limit 64KBとして計測する。upsert応答はID/countだけにし、feed JSONを毎pollでreadbackしない。active pollのブラウザ応答には同じWorker処理結果を使い、Supabase snapshot readは再接続・復元時だけに限定する。24時間再開は月4,800 sessionsであり、各10回再接続なら8KBで約384MB、64KBでは約3.07GBになる。hard limit側は5GBの60%を超え得るため、実snapshot分布と再接続回数でEgress 3GB未満を証明できなければ公開しない。

Paid専用の保存容量計画は約216MBだが、現行Freeデータ、Postgres overhead、実index、feed JSON、write amplificationは未計測である。実schemaの`pg_total_relation_size`とPreview負荷試験で置換し、Paid追加後のproject DB合計300MB未満、Egress/MAU/Edge/Realtime各60%未満を公開条件とする。Supabase各枠は75〜80%で新規Checkout停止、90%で新規Paidセッションとactive auto-pollを停止する。500MB到達時はread-only化し得るため、推計だけで公開可にしない。Cloudflare request budgetは17.2の別閾値を使う。

### 17.2 Cloudflare 24時間poll予算

Workers Freeの公式上限は100,000 requests/日（UTC reset）である。20人×24時間×4 polls/分は115,200 requests/日で、Comment TranslatorだけでFree上限を超える。現在のCloudflare実プランと他routeの基礎request量はコードから確認できない。

Free運用の場合、直近7日P95の日次基礎requestと20,000 requestsの安全余白を100,000から差し引いた`paid_poll_daily_budget`を設定する。Supabaseの日次台帳で、3時間session開始時に最大720 polls、UTC日境界まで3時間未満なら残り時間分を原子的に予約する。日境界をまたぐ継続は、新UTC bucketの予約成功後だけ再開する。途中終了した未使用予約は当日中に再配布せず、UTC resetまで保守的に保持するため、毎pollのDB counter writeは不要である。

予約済み+新規予約がbudgetの80%を超える場合はCheckout停止、90%で新規Paid session停止、95%でactive clientへauto-poll停止とUTC reset時刻を返す。clientは停止応答後に15秒pollを続けない。budget/config/reservationを読めない場合はPaid sessionを開始しない。これは通常clientの計画pollを制御するもので、外部攻撃や他route急増は20,000余白と全体incident killで扱う。プランの自動有料化は行わず、24時間×20人を同時保証しない。

公式根拠: <https://developers.cloudflare.com/workers/platform/pricing/>

公式根拠:

- Supabase database size: <https://supabase.com/docs/guides/platform/database-size>
- Supabase billing/quotas: <https://supabase.com/docs/guides/platform/billing-on-supabase>

## 18. 観測

raw provider payloadやProvider detailへの本文複製を行わず、次を集計する。16章で定義したbrowser-safe feed snapshotはこの集計とは別である。

- Checkout開始・完了・放棄・満員拒否
- active枠、仮確保、支払い失敗枠
- entitlement投影成功・失敗・遅延
- Webhook重複・順序逆転・処理失敗
- OpenAI/Azure成功率、fallback率、circuit状態
- P50/P95応答時間
- 入力文字、token、保守原価、Costs APIとの差
- quota/cost/kill switchによる停止分類
- Worker/Supabase/Azure使用量
- raw data保存禁止違反のcontract結果

## 19. アーリーアクセス終了判定

評価時計は最初の有効な実顧客Paid Subscriptionが成立した時点から開始し、最低35日間、少なくとも1回の正常な実更新周期を観測する。35日評価は20枠からの人数拡大判断だけに使い、コードレビュー、実装PR、別ツール開発を待たせない。

renewal、payment failure、cancel、period end、dispute、refund、順序逆転はStripe test mode/Test Clockで公開前に閉じる。35日間に自然発生するのを待たず、実顧客に障害系操作を依頼しない。実運用では正常更新、実費、実負荷、Webhook到達性を観測する。

- Paid entitlement誤付与・誤停止: 0
- 20枠超過: 0
- 二重課金・Webhook二重適用: 0
- 50万文字の誤集計・二重消費: 0
- rawコメント・翻訳結果の禁止された永続保存: 0
- 対象内Provider呼出成功率: 99%以上
- OpenAI一時障害時のAzure切替成功率: 95%以上
- 原因不明5xx: 1%未満
- 個人US$3、全体US$25原価上限超過: 0
- Cloudflare/Supabase使用量: 無料枠の60%未満を目安
- test mode/Test ClockでCheckout、更新成功、支払い失敗、解約、期間終了、disputeを各1回以上確認
- 実顧客で正常な初回課金と少なくとも1回の正常更新を監視し、手動の実課金smokeは行わない
- 重大障害なしで連続7日稼働

満たした後も人数上限は手動で拡大する。

## 20. 受入条件

Paid Core v1は次をすべて満たしたときだけ公開可能とする。

1. Free回帰テストが通り、FreeのProvider・上限・認証・セッション・表示が維持されている。
2. JP/US以外、国不明、満員、同意未完了、未認証、ownerに非終端billing lifecycleありの場合はCheckoutを作成しない。
3. 1 ownerの非終端billing lifecycleが最大1件で、capacity消費中の全状態合計が20を超えない。
4. Checkout returnだけではPaidにならず、署名済みWebhookの永続projectionだけで有効になる。
5. Stripeイベントの重複・順序逆転で状態が後退しない。
6. generic Subscription versionや`event.created`単独へ依存せず、3種類の先行event順序から最初のSubscription bindingとprojectionが同一transactionまたはretryableへ収束する。
7. 50万文字が契約更新周期で正しく予約・確定・解放され、fallbackでも二重消費しない。
8. microbatchのitem照合、partial failure、retry subset、request hard limit、item 1,000 code points、backpressureが決定表どおり動く。
9. OpenAI障害分類、retry、circuit breaker、Azure fallbackが本書どおり動く。
10. entitlement/usage/owner/costが読めない場合にProviderを呼ばない。
11. 個人・全体原価、Azure 600,000文字余白とstrict不等号、fallback論理上限、kill switchがProvider呼出前に強制される。
12. 個人/全体原価上限で50万文字より先に停止し得ることがPaid利用条件とUIに一致する。
13. raw provider payload、raw response、secret、private identifierがDB、ログ、ブラウザへ出ず、sanitized feed本文の24時間保存だけが明示的な例外になっている。
14. Checkout、Portal、解約、支払い失敗、dispute、アカウント削除の状態遷移がtest mode/Test Clockでテストされる。
15. 390 / 820 / 1024 / 1280 / 1366pxで課金・利用量・障害表示に横スクロールや重大な崩れがない。
16. Stripe test mode、fixture Provider、ローカル/Previewで検証後、liveは無課金readinessだけを行い、最初の実顧客を監視対象にする。
17. Supabase/OpenAI/Azure/Cloudflareの実使用量とlimitに30%以上の余白が確認される。
18. owner/hold/Checkout Session/Subscriptionの一意性、Stripe idempotency、30分expiry、holdからactiveへの原子的変換が競合fixtureで成立する。
19. 7日後cancel、遅延`invoice.paid`、一部/全額返金が決定表どおり収束し、課金済み未付与と21枠目を自動生成しない。
20. Webhook receiptの同時claim、120秒lease、stale recovery、3 crash pointsが一度だけのprojectionへ収束する。
21. Supabase lease/RPCがsession 1 in-flight、OpenAI最大8、RPM/TPM 70%を複数Worker間で強制し、DB不能時はProvider未呼出になる。
22. 3時間/日、24時間再開、低コメント、空poll、同一時間OpenAI+Azureの負荷fixtureでDB/Egress/Cloudflare request budgetの停止条件が成立する。
23. `openai_attempt`と`azure_direct_fallback`が別reservationで、degraded Azure直行はOpenAI capacityを消費せず、継続不明slotは120秒または完了確認まで再利用されない。
24. dispute利用者勝訴は即時停止・cancel確認後解放、失敗時は枠保持reconciliation、運営勝訴は他停止理由がない場合だけ復元する。
25. production dark deploy中はlive Checkout Session/public action/operator bypassを実行せず、sanitized read-only readinessだけで閉じる。
26. durable reconcilerが利用者アクセス/Webhookなしでも期限到来行をbounded leaseで回収し、duplicate failureで7日起点を変えず、Cron競合・crash・stale token・外部再取得失敗から一度だけ収束する。
27. Checkout Session作成後はimmutable DB bindingのcommit前にURLを返さず、response loss/DB失敗/先行Webhookを同じidempotency keyで回収し、完了時刻はStripe Event `created`を権威とする。

### 20.1 公開前に閉じるevidence

Free回帰、schema/RPC原子性、Stripe署名/重複/順序逆転、Test Clock課金ライフサイクル、entitlement projection、quota/cost reservation、OpenAI/Azure fixture、20枠競合、region gate、consent、retention/privacy contract、lint、typecheck、build、Preview幅/console QA、live無課金設定readiness、本番deploy対象commit SHA、kill switch初期値を必須とする。

承認順は、`Gate 0 test/Preview設定承認 → Local/Preview QA → Gate 1 live/production設定承認 → production dark deploy → live無課金readiness → Gate 2 Paid activation/公開承認 → activation`で固定する。production deployとPaid activationを同じ承認にしない。

### 20.2 公開後に取得するevidence

最初の正規購入、実Stripe手数料、実OpenAI原価、実Azure fallback量、実Worker/Supabase使用量、正常更新、実エラー率、実latency、35日評価、20枠拡大判断は公開後の運用evidenceとする。これらが未取得であることを、実装完了、Paid v1コードレビュー完了、次ツール開発のblockerにしない。

## 21. 公開前に外部で確認する事項

以下は現在のコードだけでは確認できず、公開前の別承認付き確認が必要である。

- Stripeアカウントの実際のPayments/Billing/Tax/国際カード/通貨換算手数料
- 新規USD Priceの`tax_behavior=inclusive`、Product tax code、Coupon/Promotion Code
- 日本・米国での税務登録、申告、納付義務
- Stripe Customer Portal、Webhook endpoint、live event delivery設定
- Cloudflareの実プラン、現在のrequest/CPU使用量、`request.cf.country`の本番挙動
- Supabaseの実プラン、DB容量、Cron可否、backup/復旧方針
- Azure Translator resourceがF0であることと月間実使用量
- Azure resourceを共有する全用途の月間使用量と、安全余白を含むfallback可否
- OpenAI専用Project、GPT-4o-mini利用可否、実RPM/TPM/rate/spend limit、ZDR資格
- 実prompt/schemaのtoken計測で本書の原価前提と30% capacity余白を再検証
- 本番secret/envの存在（値は文書・ログへ出さない）
- 特商法、利用規約、プライバシーポリシー、返金・自動更新表示の最終法務確認
- アーリーアクセス割引の有無、率、期間、初回20人への適用条件

Stripe live modeでは自己課金・試験購入を行わず、公式testing guidanceに従いtest API keys、test PaymentMethods、Test Clockを用いる。dark deploy中のlive readinessはProduct/Price/Tax/Portal/Webhook/secret/Production URLとproduction route設定、kill switch、region gateのsanitized read-only確認だけとし、live Checkout Session、public Checkout action、operator bypassを実行しない。正常な初回live Session/実課金はactivation後の最初の実顧客によってのみ発生する。

- Stripe testing: <https://docs.stripe.com/testing>
- Stripe test clocks/use cases: <https://docs.stripe.com/testing-use-cases>

## 22. 未確定事項

次は本書の主要動作を妨げないが、公開前または別仕様で決める。

- アーリーアクセス割引の具体条件
- 20枠から次に増やす人数
- 同意version記録の最終保持期間
- 税務上の正確なProduct tax code
- 振込を将来追加する判断基準
- Paid追加機能（最初の候補は別仕様の手動30語辞書）

「50万文字は最大利用枠であり、US$3/US$25安全上限により先に停止し得る」「最大50万文字と先行停止可能性をCheckout前・Paid利用条件・UIで一貫表示し、保証文字数と扱わない」という解釈は、2026-08-12に人間承認済みである。

## 23. 承認境界

本書の承認は設計承認であり、次を自動的には承認しない。

- 実装着手
- dependency・manifest・lockfile変更
- Supabase migrationのremote適用
- Stripe Product/Price/Coupon/Webhook/Portal/Tax設定
- OpenAI Project/key/limit変更
- Azure tier/limit変更
- Cloudflare secret/env/deploy/rule変更
- commit、push、PR、merge
- Preview/本番のlive課金・Provider実行
- 公開、人数上限拡大、後片付け
