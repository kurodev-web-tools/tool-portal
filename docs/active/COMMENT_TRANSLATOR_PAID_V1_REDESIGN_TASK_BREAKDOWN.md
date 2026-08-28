# Comment Translator Paid Core v1 Task Breakdown

> **For agentic workers:** 実装は仕様承認後、`gpt-5.6-luna` / `max`の新しいトップレベル実装タスクへ引き渡す。必要な場合だけ、Luna Max親から`luna-implementer`へ非重複範囲を委譲する。実装完了後は`sol-reviewer` (`gpt-5.6-sol` / `medium`)がread-onlyレビューする。

**状態:** 承認済み。2026-08-27のJP免税表示・US Checkout・Stripe Tax安全仕様をTask 11 local implementation authorityとして反映。remote mutation、deploy、commit/push/PRは別承認。

**作成日:** 2026-08-12

**仕様正本:** `docs/active/COMMENT_TRANSLATOR_PAID_V1_REDESIGN_SPEC.md`

**Goal:** 既存Free版を維持しながら、JP/US先着20名向けのUS$6/月Paid Core v1を、安全な課金・entitlement・利用量・Provider制御付きで提供する。

**Architecture:** Stripe署名済みイベントをSupabaseのdurable entitlementへ投影し、すべてのセッション・Provider呼出前にその状態とdurable quota/cost reservationを検証する。PaidはOpenAI GPT-4o-miniを通常経路、Azureを一時障害時fallbackとし、Free経路と利用台帳を分離する。

**Tech Stack:** Next.js Server Actions/Route Handlers、TypeScript、Stripe Billing/Checkout/Customer Portal/Tax、Supabase Postgres/RLS、Cloudflare Workers、OpenAI API、Azure Translator。

---

## 1. 実行原則

- 本書はタスク分割であり、実装許可ではない。
- 新仕様承認後に、最新`origin/main`から専用worktree/feature branchを作る。
- 過去のPaid仕様・実装を復元しない。現行mainのPaid-shapedコードは置換対象として扱う。
- 1 worktreeにつきwriterは1人。
- 各PRはFreeを利用可能な状態に保ち、個別にrollback可能にする。
- Stripe/Supabase/OpenAI/Azure/Cloudflareのlive mutationは、コード実装・test mode検証とは別の承認ゲートにする。live Stripeでは自己課金・試験購入を行わない。
- dependency追加は原則不要。必要になった場合はmanifest/lockfile変更前に承認を得る。
- TDDでcontract/unit/integration testを先に追加し、最小実装後に既存Free contractを回帰実行する。
- `task.md`更新、commit、push、PRは実装タスク側の明示的な権限に従う。

## 2. 変更領域マップ

### 現行ファイルの主な変更候補

| 責務 | 現行ファイル |
| --- | --- |
| Billing/Stripe足場 | `lib/comment-translator-billing-runtime.ts` |
| Stripe live readiness | `lib/comment-translator-stripe-live-readiness-runtime.ts` |
| Checkout/Portal actions | `app/account/billing/actions.ts` |
| Billing UI | `app/account/billing/page.tsx` |
| Webhook route | `app/api/comment-translator/billing/webhook/route.ts` |
| entitlement baseline | `lib/comment-translator-public-entitlement-baseline.ts` |
| session policy/types | `lib/comment-translator-session-policy.ts`, `lib/comment-translator-session-types.ts` |
| session entry | `app/tools/comment-translator/session-actions.ts` |
| provider policy/execution | `lib/comment-translator-provider-policy-runtime.ts`, `lib/comment-translator-provider-execution-runtime.ts` |
| Azure execution | `lib/comment-translator-azure-normal-translation-execution.ts` |
| usage ledger | `lib/comment-translator-usage-ledger-runtime.ts`, `lib/comment-translator-durable-usage-counter-store.ts` |
| feed persistence | `lib/comment-translator-real-comments-feed-durable-store.ts` |
| Translator UI | `components/comment-translator/CommentTranslatorUsageSidebar.tsx`および関連dock model/copy |
| Legal copy | `lib/legal-content.ts` |
| Cloudflare config | `wrangler.jsonc`（secret値は追加しない） |

### 新規ファイル候補

実装前レビューで命名を確定する。責務を混ぜず、以下の単位を推奨する。

- `lib/comment-translator-paid-entitlement-store.ts`
- `lib/comment-translator-paid-capacity-store.ts`
- `lib/comment-translator-paid-usage-store.ts`
- `lib/comment-translator-paid-cost-ledger.ts`
- `lib/comment-translator-openai-execution.ts`
- `lib/comment-translator-provider-circuit-breaker.ts`
- `lib/comment-translator-paid-region-gate.ts`
- `lib/comment-translator-paid-consent-store.ts`
- `lib/comment-translator-paid-retention.ts`
- `supabase/migrations/<timestamp>_comment_translator_paid_core_v1.sql`
- 対応する`*-contract.mjs`または既存testパターンに従うテスト

巨大な単一billing runtimeへ全責務を追加しない。

## 3. 依存関係

```text
T0 specification approval
  -> T1 Free baseline and invalid-paid isolation
  -> T2 durable schema
      -> T3 entitlement projection
      -> T4 capacity and region gate
      -> T5 usage and cost reservation
          -> T6 OpenAI execution and fallback
              -> T7 session integration
  T3..T7 -> T8 Checkout/Portal/UI/consent
  T2 + T3 + T5 + T6 + T7 -> T9 retention and observability
  T1..T9 -> T10 legal/security review
  T1..T10 -> G0 test/Preview configuration approval
  G0 -> T11 Local/Preview QA
  T11 -> G1 live/production configuration approval
  G1 -> T12 production dark deploy + no-charge readiness
  T12 -> G2 activation/public approval
  G2 -> T13 production early access activation
  T13 -> T14 35-day evaluation
```

依存は2種類に分ける。

