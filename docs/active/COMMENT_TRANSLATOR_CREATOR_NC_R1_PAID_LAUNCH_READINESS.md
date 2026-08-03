# Comment Translator Creator NC-R1 Paid Launch Readiness

## Status

```text
lane=NC-R1
base=codex/comment-translator-free-public-beta-integration
base_merge_commit=16eb30f09ae19216eafc34e124ac12ab885dbe5e
base_final_head=df1a92f123d5cd3ec30b1d43e5eb0d0efacb6a71
base_deployment_status=not-confirmed
source_checked_at=2026-08-04
source_max_age_days=7
source_freshness_timezone=Asia/Tokyo
decision=no-go
activation_status=closed
release_owner_decision=missing
production_proof_status=incomplete
```

PR #747 の最終 head は上記 integration tip に merge 済みである。merge は deployment 成功の証跡ではないため、成功は未確認のままとする。

NC-R1 は release owner が later release decision を行うための fail-closed authority であり、gate を開く authority ではない。Free behavior remains permanent. all billing/provider/Creator/public activation gates remain fixed closed. only compatible signed subscription evidence may authorize Paid. Checkout redirect/completion is not Paid evidence.

参照 authority: `docs/active/COMMENT_TRANSLATOR_CREATOR_NC_Q1_QA_AUTHORITY.md`、`docs/active/COMMENT_TRANSLATOR_CREATOR_NC_Q1_OPERATOR_CHECKLIST.md`、`docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_LEGACY_CROSSWALK.md`。NC-Q1 の local matrix は local evidence としてだけ参照する。legacy は C1-C12、CP1-CP2、P1-1-P1-9 の exactly 23 rows を保持し、この文書はその完了または production 証明を主張しない。

## Evidence Class Contract

| Class | Meaning | Production/live readiness を証明できる範囲 |
| --- | --- | --- |
| `fixture` | deterministic fake input と in-process assertion | なし |
| `local` | この checkout の source、contract、local command の記録 | なし |
| `public-source` | 公式公開ページを read-only で確認した一般的な limit/price | account headroom、selected target、live/deployed state、release approval は証明しない |
| `gated` | 実行前に個別 approval が必要な証跡単位 | approval 前はなし |
| `blocked` | approval 済みだが prerequisite 不在で実行不能な check | prerequisite 解消前はなし |
| `live` | separately approved な named external target の sanitized result | その exact target と exact operation のみ |
| `deployed` | separately approved な named deployed target の sanitized result | その exact deployed target のみ |

fixture, local, and public-source evidence are not production proof. `gated`、`blocked`、`live`、`deployed` の間も相互に昇格しない。`public-source` は plan limit/price のみ、`gated` と `blocked` は actual evidence の class である。missing、stale、incomplete、target-mismatched、unapproved は hard requirement を fail-closed にし、別 class、merge、redirect、または一般公開情報から補完してはならない。

## Evidence Ledger

表の `target=exact` はこの read-only authority が記録する exact local target に限る。target の account headroom、configured product、external live state、deployed target を意味しない。

