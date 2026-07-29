# Comment Translator Creator Tier Pricing Direction

## Status

この文書は、Creator paid初回launchのowner承認済み価格方向と、将来の2段階paid tier案を参照できる形で保持するためのfuture planning noteである。

初回launchの公開価格判断は記録するが、この文書自体はStripe Product / Price作成、private Price referenceの設定、Checkout / Portal / webhook、billing activation、deploy、公開launchの実行authorityではない。Creator Plusの金額・機能は将来検討用であり、提供または実装の確約ではない。

## Decision Summary

```text
price_architecture_decision=free-creator-creator-plus
price_scope_decision=monthly-only
initial_paid_tier_decision=creator
monthly_public_amount_jpy=980
creator_monthly_public_amount_jpy=980
creator_plus_monthly_target_jpy=1980
creator_plus_price_status=future-planning-only-not-approved-not-created
tier_differentiation_decision=usage-limits-and-features
tier_naming_decision=creator-and-creator-plus
initial_stripe_price_scope=creator-monthly-only
tax_display_decision=tax-inclusive-total-price-public-display
trial_decision=no-trial
annual_price_decision=deferred
discount_coupon_decision=none
decision_owner_approval_status=approved-in-task-for-initial-creator-direction
decision_status=PASS
stripe_remote_attempt_count=0
mutation_attempt_count=0
sensitive_output_count=0
```

## Initial Paid Launch: Creator

- Public monthly amount: **月額980円（税込）**
- Billing cadence: monthly-only
- Role: early closed-beta adoptionの摩擦を抑えながら、Freeより明確に高い利用枠とCreator向け機能を提供する最初のpaid tier
- Current repository intent:
  - paid usage limits
  - OBS display
  - moderator sharing
  - custom dictionary
  - priority display
  - seven-day history

上記機能はrepository上の現在のpaid scopeを整理したものであり、各機能のoperational readiness、billing activation、公開可否は既存のCreator paid readiness authorityに従う。価格判断だけで未完了gateを通過したものとして扱わない。

## Future Tier: Creator Plus

- Planning target: **月額1,980円（税込）**
- Status: future planning only / not approved / not created
- Role: Creatorの約2倍の価格帯で、より大きい利用枠と運用効率を高める機能をまとめる上位tier
- Candidate differentiation:
  - Creatorより高いdaily / session / message limits
  - 30-day history and search
  - CSV export
  - overlay templates
  - dictionary import and suggestions
  - future paid operations helpers

Creator Plusのexact limits、機能構成、提供時期は未決定である。実利用、provider cost、support負荷、Creator tierの利用状況を確認した後、別のowner decisionで確定する。

## Why Start Creator At 980 JPY

- 1,000円未満の分かりやすい価格で、初期closed-beta adoptionの摩擦を抑えやすい。
- 将来のCreator Plus 1,980円との間に約2倍の明確なprice ladderを作れる。
- 初回から1,200円以上に寄せるより、Creatorを基本paid tier、Creator Plusを高利用・高機能tierとして説明しやすい。
- 既存のfail-closed usage limitsを維持するため、価格判断によってprivate provider usageや未確認の利用分布を仮定する必要がない。
- Stripeでは既存Priceの金額変更ではなく新しいPriceへの切替が必要になるため、初回はone Price seamに合わせたCreator monthly-onlyに限定し、tier追加は別変更として扱う。

この判断はprivate usage distribution、conversion rate、revenue target、private provider cost、discount、annual priceを仮定していない。

## Naming

- Canonical tier names: `Creator` / `Creator Plus`
- `Creater`は誤記として使用しない。
- `Creator Pro`は現時点のcanonical nameではない。
- 現行runtime / UIに残る別のpaid product nameを変更する場合は、copy・runtime contract・billing metadataの影響を確認する別taskとする。

## Current Runtime Boundary

現行runtimeは、one configured paid Price referenceとFree / Paidの2状態を前提としている。Creator Plusを実際に導入するには、少なくとも次を別scopeで設計・承認する。

- multiple Price selection seam
- Creator / Creator Plusを区別するserver-owned entitlement
- tier別usage limitsとfeature gates
- Checkout / Portal / webhook reconciliation
- configuration binding
- migration / compatibility behavior
- browser QA、billing activation、deploy、public launch

初回Creator launchではこれらを先行実装せず、既存のFree / Paid entitlement shapeを維持する。

## Assumptions

```text
creator_plus_exact_limits_status=undecided
creator_plus_exact_features_status=candidates-only
creator_plus_launch_timing_status=undecided
private_usage_distribution_assumption=none
conversion_rate_assumption=none
private_provider_cost_assumption=none
revenue_target_assumption=none
```

## Re-evaluation Triggers

```text
price_re_evaluation_trigger=material-provider-cost-change-or-verified-headroom-failure
tier_re_evaluation_trigger=creator-usage-evidence-supports-distinct-high-usage-segment
feature_re_evaluation_trigger=creator-plus-candidate-features-reach-operational-readiness
tax_re_evaluation_trigger=applicable-japan-tax-display-requirement-change
runtime_re_evaluation_trigger=multiple-price-and-tiered-entitlement-design-approved
```

Creatorの980円を見直す場合も、既存Priceを上書きする前提にはせず、新Price、既存customerの扱い、表示価格、移行タイミングを1つのdecision unitとしてowner承認する。