| Task | 実装開始に必要 | 最終受入に必要 |
| --- | --- | --- |
| T8 | T3〜T7の公開interface/状態表 | T3〜T7の実装・contract通過 |
| T9 | T2/T3/T5/T6/T7のschema・event定義 | 同5 Taskの実装・保持fixture通過 |
| T10 | T1〜T9の確定挙動・copy contract | T1〜T9の実装・security evidence |
| G0 | T1〜T10のtest/Preview設定要件 | 個別承認されたtest/Preview設定とrollback |
| T11 | G0完了、T1〜T10の統合可能な実装 | T1〜T10の全受入条件とLocal/Preview evidence |
| G1 | T11完了 | 個別承認されたlive/production設定とrollback |
| T12 | G1完了 | dark deploy commit一致と無課金readiness |
| G2/T13 | T12完了 | activationの個別承認と公開後監視準備 |

interface先行で並行準備しても、依存先の最終受入前に後続Taskを完了扱いにしない。

## Chunk 1: 仕様固定とFree回帰基盤

### Task 0: Sol仕様レビューと人間承認

**Ownership:** 文書のみ。source、migration、外部設定は変更しない。

**Files:**

- Review: `docs/active/COMMENT_TRANSLATOR_PAID_V1_REDESIGN_SPEC.md`
- Review: `docs/active/COMMENT_TRANSLATOR_PAID_V1_REDESIGN_TASK_BREAKDOWN.md`

- [ ] 新仕様が過去案を参照していないことを確認する。
- [ ] 承認済み事項、未確定事項、外部確認事項を照合する。
- [ ] Free維持、fail-closed、原価、保持、rollbackの矛盾を確認する。
- [ ] Solレビュー指摘を本書へ反映し、ユーザー承認を得る。
- [ ] 実装開始の明示承認を別途得る。

**完了条件:** 仕様とタスク分割が承認済み。実装許可は別に記録されている。

### Task 1: Free baseline固定と旧Paid-shapedコードの隔離

**Ownership:** contract/testと、Paid境界の置換準備。Free動作を変更しない。

**Files:**

- Inspect/Modify: `lib/comment-translator-billing-runtime.ts`
- Inspect/Modify: `lib/comment-translator-public-entitlement-baseline.ts`
- Inspect: `lib/comment-translator-session-policy.ts`
- Test: `scripts/comment-translator-stripe-paid-plan-integration-contract.mjs`
- Test: `scripts/comment-translator-public-entitlement-baseline-contract.mjs`
- Test: 既存Free関連contract群

- [ ] 旧JPY月額・年額、旧plan name、メモリMap entitlementを新仕様として使用しないことをRED contractで示す。
- [ ] Free 20,000文字、30件/分、既存時間制御、Azure通常経路をgolden baselineにする。
- [ ] Paid未設定・DB unreadable・Stripe未設定でもFreeが利用可能なcontractを追加する。
- [ ] 旧Paid presentation/runtimeを、新しい実装が接続されるまでfail-closedのunavailable表示へ隔離する。
- [ ] 既存Free contract、lint、typecheckを実行する。

**Verification:**

- `node scripts/comment-translator-public-entitlement-baseline-contract.mjs`
- `node scripts/comment-translator-free-limits-public-copy-contract.mjs`
- `node scripts/comment-translator-azure-normal-translation-execution-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit --pretty false`

**完了条件:** Freeが不変で、旧Paid値が新仕様として露出・権限付与されない。

## Chunk 2: Durableデータモデル

### Task 2: Paid Core v1 Supabase schemaと原子的RPC

**Ownership:** 新規migration、DB adapter contract。remote applyは禁止。

**Files:**

- Create: `supabase/migrations/<timestamp>_comment_translator_paid_core_v1.sql`
- Create: `lib/comment-translator-paid-entitlement-store.ts`
- Create: `lib/comment-translator-paid-capacity-store.ts`
- Create: `lib/comment-translator-paid-usage-store.ts`
- Create: `lib/comment-translator-paid-reconciler-store.ts`
- Create: `lib/comment-translator-paid-consent-store.ts`
- Test: 新規schema/store contract群

- [ ] entitlement projection tableを作る。owner、Customer、初回はnullableなSubscription参照、Product/Price binding、status、period、cancel state、対象ownerのdispute stateを保持する。存在しない汎用Subscription versionは持たない。
- [ ] Stripe event receipt tableを作る。event ID unique、type、`stripe_event_created_at`、`processing/retryable/complete/rejected`、`processing_started_at`、`lease_until`、`lease_token`、`attempt_count`、sanitized error classだけを保持する。
- [ ] ownerと`is_terminal=false`にpartial unique indexを作り、hold、未完了Session、incomplete/active/period-end/past_due/unpaid/dispute/cancel待ち/paid-unentitled/reconciliation等を含む非終端billing lifecycleを最大1件にする。
- [ ] Customer IDのowner binding、各lifecycleのCustomer参照、Checkout Session ID/Subscription IDのowner+lifecycle bindingをinsert-only / immutableにする。同じCustomerは同じownerの後続lifecycleから新しい参照で再利用できるが、過去参照の更新、別owner/lifecycleへの再割当て、delete-and-reinsertを拒否するunique/trigger contractを作る。
- [ ] Checkout eventまたは先行Subscription/Invoice eventから、bind済みlifecycle/hold/Session/Customerをlockして最初のSubscription bindingを原子的に作るRPCを作る。
- [ ] billing lifecycle/control-plane rowへ`next_reconcile_at`、`payment_failure_started_at`、`reconcile_lease_until`、opaque `reconcile_lease_token`、`reconcile_attempt_count`、`reconcile_backoff_seconds`、sanitized `last_reconcile_error_class`を追加する。
- [ ] due rowを1回最大50件、120秒lease、`SKIP LOCKED`相当で原子的にclaim/finalize/retryするRPCを作り、stale tokenを拒否する。backoffは1分/5分/15分/1時間/最大6時間とする。
- [ ] `payment_failure_started_at`は最初の`past_due`/`unpaid`遷移で固定し、duplicate/out-of-order/古いeventでは変更せず、`active`正常復旧後の別失敗だけ新規起点を作るDB contractにする。
- [ ] checkout/incomplete/active/period-end/payment-failure/dispute/cancel待ち/reconciliationの合計20枠を原子的に確保・変換・解放するRPCを作る。
- [ ] 同じbilling lifecycleのhold/Session/Subscription stageをcapacity 1枠として数え、stage変換で二重計上しない。
- [ ] billing-period単位の文字reservation/commit/releaseを原子的に処理するRPCを作る。
- [ ] OpenAI個人/全体原価reservationとAzure fallback月次文字数reservationを作る。
- [ ] Provider circuit stateをdurableに保持する。
- [ ] `openai_attempt` RPCでsession lease、OpenAI全体8 slot（TTL 120秒）、UTC minute RPM、rolling 60秒TPM、文字quota、OpenAI costを原子的に取得・延長・release/reclaimする。
- [ ] `azure_direct_fallback` RPCでsession lease、文字quota、Azure論理20万文字/物理共有枠だけを予約し、OpenAI slot/RPM/TPM/costを取得しない。
- [ ] Cloudflare UTC日次Paid poll budgetと、3時間最大720 pollsをsession開始時に保守予約するRPCを作る。未使用分は当日再配布しない。
- [ ] consent version記録を作る。
- [ ] `attempt_id`、provider attempt、expiryを持つ短命な冪等台帳を作り、provider message ID・本文・本文hashを保存しない。
- [ ] Provider detailをowner/provider/UTC hour bucketへ集約し、session別情報をsession summaryへ分離する。
- [ ] raw comment、raw response、raw Stripe payload、secret用columnが存在しないことをcontractで固定する。
- [ ] RLSを有効化し、anon/authenticated直書きを拒否し、trusted server境界だけがmutationできるようにする。
- [ ] concurrency testで21件目、owner二重非終端lifecycle/Session/Subscription、binding再割当て、reconciler同時claim/stale token、Provider 9 slot、session二重lease、RPM/TPM超過、二重文字commit、二重event applyが拒否されることを確認する。