| Evidence ID | Class | Freshness | Target | Approval | Hard requirement | Production proof | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EVID-NC-Q1-FIXTURE | fixture | fresh | not-applicable | not-required | no | no | satisfied |
| EVID-NC-Q1-LOCAL | local | fresh | exact | not-required | no | no | satisfied |
| EVID-WORKER-SOURCE | public-source | fresh | not-applicable | not-required | no | no | satisfied |
| EVID-WORKER-CPU | gated | missing | missing | unapproved | yes | no | unapproved |
| EVID-WORKER-SIZE | blocked | missing | exact | approved | yes | no | incomplete |
| EVID-WORKER-SIZE-LIMIT-ALIGNMENT | gated | fresh | target-mismatched | unapproved | yes | no | target-mismatched |
| EVID-WORKER-REQUEST | gated | missing | missing | unapproved | yes | no | unapproved |
| EVID-SUPABASE-SOURCE | public-source | fresh | not-applicable | not-required | no | no | satisfied |
| EVID-SUPABASE-SIZE | gated | missing | missing | unapproved | yes | no | unapproved |
| EVID-SUPABASE-EGRESS | gated | missing | missing | unapproved | yes | no | unapproved |
| EVID-SUPABASE-PAUSE | gated | missing | missing | unapproved | yes | no | unapproved |
| EVID-SUPABASE-BACKUP | gated | missing | missing | unapproved | yes | no | missing |
| EVID-PROVIDER-SOURCE | public-source | fresh | not-applicable | not-required | no | no | satisfied |
| EVID-PROVIDER-COST | gated | missing | missing | unapproved | yes | no | unapproved |
| EVID-STRIPE-SOURCE | public-source | fresh | not-applicable | not-required | no | no | satisfied |
| EVID-STRIPE-COST | gated | missing | missing | unapproved | yes | no | unapproved |
| EVID-LEGAL | gated | missing | missing | unapproved | yes | no | missing |
| EVID-COPY | gated | missing | missing | unapproved | yes | no | missing |
| EVID-SUPPORT | gated | missing | missing | unapproved | yes | no | missing |
| EVID-SLA | gated | missing | missing | unapproved | yes | no | missing |
| EVID-ROLLBACK | local | fresh | exact | not-required | yes | no | satisfied |
| EVID-LIVE-PAID-FLOW | live | missing | missing | unapproved | yes | no | missing |
| EVID-DEPLOYED-TARGET | deployed | missing | missing | unapproved | yes | no | missing |

`EVID-WORKER-SIZE-LIMIT-ALIGNMENT` は `docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_ARCHITECTURE.md` の `3MiB` と `SRC-WORKER-LIMITS` の official public-source wording `3 MB after compression` を同値と推測しない hard gate である。headroom を satisfy する前に、named authority の explicit reconciliation と accepted byte boundary が必要である。

`EVID-SUPABASE-BACKUP` は同 architecture authority が記録する Free pause/no-downloadable-backup/no-SLA posture に対する human acceptance または upgrade decision の未決定 gate である。この row は backup の存在、不在、product selection、または recovery outcome を主張しない。

`EVID-ROLLBACK` は文書化済み safe-stop packet の local evidence に過ぎず、named release owner の risk acceptance、external gate approval、または rollback execution proof ではない。`EVID-NC-Q1-FIXTURE` と `EVID-NC-Q1-LOCAL` も同じく production proof ではない。

## Public Official Source Ledger

公開ページは 2026-08-04 に read-only で freshness 確認した。freshness は `source_freshness_timezone=Asia/Tokyo` の current calendar date で評価する。`source_max_age_days=7` を越えた source、future-dated source、または日付が欠ける source は stale/failure として fail-closed にする。ページは一般の plan limit/price を補助できるが、private account usage、selected target configuration、actual spend、headroom、live state、deployment、approval は示さない。

| Source ID | Official URL | Checked | Class | Production proof |
| --- | --- | --- | --- | --- |
| SRC-WORKER-PRICING | https://developers.cloudflare.com/workers/platform/pricing/ | 2026-08-04 | public-source | no |
| SRC-WORKER-LIMITS | https://developers.cloudflare.com/workers/platform/limits/ | 2026-08-04 | public-source | no |
| SRC-SUPABASE-BILLING | https://supabase.com/docs/guides/platform/billing-on-supabase | 2026-08-04 | public-source | no |
| SRC-SUPABASE-SIZE | https://supabase.com/docs/guides/platform/database-size | 2026-08-04 | public-source | no |
| SRC-SUPABASE-PAUSE | https://supabase.com/docs/guides/platform/free-project-pausing | 2026-08-04 | public-source | no |
| SRC-AZURE-PRICING | https://azure.microsoft.com/en-us/pricing/details/translator/ | 2026-08-04 | public-source | no |
| SRC-AZURE-LIMITS | https://learn.microsoft.com/en-us/azure/ai-services/translator/service-limits | 2026-08-04 | public-source | no |
| SRC-DEEPL-LIMITS | https://developers.deepl.com/docs/resources/usage-limits | 2026-08-04 | public-source | no |
| SRC-OPENAI-PRICING | https://developers.openai.com/api/docs/pricing | 2026-08-04 | public-source | no |
| SRC-STRIPE-JP | https://stripe.com/jp/pricing | 2026-08-04 | public-source | no |