**Verification:** migration parser/fixture DB contract、`git diff --check`、credential/private-data scan。

**完了条件:** remote未適用のmigrationとして、DB不変条件と原子性が自動検証される。

## Chunk 3: Stripeとentitlement

### Task 3: 署名済みWebhookのidempotent projection

**Ownership:** Stripe adapter、Webhook route、entitlement store。Checkout UIは対象外。

**Files:**

- Modify: `app/api/comment-translator/billing/webhook/route.ts`
- Refactor/Modify: `lib/comment-translator-billing-runtime.ts`
- Modify: `lib/comment-translator-stripe-live-readiness-runtime.ts`
- Modify: `lib/comment-translator-public-entitlement-baseline.ts`
- Create/Modify: `lib/comment-translator-paid-entitlement-store.ts`
- Test: Stripe fixture contracts

- [ ] raw body署名検証の失敗contractを作る。
- [ ] event ID unique receiptを120秒leaseとopaque tokenで原子的claimし、成功後だけ`complete`、再取得/transaction失敗は`retryable`にする。
- [ ] lease失効済み`processing`を別WorkerがCASで再claimし、stale tokenのprojection/completeを拒否する。
- [ ] Webhookは`complete`と永続的`rejected`だけ2xx、active processing/retryable/再取得失敗/DB失敗は非2xxにする。
- [ ] type/object形状をallowlist検証する。既存binding競合、複数owner候補、Customer不一致、Product/Price不一致だけを永続拒否し、binding未成立/依存object未到着はretryableにする。
- [ ] Checkout redirectがentitlementを付与しないcontractを作る。
- [ ] `active`、period-end cancel、payment failure、cancel、disputeの投影を実装する。
- [ ] 最初の`past_due`/`unpaid`投影だけが`payment_failure_started_at`を設定し、duplicate/out-of-orderでは保持、`active`復旧でclear、別失敗で再設定する。
- [ ] entitlement/capacity影響eventは常に現在objectを再取得する。Checkout eventはSession+Subscription+最新Invoice、Subscription eventはSubscription+最新Invoice、Invoice eventはInvoice+Subscription、refund/disputeは支払いobject+Invoice+Subscriptionを取得する。
- [ ] `checkout.session.completed`でbind済みlifecycle/hold/Session/Customerから最初のSubscription bindingを同じprojection transaction内に作る。Session DB binding前にWebhookが来た場合は永続拒否せず、idempotency keyによるSession回収・binding後までretryableにする。
- [ ] Subscription/Invoice event先行時もownerを一意に導出できれば同じbinding RPCで作成し、依存行未到着ならretryableにする。
- [ ] 再取得不要allowlistをterminal duplicateと状態非影響ignored eventだけに限定する。
- [ ] `event.created`単独やgeneric Subscription versionを使わず、現在objectへ収束して状態が後退しないことを検証する。
- [ ] `checkout.session.completed` Event `created`は同一Sessionのexpiry境界だけに使い、DB受信時刻/Worker時計や一般的なprojection順序判定へ流用しない。
- [ ] `subscription.created`先行、`invoice.paid`先行、`checkout.session.completed`先行、Subscription update先行、duplicate/out-of-order、`canceled`後の古い`active`、再取得失敗、binding未成立/競合/不一致をfixture化する。
- [ ] 同一event同時claim、stale processing recovery、receipt作成直後/projection途中/complete直前のcrashをfixture化し、再送で一度だけ収束させる。
- [ ] disputeは対象Charge/PaymentIntentから一意に辿れたowner/subscriptionだけ停止し、不明時に全体停止しない。
- [ ] dispute利用者勝訴時はPaid即停止、Subscription即時cancel、`canceled`確認後だけ枠解放とし、失敗時は停止/保持/manual reconciliationにする。
- [ ] dispute運営勝訴時は現在periodが有効で他停止理由がない場合だけPaidを復元する。
- [ ] payment failureでPaidを即停止し、枠だけ7日保持する。
- [ ] duplicate `past_due`、out-of-order、古いWebhookで`payment_failure_started_at`が変わらず、`active`復旧後の別payment failureだけ新起点になるfixtureを作る。
- [ ] Webhook欠落や利用者アクセスなしでも、durable reconcilerが7日経過後に現在Subscriptionを再取得してcancelし、`canceled`確認後だけ枠解放する。再取得/cancel失敗はPaid停止・枠保持で次回retryにする。
- [ ] event receiptへraw payloadを保存しない。

**Verification:** Stripe test fixturesのみ。live Stripe actionは禁止。

**完了条件:** Supabase projectionだけがPaid authorityとなり、順序逆転・再取得失敗でも誤付与せず、障害時は対象ownerをFreeへ安全に退避する。

### Task 4: Checkout capacity・販売地域・同意ゲート

**Ownership:** Checkout作成前のserver policy。Provider実行は対象外。

**Files:**

- Create: `lib/comment-translator-paid-region-gate.ts`
- Modify: `app/account/billing/actions.ts`
- Modify: `lib/comment-translator-billing-runtime.ts`
- Create/Modify: capacity/consent stores
- Test: region/capacity/consent contracts

- [ ] `JP`/`US`だけ許可し、欠損・未知・その他をfail-closedにする。
- [ ] client supplied country/header spoofを権威にしない。
- [ ] unauthenticated、未同意、ownerに非終端billing lifecycleあり、満員時にCheckoutを作らない。
- [ ] 非終端状態ごとに既存Session、Customer Portal、契約管理、処理中表示へ返し、`past_due`/`unpaid`はPortalで既存Subscriptionの支払い方法だけを更新する。
- [ ] Checkout前にowner単位の30分holdを原子的に確保し、同時要求は同じopaque `hold_id`へ収束させる。
- [ ] Stripe idempotency keyを`ct-paid-checkout-{hold_id}`へ固定し、holdとCheckout Sessionを1:1 bindする。
- [ ] Checkout順序を、Customer作成/再利用とimmutable owner binding → lifecycle/hold lock → idempotency key付きSession作成 → Session ID/Customer/`expires_at`の同一lifecycleへのimmutable DB binding → commit後URL返却、に固定する。
- [ ] DB targetとStripe Session `expires_at`へ同じserver UTC秒（作成時+31分。Stripe最短30分への60秒余白）を設定し、binding後はStripe値をDB holdの権威値にする。不一致時はSession expireとStripe `expired`確認後だけholdを解放する。
- [ ] Session作成成功後のDB binding/commit失敗確定ではURLを返さずlifecycleを`expire_required`にしてSessionをexpireし、以後binding/URL返却へ戻さない。expire/再取得失敗ではholdを保持して`next_reconcile_at`を設定する。response loss/crashで結果不明の場合だけ、同じidempotency keyで既存Sessionを回収し、`expire_required`でなくimmutable条件一致時に同じlifecycleへ一度だけbindする。
- [ ] Checkout URLがDB commit前、binding失敗時、Stripe response消失時にブラウザへ返らないcontractを作り、URL自体をDB/ログへ保存しない。
- [ ] hold期限到達後はStripe Sessionの`expired`確認まで枠を保持し、`complete`かつ完了時刻がexpiry以前・支払い成功・binding一致・hold未解放ならactiveへtransaction変換する。
- [ ] Session完了時刻は同じSession IDのStripe `checkout.session.completed` Event `created`を権威とし、DB受信時刻/Worker時計を使わない。Event欠落時はStripe APIから回収できるまでPaid未付与のretryableにする。
- [ ] session作成失敗、期限切れ、放棄、Session作成直後crash、Stripe response loss、DB binding失敗を同じhold/idempotency keyとdurable reconcilerで収束させる。
- [ ] 非終端各状態からのCheckout拒否、concurrent request、hold expiry対completion、21件目、課金済み未付与、二重Subscription、binding後のowner/lifecycle変更拒否をfixture化する。
- [ ] 支払い失敗7日後は現在Subscriptionが未回復ならidempotentに即時cancelし、Stripe `canceled`確認後だけ枠を解放する。
- [ ] 枠解放後の遅延`invoice.paid`は終端Subscriptionを自動再有効化せずreconciliationへ送る。
- [ ] 現在period一部返金はentitlement/capacity維持、全額返金は即時停止・cancel確認後解放、過去period返金は現在状態維持、不明bindingは手動reconciliationとする。
- [ ] Checkout paramsをUSD月額Price、subscription、card系許可、automatic tax、billing address、success/cancel URLへ限定する。
- [ ] Coupon/Promotion Codeは設定された場合だけ同一Priceへ許可する。

**完了条件:** 不正地域や競合でもStripe charge前に安全停止し、owner/Session/Subscriptionの一意性、30分expiry、20枠変換、7日終了、返金表がrace-freeに成立する。

## Chunk 4: 利用量・原価・Provider

### Task 5: billing-period文字quotaと原価reservation

**Ownership:** usage/cost domain。Provider HTTP adapterは対象外。

**Files:**

- Modify: `lib/comment-translator-usage-ledger-runtime.ts`
- Modify: `lib/comment-translator-durable-usage-counter-store.ts`
- Create/Modify: `lib/comment-translator-paid-usage-store.ts`
- Create: `lib/comment-translator-paid-cost-ledger.ts`
- Modify: `lib/comment-translator-session-policy.ts`
- Modify: `lib/comment-translator-session-types.ts`
- Test: quota/cost concurrency contracts

- [ ] 50万文字をStripe period start/endでbucket化する。
- [ ] renewal支払い成功時だけ新periodを有効化する。
- [ ] Unicode code point、最大500、部分翻訳禁止をtestする。
- [ ] HMACベースの短命な`attempt_id`を実装し、同じ論理翻訳のretry/fallbackでreserve/commit/releaseを二重適用しない。
- [ ] cache/empty/duplicate/language skipを非消費にする。
- [ ] fallback成功でも1回だけ消費する。
- [ ] individual US$3/billing periodとglobal US$25/UTC monthをProvider前にreserveする。
- [ ] unknown chargeを保守的最大原価として保持する。
- [ ] Azure Paid fallback 200,000文字/UTC monthをFree台帳と分離する。
- [ ] Azure同一resourceの物理枠をFree実使用量と共有し、600,000文字の安全余白と`free実使用量 + paid fallback予約済み + 600,000 < 2,000,000`を強制してPaid fallbackを先に停止する。
- [ ] 理論境界F<=60と、strict不等号ではF=60を拒否して満額同時利用がF<=59になるboundary fixtureを固定する。
- [ ] 文字上限到達時にFree枠へ移行しない。
- [ ] 個人/全体原価上限が50万文字より先に到達するcaseをcontract化し、未送信文字を消費しない。

**完了条件:** race/retry/fallbackでも文字数と原価が二重計上されず、上限前に停止できる。