## Supported Numeric Claims

次の行だけが今回の source refresh で許可される numeric observation である。unsupported-numeric-claim=forbidden. public-source-is-not-account-headroom-or-production-proof.

| Numeric ID | Observation | Source ID | Checked | Class | Production proof |
| --- | --- | --- | --- | --- | --- |
| NUM-WORKER-REQUEST | Workers Free: 100,000 requests/day | SRC-WORKER-PRICING | 2026-08-04 | public-source | no |
| NUM-WORKER-CPU | Workers Free: 10 ms CPU/invocation | SRC-WORKER-LIMITS | 2026-08-04 | public-source | no |
| NUM-WORKER-MEMORY | Workers Free: 128 MB memory | SRC-WORKER-LIMITS | 2026-08-04 | public-source | no |
| NUM-WORKER-SUBREQUEST | Workers Free: 50 subrequests/invocation | SRC-WORKER-LIMITS | 2026-08-04 | public-source | no |
| NUM-WORKER-SIZE | Workers Free: 3 MB after compression | SRC-WORKER-LIMITS | 2026-08-04 | public-source | no |
| NUM-SUPABASE-ACTIVE | Supabase Free: 2 active projects | SRC-SUPABASE-BILLING | 2026-08-04 | public-source | no |
| NUM-SUPABASE-SIZE | Supabase Free: 500 MB database/project | SRC-SUPABASE-SIZE | 2026-08-04 | public-source | no |
| NUM-SUPABASE-EGRESS | Supabase Free: 5 GB egress | SRC-SUPABASE-BILLING | 2026-08-04 | public-source | no |
| NUM-SUPABASE-STORAGE | Supabase Free: 1 GB storage | SRC-SUPABASE-BILLING | 2026-08-04 | public-source | no |
| NUM-SUPABASE-MAU | Supabase Free: 50,000 MAU | SRC-SUPABASE-BILLING | 2026-08-04 | public-source | no |
| NUM-SUPABASE-READONLY | Supabase database over 500 MB enters read-only | SRC-SUPABASE-SIZE | 2026-08-04 | public-source | no |
| NUM-SUPABASE-PAUSE | Low-activity Supabase Free projects may pause after a 7-day window | SRC-SUPABASE-PAUSE | 2026-08-04 | public-source | no |
| NUM-AZURE-MONTHLY | Azure Translator F0: 2 million characters/month | SRC-AZURE-PRICING | 2026-08-04 | public-source | no |
| NUM-AZURE-HOURLY | Azure Translator service limit: 2 million characters/hour | SRC-AZURE-LIMITS | 2026-08-04 | public-source | no |
| NUM-DEEPL-MONTHLY | DeepL API Free: 500,000 characters/month | SRC-DEEPL-LIMITS | 2026-08-04 | public-source | no |
| NUM-STRIPE-DOMESTIC | Stripe Japan domestic card successful charge: 3.6% | SRC-STRIPE-JP | 2026-08-04 | public-source | no |
| NUM-STRIPE-BILLING | Stripe Billing: 0.7% of Billing volume | SRC-STRIPE-JP | 2026-08-04 | public-source | no |

OpenAI pricing is model/token based. The repository-selected model and account spend cap are missing and unapproved; this document makes no numeric inference for either. Provider and Stripe public prices do not establish an approved Product, Price, tax treatment, revenue model, or cost envelope.

## Local Verification And Setup-Blocked

`node_modules` is absent in this checkout. Dependency installation was not performed and is not authorized by this authority. Therefore lint, strict typecheck, Next build, and OpenNext build are `setup-blocked`, not passed and not failed product checks. The local Worker bundle-size measurement requested for this exact checkout is likewise `blocked`: its target is exact and the local check was requested, but its dependency prerequisite is absent. This is the sole `EVID-WORKER-SIZE` class rationale; the public Worker size limit remains only a `public-source` numeric observation.

UI/CSS changes are absent, so width-based QA is N/A rather than passed. No blocked local check may be promoted to `local`, `live`, `deployed`, or production proof, and no dependency install is implied by recording its blocked state.

## Headroom Measurement Contract