### Task 6: OpenAI adapter・障害分類・Azure fallback

**Ownership:** Provider policy/executionとdurable circuit breaker。

**Files:**

- Create: `lib/comment-translator-openai-execution.ts`
- Create: `lib/comment-translator-provider-circuit-breaker.ts`
- Modify: `lib/comment-translator-provider-policy-runtime.ts`
- Modify: `lib/comment-translator-provider-execution-runtime.ts`
- Modify: `lib/comment-translator-azure-normal-translation-execution.ts`
- Test: Provider fixture contracts

- [ ] GPT-4o-mini、`store=false`、1 item計画予算128 tokens、request hard limit`件数×128+384`、item hard limit 1,000 Unicode code points、strict structured outputを固定する。
- [ ] コメント本文と言語・最小指示だけを送り、author/YouTube識別子を送らない。
- [ ] 同一owner/session/language pairだけを最大15件・7,500 code pointsへmicrobatchし、poll後の追加待機を最大250msにする。
- [ ] `openai_attempt`でsession lease、OpenAI 8 slot、RPM/TPM 70%、文字quota/costを予約し、`azure_direct_fallback`でsession lease、文字quota、Azure論理/物理枠だけを予約する。DB不能時はProviderを呼ばない。
- [ ] session/OpenAI slot TTL 120秒、HTTP timeout 20秒を固定し、normal finalize、retry延長、stale reclaim、stale token拒否を実装する。
- [ ] degraded中のAzure直接経路がOpenAI slot/RPM/TPM/costを取得しないcontractを作る。
- [ ] OpenAI retryごとに新しいslot/RPM/TPM/cost reservationを取得する。明示完了時だけslotをreleaseし、timeout/切断/crashでは`uncertain-inflight`として120秒または完了確認まで保持する。
- [ ] OpenAI継続不明のままAzure fallbackする場合もOpenAI slotを保持し、Azure予約を別取得して、推定外部OpenAI同時実行が8を超えないようにする。
- [ ] `attempt_id`でresponse itemを照合し、欠損/重複/未知/不正itemだけを未解決subsetとして最大1 retryする。成功itemを再送しない。
- [ ] rolling RPM/TPM reservationが実limitの70%を超える場合は次pollまでbackpressureし、解消しなければ非消費`provider-capacity-paused`にする。
- [ ] 複数Workerの同時9 request、同一session二重batch、degraded Azure直行時OpenAI reservation 0、timeout後slot保持、lease中crash、TTL後reclaim、DB read failureをfixture化する。
- [ ] retryable network/408/429/500/503/504分類を実装する。
- [ ] auth/config/quota/cost/policy/invalid request/unsupportedをfallback対象外にする。
- [ ] JSON parse failureまたはitem 1,000 code points超過は未解決subsetだけOpenAI最大1 retry後に停止し、Azureへ送らない。
- [ ] 3 eligible failures/60秒、5分degraded、half-open probeをdurableに実装する。
- [ ] Azure成功時だけ利用者文字quotaをcommitする。
- [ ] Azureも失敗した場合はreservationをreleaseし、安全エラーを返す。
- [ ] 4つのkill switch欠損・OFFをtestする。
- [ ] response/errorのraw本文がログへ出ないcontractを作る。
- [ ] 公式価格と実prompt token計測を用い、仕様書12章の軽量/標準/高頻度/病的ケースを再計算する。

**完了条件:** 仕様のfallback matrixとcircuit transitionがfixtureで完全に再現される。

### Task 7: Paid session統合

**Ownership:** session start/status/heartbeat/feed stepへの新entitlement接続。

**Files:**

- Modify: `app/tools/comment-translator/session-actions.ts`
- Modify: `app/tools/comment-translator/feed-actions.ts`
- Modify: `lib/comment-translator-live-provider-session-step.ts`
- Modify: `lib/comment-translator-session-command-execution.ts`
- Modify: `lib/comment-translator-public-entitlement-baseline.ts`
- Test: end-to-end fixture session contracts

- [ ] session start前にdurable entitlement/usage/cost/provider stateを読む。
- [ ] 読取失敗時にProviderを呼ばずfail-closedにする。
- [ ] Paid 60件/分、3時間、1同時sessionを適用する。
- [ ] Paid固有の日次hard limitは追加せず、3時間終了後の再開を許可する。
- [ ] session開始時に当日poll予約を取得し、UTC日境界では新bucket予約後だけauto-pollを再開する。
- [ ] Paid quota到達後にsessionを安全停止し、次回resetを返す。
- [ ] OpenAI復帰後にsession restartなしで通常経路へ戻す。
- [ ] Paid fallbackがFree個人quotaを変えないことを確認する。
- [ ] Freeの全既存session contractを回帰実行する。
- [ ] infra request budgetの95%停止を受けたclientがauto-pollを終了し、UTC reset時刻を表示する。

**完了条件:** 同一UI/セッション基盤でFreeとPaidの権限・台帳・Providerが正しく分岐する。

## Chunk 5: UI・法務・運用

### Task 8: Billing UI・利用量表示・Customer Portal

**Ownership:** account billing UI、Translator表示、copy。DB/Provider実装は変更しない。

**Files:**

- Modify: `app/account/billing/page.tsx`
- Modify: `app/account/billing/actions.ts`
- Modify: `components/comment-translator/CommentTranslatorUsageSidebar.tsx`
- Modify: related dock model/format/copy files
- Modify: `lib/comment-translator-copy-ja.json`
- Modify: `lib/comment-translator-copy-en.json`
- Test: UI contract、width QA

- [ ] 旧JPY/年額/旧plan nameと税務主張を削除し、JA `US$6/月（支払総額・USD請求）`、EN `US$6/month (total price, billed in USD)`を表示する。
- [ ] 必須同意とversion保存後だけCheckout actionを呼ぶ。
- [ ] 満員、対象地域外、設定停止、支払い停止を区別して表示する。
- [ ] 地域文言を「現在の接続地域では購入できません」とし、居住国を断定しない。
- [ ] Paidは使用/残り文字数と次回resetを表示し、token/原価を表示しない。
- [ ] 個人/全体安全上限で文字残量より先に止まる場合も、token/原価を出さず理由と復旧時期を表示する。
- [ ] Azure fallback bannerと復旧時消去を実装する。
- [ ] Customer Portalから支払い方法・履歴・期間終了時解約へ進める。
- [ ] browser storageへentitlement、country authority、billing identifiersを保存しない。
- [ ] 390 / 820 / 1024 / 1280 / 1366px、JA/EN、keyboard/focus、console errorを確認する。

**完了条件:** 支払条件と状態が誤認なく表示され、Free UIが回帰していない。

### Task 9: Retention・cleanup・sanitized observability

**Ownership:** retention jobと集計。raw contentを扱わない。

**Files:**

- Create: `lib/comment-translator-paid-retention.ts`
- Create: `lib/comment-translator-paid-control-plane-reconciler.ts`
- Modify: `lib/comment-translator-real-comments-feed-durable-store.ts`
- Modify: monitoring/admin visibility files
- Create/Modify: cleanup migration/function/cron definition
- Test: retention/privacy contracts

- [ ] 現行feed snapshotが`originalText`、`translatedText`、safe display nameを含むsanitized表示用本文の永続化であることをcontractに明記し、session end +24hで削除する。
- [ ] Provider detail owner/provider/hour bucket 30日、session summary/Stripe event 90日、aggregate/ended subscription 13か月を実装する。
- [ ] active subscriptionはactive中保持する。
- [ ] feed snapshot以外へraw provider payload、コメント本文の複製、response、hash、private ID、secretを保存しないcontractを追加する。
- [ ] cleanupをidempotentなbounded batchにする。
- [ ] 環境ごとに既存Supabase Cronを標準scheduler、利用不可時だけ既存Cloudflare Cronを代替として選び、同一環境で通常時に二重権威化せず、同じbounded claim RPCを起動する。新しい有料service/queue/schedulerは追加しない。
- [ ] reconcilerを1回最大50件、120秒DB leaseで実行し、Checkout expiry/未bind Session、7日payment failure、cancel待ち、refund/dispute/paid-unentitled、個人billing period/UTC月原価reservation切替を処理する。
- [ ] Cron最終成功時刻、claim/retry/stale件数、sanitized error classだけを監視し、Stripe再取得不能時はPaid停止・枠保持・period停止のままbackoffする。
- [ ] 失敗時にsanitized count/statusだけを監視へ出す。
- [ ] capacity、entitlement、Provider、cost、infra thresholdのadmin viewを最小情報で提供する。
- [ ] 3時間/日でnaive minute row 108,000/単一Provider・216,000/両Provider、24時間で864,000/1,728,000となる比較fixtureを作り、採用hour bucketが1,800/3,600および14,400/28,800へ収まることを確認する。
- [ ] 20人×24時間×15秒poll、1 comment/分、対象commentなしを負荷fixture化し、Provider RPC、heartbeat、attempt receipt、cleanup、DB read/writeを計測する。
- [ ] attempt receipt約129,600 rows/27時間、session summary最大14,400 rows/90日、Paid専用計画約216MBを`pg_total_relation_size`で置換し、DB合計300MB未満を確認する。
- [ ] Cloudflare Free想定の115,200 poll requests/日をfixture化し、P95 baseline+20,000余白、1 session最大720 pollsの事前予約、UTC日境界、80/90/95% stop、client auto-poll停止が100,000/日を越える前に働くことを確認する。
- [ ] feed snapshotを最新1行・標準8KB/hard 64KBで測定し、upsertのfull-row readbackをID/countだけへ変えて、再接続時以外のSupabase Egressを発生させないcontractを作る。

**完了条件:** 保持期限と時刻駆動reconciliationが利用者アクセス/Webhookなしでも自動検証され、失敗時も機密内容をログへ出さず安全状態を維持する。

### Task 10: Legal copy・security review・runbook

**Ownership:** copy/docs/testsのみ。外部設定変更なし。

**Files:**

- Modify: `lib/legal-content.ts`
- Modify/Create: Privacy/Terms/Tokushoho関連route/copy
- Create: Paid運用runbook（`docs/active`）
- Test: legal/security/privacy contracts

- [ ] USD・支払総額US$6・Checkoutでの適用税表示・自動更新・「最大50万文字」・安全上限による先行停止可能性・保証文字数ではないこと・解約・返金・Provider送信を表示する。
- [ ] 当サービスDBがsanitized feed snapshotをsession終了+24時間保存し、Provider detail/ログ/集計/冪等台帳へ本文を複製しないことをLegal/Privacy/Paid条件で統一する。
- [ ] 「コメント本文を一切保存しない」「当サービスDBに保存しない」「自サービス非保存」を公開文言とcontractから除外する。
- [ ] OpenAI最大30日保持可能性、Azure方針、当サービスの24時間snapshot保持を区別する。
- [ ] JP/US販売対象、カード系のみ、振込非対応を表示する。
- [ ] account deletionとdispute処理を表示する。
- [ ] dispute停止が対象owner/subscriptionだけで、global停止ではないことをrunbookとfixtureで固定する。
- [ ] dispute利用者勝訴時の即時Paid停止→idempotent cancel→`canceled`確認後capacity解放、失敗時の停止/保持/manual reconciliationをrunbook化する。
- [ ] dispute運営勝訴時は現在Subscription/period有効かつ他停止理由なしの場合だけ復元するchecklistを作る。
- [ ] kill switch、Provider障害、Webhook backlog、容量逼迫、rollback runbookを作る。
- [ ] high-confidence secret scan、private identifier scan、ログ出力reviewを行う。
- [ ] 税務・特商法・privacyの専門家確認項目を未確認のまま明示する。

**完了条件:** 技術挙動と公開文言が一致し、未確認の法務事項を断定しない。

## Chunk 6: 統合検証と公開

### Gate 0: test mode / Preview設定の個別承認

T11より前に、次を一括承認とみなさず、対象、値を出力しない確認方法、rollbackを示して個別承認を得る。

- [ ] isolated/Preview Supabase migration apply、reconciler/cleanup RPC、既存Supabase Cron設定。利用不可時だけ既存Preview Cloudflare Cronを代替とし、選択した単一scheduler、間隔、権限、rollbackを個別確認
- [ ] Stripe test Product/Price/Tax/Coupon/Portal/Webhook/Test Clock設定
- [ ] Preview Cloudflare secret/envとkill switch初期値
- [ ] Preview deploy対象commit/build artifact
- [ ] 実Provider Preview smokeが必要な場合だけ、OpenAI test用Project/keyおよびAzure read-only確認を別承認