Release eligibility requires separately approved, target-matched, fresh, sanitized measurements before a release owner may evaluate cost headroom. Required measurements are Worker CPU, Worker size, Worker requests, Worker size-limit authority alignment, Supabase database size, Supabase egress, Supabase pause state, Supabase backup/recovery posture, selected provider consumption/cost, and Stripe cost configuration. A public plan limit is a ceiling description, not a measurement of remaining capacity. An unapproved actual target measurement remains `gated`; an approved local measurement with an unavailable prerequisite remains `blocked`.

Every future measurement record must identify its exact target, collection time, evidence class, approval unit, observed class/count only, reviewer, and stop result. It must omit secrets, private identifiers, raw payloads, browser-selected authority, and configuration values. Missing target identity, stale timestamp, incomplete collection, mismatched target, or absent approval is a NO-GO result for the affected hard requirement.

## Risk Acceptance

Product/Price/tax/legal/copy/support/SLA/risk acceptance are not inferred. No Product decision, Price, tax treatment, legal basis, public copy, support commitment, SLA, cost envelope, or risk acceptance is approved by this authority.

A later release-owner decision is eligible only after all hard requirements in the evidence ledger are `satisfied` with the required exact target, freshness, approval, and class; required public sources are refreshed; the named release owner records every accepted residual risk; and separate live/deployed evidence proves only its named operation. This eligibility statement does not authorize any operation or change the current decision.

## Go Or No-Go Decision

```text
decision=no-go
conditional-go=forbidden-while-hard-requirement-unresolved
activation_status=closed
release_owner_decision=missing
unresolved_hard_requirements=EVID-WORKER-CPU,EVID-WORKER-SIZE,EVID-WORKER-SIZE-LIMIT-ALIGNMENT,EVID-WORKER-REQUEST,EVID-SUPABASE-SIZE,EVID-SUPABASE-EGRESS,EVID-SUPABASE-PAUSE,EVID-SUPABASE-BACKUP,EVID-PROVIDER-COST,EVID-STRIPE-COST,EVID-LEGAL,EVID-COPY,EVID-SUPPORT,EVID-SLA,EVID-LIVE-PAID-FLOW,EVID-DEPLOYED-TARGET
```

Current decision is **NO-GO**. It is not a conditional-go because unresolved hard requirements remain. Public source observations and NC-Q1 fixture/local success do not reduce this result. The existing Free behavior stays available under its own permanent boundary; this readiness authority grants no Paid path.

## Rollback And Stop Conditions

The current safe state is activation closed, so no external rollback action is needed or authorized. For a separately approved later operation, the rollback packet must name the target, authorized operator, stop owner, approval ID, evidence retention location, and exact Free-continuity result before any gate change.

Stop immediately and retain activation closed when any of the following occurs: a hard requirement is missing, stale, incomplete, target-mismatched, or unapproved; the architecture `3MiB` and official `3 MB after compression` Worker size authority lack an explicit accepted byte boundary; the Supabase backup/recovery posture lacks human acceptance or upgrade decision; exact headroom is unavailable or outside the accepted envelope; a cost-bearing operation lacks approval; signed entitlement is missing, incompatible, unreadable, inactive, ambiguous, stale, replayed, or incomplete; a redirect is presented as Paid evidence; an external target differs from its evidence; a safe projection boundary fails; an unapproved migration or gate drift is detected; or a secret, private identifier, or raw payload would enter evidence.

The later rollback action, if individually approved, is to close the relevant paid/public entry gate, suppress new Creator cost-bearing work, preserve Free behavior, retain only sanitized evidence, and record the result as `live` or `deployed` only for its exact approved target. It must not use a general source page, fixture, local run, or redirect as rollback proof.

## Non-Claims

- This document does not prove account headroom, selected configuration, live account status, production browser behavior, deployed binding/state, deployment success, or public paid readiness.
- It does not authorize authenticated dashboard/account/private quota reads, remote Supabase work, live provider or Stripe operation, browser smoke, deploy, activation, public gate change, migration, dependency installation, or any Git publication action.
- It does not alter Free behavior, runtime, data schema, configuration, or previously rejected runtime alternatives.
- It records only sanitized classification and decision evidence; it contains no credentials, private identifiers, raw payloads, browser persistence authority, query authority, logs, or configuration values.