**完了条件:** test/Previewだけが構成され、live/production設定・deploy・activationは未変更。

### Task 11: Local/Preview統合QA

**Ownership:** Gate 0で承認済みのtest mode/Previewとfixtureだけ。live/productionは対象外。

**Entry:** `Gate 0 overall -> Task 11`を維持する。JP免税表示・US Checkout・Stripe Tax安全仕様の実装、Preview反映、再検証が完了するまでは`entry=false`であり、Gate 0-A単独完了からTask 11 entryを推定しない。

- [ ] 新規focused tax/Checkout policy contractでcanonical JA/EN copy、US-only kill switch、dual tax attestation、boolean adapter、Portal/既存Subscription非影響、Monitoring運用、in-flight residual、州/住所非永続化をRED→GREENで確認する。
- [ ] `COMMENT_TRANSLATOR_PAID_US_CHECKOUT_ENABLED`、`COMMENT_TRANSLATOR_PAID_AUTOMATIC_TAX_ENABLED`、`COMMENT_TRANSLATOR_PAID_TAX_REGISTRATION_READY`をstrict literalとして確認し、tax false/ready falseと両方true以外をCustomer/hold/Session前にfail closedする。
- [ ] US switchのfalse/missing/invalidがUS新規Checkoutだけを停止し、JPと既存Subscription/entitlement/Portal/cancel pathへ影響しないことを確認する。
- [ ] Stripe Tax Monitoringの5分類、最大7日遅延、threshold exceeded待ち禁止、`approaching`以降でUS全体の新規Checkout停止をrunbook/operator contractで確認する。

- [ ] 全focused contractを実行する。
- [ ] `npm run lint`、`npx tsc --noEmit --pretty false`、`npm run build`を実行する。
- [ ] Stripe test mode/Test ClockでCheckout成功、決済失敗、3D Secure、Subscription作成、renewal、payment failure、cancel at period end、period end、refund、dispute、Customer Portal、entitlement付与/停止/復元、30分hold、7日枠保持を確認する。
- [ ] owner二重Checkout、hold/Session 1:1、Stripe idempotency、30分expiry、expiry対completion、hold→active、21枠目、課金済み未付与、二重Subscriptionをfixtureで確認する。
- [ ] Checkout Session作成成功直後のDB失敗、Stripe response消失、DB binding前Webhook、Session expire要求失敗、同一idempotency keyによるSession回収、binding後owner/lifecycle変更拒否、DB commit前URL非返却を確認する。
- [ ] 全非終端billing状態からのCheckout拒否と、`past_due`/`unpaid`からCustomer Portalだけを返すことを確認する。
- [ ] 7日後cancel、遅延`invoice.paid`、現在/過去periodの一部/全額refundを決定表どおり確認する。
- [ ] `subscription.created`/`invoice.paid`/`checkout.session.completed`の各先行順序で最初のSubscription bindingが作成またはretryableへ収束することを確認する。
- [ ] duplicate/out-of-order/retrieval failure/binding mismatch、同時claim、stale lease、receipt直後/projection途中/complete直前crashを確認する。
- [ ] Webhook欠落かつ利用者アクセスなし、duplicate `past_due`で7日起点不変、`active`復旧後の新しいpayment failure、Cron同時実行、Cron途中停止、stale reconcile lease、7日後cancel失敗→次回成功、原価period切替reconcile不能→後続復旧を確認する。
- [ ] dispute利用者勝訴の即時停止/cancel/確認後解放/失敗reconciliationと、運営勝訴の条件付き復元を確認する。
- [ ] OpenAI/Azure fixtureで`openai_attempt`と`azure_direct_fallback`、degraded直行、timeout slot保持、全fallback matrix、microbatch partial failure、subset retry、durable slot/session lease、RPM/TPM backpressure、cost reservationを確認する。
- [ ] JA→EN、EN→JA、KO→JA/EN、ZH→JA/EN、500 input code points近傍、URL/絵文字/固有名詞で、request hard limitとitem 1,000 code points超過/retryを確認する。128 tokensはitem計画予算として原価fixtureを照合する。
- [ ] Supabase local/isolated環境でRLS、RPC原子性、cleanup、bounded reconciler claim、120秒lease、backoffを確認する。
- [ ] Supabaseに20 sessionの3時間/日、24時間再開、1 comment/分、空poll、同一hourのOpenAI+Azureを流し、RPC latency、DB size/index、Egress/Realtimeが60% gate内であることを確認する。
- [ ] Azure fixtureで600,000文字余白、strict不等号、F=59許可/F=60停止、Free優先を確認する。
- [ ] Cloudflare 115,200 requests/日のfixtureで80/90/95% stopとclient poll停止を確認する。
- [ ] width QAとbrowser console/networkのsanitized状態を確認する。
- [ ] 実diff、変更ファイル、secret scan、`git diff --check`をrootが確認する。
- [ ] `sol-reviewer`へread-onlyレビューを依頼する。仕様不一致があれば、実装時に利用可能性を再確認した`sol-repairer`へ列挙済み修正だけを限定委譲する。利用不可なら代替せずblockedにする。

**完了条件:** test mode/fixtureで受入条件が通り、live未確認範囲が明記されている。

### Gate 1: live / production設定の個別承認

T11完了後、以下を一括承認とみなさず、対象・値の非開示・rollbackを示して個別承認を得る。このGateはproduction deployまたはPaid activationの承認を含まない。

- [ ] production Supabase migration apply、reconciler/cleanup RPC、既存Supabase Cron設定。利用不可時だけ既存production Cloudflare Cronを代替とし、単一scheduler、間隔、実行上限、監視、rollbackを個別確認
- [ ] Stripe live Product/Price/Tax/Coupon/Portal/Webhook設定
- [ ] OpenAI専用Project/key/実RPM・TPM・spend limit作成と、20人公称負荷+30%余白の確認
- [ ] Azure F0/共有resource全用途usage確認、600,000文字余白、strict不等号、tier変更なし
- [ ] production Cloudflare secret/env、request budget、kill switch初期値

**完了条件:** live/production設定だけが準備され、source deploy、Checkout公開、Paid Provider activationは未実施。

### Task 12: production dark deploy・live無課金readiness

**Ownership:** 承認済みの外部操作だけ。

- [ ] production deploy対象commit SHAとbuild artifactの別承認を得てdark deployする。
- [ ] `checkout_enabled=false`、`paid_translation_enabled=false`、`openai_enabled=false`、`azure_fallback_enabled=false`で利用者にPaidを公開しない。
- [ ] live Product/Price `tax_behavior`/tax code、Webhook endpoint/signing secret存在、Portal、Production URL、env存在をsanitized readで確認する。
- [ ] Stripe test mode evidenceでCheckout Session作成、画面遷移、expiry、hold cleanupが通っていることを再確認する。live Sessionは作成しない。
- [ ] JP/US/unknown countryの本番ゲートをsanitized結果だけで確認する。
- [ ] production routeの設定値、kill switch、region gateをread-onlyで確認し、public Checkout actionまたはoperator bypassを呼ばない。
- [ ] liveで自己課金・試験購入を行わない。Stripe test mode/Test Clock evidenceを公開判定へ用いる。
- [ ] capacity=20、US$25/US$3、Azure20万文字、Cloudflare daily budget、全kill switchをreadiness packetへ固定する。
- [ ] rollbackでdark deploy前artifactへ戻せることを確認する。

**完了条件:** production codeはdark deploy済みだがPaidは無効で、無課金readinessとrollback evidenceが揃っている。

### Gate 2: Paid activation / 公開の個別承認

- [ ] dark deploy commit SHA、T11、Gate 1、Task 12 evidenceを提示する。
- [ ] Checkout、Paid translation、OpenAI、条件付きAzure fallbackの各ON値を明示する。
- [ ] activation時刻、監視担当、kill/rollback手順を提示し、production deployとは別に承認を得る。

### Task 13: 先着20名アーリーアクセスactivation

**Ownership:** Gate 2で承認されたactivationと公開だけ。

- [ ] 承認された順序でProvider、Paid translation、Checkoutを有効化する。
- [ ] 受付開始後は20枠を自動拡大しない。
- [ ] incident時はkill switchで新規Checkout/Provider/active pollを段階停止する。
- [ ] 最初の実顧客の正常購入を監視し、signed webhookからentitlement、Provider、usage表示までsanitized evidenceで確認する。
- [ ] 最初の実顧客へcancel等の試験操作を依頼しない。Portal/cancelはtest modeで閉じる。
- [ ] 最初の実顧客が自発的にPortalへ進む場合は導線到達だけ監視し、解約・支払い方法変更を要求しない。

**完了条件:** 無課金live readinessとtest modeのライフサイクルproofが揃って公開され、最初の実顧客以降を監視できる。最初の実顧客がまだいないこと自体は公開開始のblockerにしない。

### Task 14: 最初の実Paid成立から35日評価と枠拡大判断

- [ ] 最初の有効な実顧客Paid Subscription成立日時を評価開始点として記録する。
- [ ] 最低1回の正常な実renewalを観測する。
- [ ] payment failure、cancel、period end、disputeは公開前Test Clock evidenceを再確認し、自然発生を待たない。
- [ ] 仕様書19章の終了判定を集計する。
- [ ] 実Stripe手数料、実OpenAI原価、実Azure fallback文字数、Cloudflare/Supabase実使用量を照合する。
- [ ] 失敗原価、fallback、5xx、latency、quotaの傾向を確認する。
- [ ] 20枠拡大、価格、割引継続、infra有料化をそれぞれ別判断にする。
- [ ] 35日待機は枠拡大だけをgateし、コードレビュー、実装PR、別ツール開発をblockしない。

**完了条件:** 人数上限を維持するか、別承認で拡大するかを証拠付きで決定する。

## 4. 推奨PR分割

| PR | 内容 | 外部mutation |
| --- | --- | --- |
| PR1 | Free baseline・旧Paid隔離 | なし |
| PR2 | Supabase schema/RPC/store adapters | remote applyなし |
| PR3 | Stripe webhook・durable entitlement | test fixtureのみ |
| PR4 | capacity・region・consent・Checkout policy | Stripe test modeのみ |
| PR5 | billing-period usage/cost reservations | なし |
| PR6 | OpenAI adapter・circuit・Azure fallback | fixtureのみ |
| PR7 | session integration | fixture/localのみ |
| PR8 | Billing/Translator UI | local/Preview QA |
| PR9 | retention・observability・legal/runbook | remote cronなし |
| PR10 | integration reconciliation | source変更は修正のみ |

PR mergeとPreview/production deployを同一承認にしない。

## 5. Rollback原則

- Checkoutだけ停止して既存Paidを維持できる。
- OpenAIだけ停止して、許可された一時障害時にだけAzureへ切替できる。
- Paid翻訳全体を停止してFreeを維持できる。
- DB migrationは既存Free table/columnを破壊せずadditiveにする。
- rollback時もStripe Subscriptionを勝手に解約・返金しない。
- entitlement projectionが不明な間はPaid Providerを呼ばない。
- schema rollbackより先にapp kill switchと互換readerで安全化する。

## 6. Solレビューで重点確認してほしい点

1. 支払総額US$6・USD・JP免税表示・US新規Checkout停止・Stripe Taxの境界に矛盾がないか。
2. 20枠のactive/7日hold/30分holdがrace-freeか。
3. Webhook順序逆転・重複・Checkout redirectの権限境界が十分か。
4. billing period quotaとUTC calendar cost/fallback bucketの混同がないか。
5. OpenAI失敗分類とAzure fallbackがpolicy refusalやcost capを迂回しないか。
6. sanitized本文を含む24時間feed snapshotと、他台帳への本文非複製がLegal/Privacyを含め一致しているか。
7. FreeのAzure枠・既存session/OAuth/UIがPaid導入で退行しないか。
8. 追加固定費なしという前提に隠れた有料サービスがないか。
9. live設定・migration・deploy・公開の承認ゲートが分離されているか。
10. PR分割が各時点でFreeを安全に利用可能な状態に保つか。
