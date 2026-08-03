# Comment Translator Creator NC-R1 Operator Checklist

## Purpose

この runbook は `docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md` の NO-GO evidence ledger を再確認し、将来の個別 approval 単位を失わないための checklist である。`docs/active/COMMENT_TRANSLATOR_CREATOR_NC_Q1_QA_AUTHORITY.md`、`docs/active/COMMENT_TRANSLATOR_CREATOR_NC_Q1_OPERATOR_CHECKLIST.md`、`docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_LEGACY_CROSSWALK.md` を authority input とする。NC-Q1 local matrix は local evidence のみであり、legacy 23 の integrity は継続して必要である。

```text
current_decision=no-go
activation_status=closed
source_max_age_days=7
source_freshness_timezone=Asia/Tokyo
no external operation is authorized by this checklist
```

記録は sanitized status、classification、count、approval ID、timestamp、exact target、reviewer、stop result に限る。秘密、private identifier、raw payload、browser-selected authority、query authority、configuration value を記録しない。

## Preconditions

- [ ] Current checkout の base を `codex/comment-translator-free-public-beta-integration`、integration tip を `16eb30f09ae19216eafc34e124ac12ab885dbe5e`、PR #747 final head を `df1a92f123d5cd3ec30b1d43e5eb0d0efacb6a71` と照合する。merge から deployment 成功を推測しない。
- [ ] `docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md` の status が `decision=no-go` と `activation_status=closed` のままであることを確認する。
- [ ] `node scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs` を実行し、decision が no-go、activation が closed、unresolved hard requirement が非零であることを確認する。
- [ ] NC-Q1 fixture/local evidence を production proof に扱わず、legacy crosswalk が exactly 23 rows であることを確認する。
- [ ] Free behavior の permanent boundary、signed subscription evidence only、redirect/completion non-evidence を確認する。
- [ ] Product/Price/tax/legal/copy/support/SLA/risk acceptance に approved decision がないことを record し、未承認を解消したと見なさない。

## Local Verification And Setup-Blocked

- [ ] `node_modules` が absent であるため、lint、strict typecheck、Next build、OpenNext build を `setup-blocked` と記録する。dependency installation はこの checklist で許可しない。
- [ ] exact local checkout の Worker bundle-size check は requested だが dependency prerequisite 不在のため `blocked` と記録する。公式の size plan limit を local bundle measurement に昇格させない。
- [ ] UI/CSS changes はないため、幅別 QA を N/A と記録し、passed と扱わない。
- [ ] dependency が不在の間は blocked class を維持する。install、manifest/lockfile change、class promotion、または再試行をこの runbook から実行しない。

## Read-Only Public Source Refresh

この単位で許可されるのは public official source の read-only freshness 確認だけである。`source_freshness_timezone=Asia/Tokyo` の current calendar date と `source_max_age_days=7` を適用し、age が 7 日を超える source、future-dated source、または日付なし source は stale/failure として止める。2026-08-04 の source ledger を参照し、再確認時は source ID、URL、timestamp、public-source class、production proof=no を記録する。public-source は plan limit/price だけであり、actual target measurement は `gated`、または prerequisite 不在なら `blocked` として別記録する。

- [ ] `SRC-WORKER-PRICING` と `SRC-WORKER-LIMITS` を確認し、Worker request、CPU、size の plan limit を account headroom に昇格させない。official `3 MB after compression` と `docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_ARCHITECTURE.md` の `3MiB` は同値と推測せず、target-mismatched gate を維持する。
- [ ] `SRC-SUPABASE-BILLING`、`SRC-SUPABASE-SIZE`、`SRC-SUPABASE-PAUSE` を確認し、size、egress、pause の plan information を exact target measurement に昇格させない。
- [ ] `SRC-AZURE-PRICING`、`SRC-AZURE-LIMITS`、`SRC-DEEPL-LIMITS`、`SRC-OPENAI-PRICING` を確認し、selected provider/model/account spend cap を推測しない。
- [ ] `SRC-STRIPE-JP` を確認し、public price を selected Product、Price、tax、live charge、or account cost proof に昇格させない。
- [ ] source が stale、unavailable、incomplete、or changed の場合、affected hard requirement を fail-closed に戻し current decision を NO-GO のままにする。

## Separately Approved Evidence Units

各行は independently approval-gated である。`unapproved` は操作禁止を意味し、この checklist は status を変更しない。

| Approval ID | Current status | Required future scope | Required sanitized result |
| --- | --- | --- | --- |
| APPROVAL-CLOUDFLARE-READ | unapproved | exact named target の Worker CPU/size/request measurement | target match、time、class/count、headroom decision、stop result |
| APPROVAL-WORKER-LIMIT-ALIGNMENT | unapproved | named authority で architecture `3MiB` と official `3 MB after compression` を reconcile | accepted byte boundary、decision owner、scope、stop result |
| APPROVAL-SUPABASE-READ | unapproved | exact named target の database size/egress/pause measurement | target match、time、class/count、pause/read-only class、stop result |
| APPROVAL-SUPABASE-BACKUP-RISK | unapproved | Free pause/no-downloadable-backup/no-SLA backup/recovery posture の named decision | release owner、accepted risk or upgrade decision、recovery stop path |
| APPROVAL-PROVIDER-READ | unapproved | selected provider/model の usage/cost evidence | selected target approval、time、cost class、stop result |
| APPROVAL-STRIPE-READ | unapproved | exact billing configuration/cost evidence | selected target approval、time、cost class、stop result |
| APPROVAL-LEGAL | unapproved | legal basis and tax review for the named release | decision owner、scope、effective date、residual risk |
| APPROVAL-COPY | unapproved | public billing and Creator copy review | approved copy identifier、scope、reviewer |
| APPROVAL-SUPPORT | unapproved | support ownership and escalation review | support owner、coverage scope、stop/escalation path |
| APPROVAL-SLA-RISK | unapproved | SLA position, cost envelope, and risk acceptance | release owner、accepted risks、expiry/review time |
| APPROVAL-LIVE-PAID-FLOW | unapproved | named non-public paid flow evidence | exact target/operation、signed entitlement result、Free fallback, stop result |
| APPROVAL-AUTH-BROWSER | unapproved | authenticated browser evidence for named safe target | exact target, surface, sanitized result, stop result |
| APPROVAL-DEPLOY | unapproved | deploy or deployed-target verification for named target | exact commit/target, result class, rollback result |
| APPROVAL-ACTIVATION | unapproved | activation change after all hard requirements are satisfied | exact gate, release owner decision, rollback owner |
| APPROVAL-PUBLIC-PAID-GATE | unapproved | public paid gate only after activation approval | exact public scope, release owner decision, rollback evidence |

Approval for one row does not approve another row. An approval record must state the exact target, operation, time window, operator, evidence retention location, stop owner, and rollback owner. If any field is absent, retain `unapproved` and do not run the operation.

## Release Owner Decisions

The release owner must make a named, timestamped decision only after the evidence ledger has no unresolved hard requirement. The following decisions are currently missing and cannot be inferred from engineering evidence.

| Decision area | Current state | Minimum later record |
| --- | --- | --- |
| Product and Price | missing | named Product/Price scope and owner |
| Tax and legal | missing | jurisdictional decision and legal owner |
| Public copy | missing | approved copy scope and reviewer |
| Support | missing | support owner, escalation and stop policy |
| SLA | missing | explicit service position and customer commitment |
| Cost envelope | incomplete | target-matched Worker/Supabase/provider/Stripe evidence |
| Worker size-limit alignment | target-mismatched | accepted byte boundary reconciling architecture `3MiB` and official `3 MB after compression` |
| Supabase backup/recovery posture | missing | named human acceptance or upgrade decision; no backup outcome inferred |
| Risk acceptance | missing | named release owner, accepted residual risk, review point |
| Live paid flow | missing | separately approved named-target evidence |
| Deployed target | missing | separately approved exact deployed-target evidence |

The required outcome before a later release-owner decision is not a tentative go: every hard requirement must be fresh, complete, target-matched, approved, and `satisfied`; all evidence must retain its class; and the decision record must include an explicit NO-GO or GO result. Until then all billing/provider/Creator/public activation gates remain fixed closed.

## Stop Conditions

Stop immediately, preserve Free behavior, retain activation closed, and record a sanitized stop result if any hard requirement is missing, stale, incomplete, target-mismatched, or unapproved; if architecture `3MiB` and official `3 MB after compression` lack an accepted byte boundary; if Free pause/no-downloadable-backup/no-SLA backup/recovery posture lacks a named decision; if a source page is substituted for account headroom; if an unapproved cost-bearing action would occur; if signed subscription evidence is not compatible; if redirect/completion is asserted as Paid evidence; if a target differs from the approval; if safe projection or owner/capability isolation fails; if a migration or activation drift appears; or if secret, private identifier, or raw payload exposure is possible.

Do not continue by changing the evidence class, relaxing a hard requirement, or calling the result conditional-go. Escalate only to the named owner of the exact missing approval unit.

## Rollback Packet

Current state requires no rollback execution because activation is closed. For any later individually approved change, prepare this packet before the operation:

- [ ] Exact target, approved operation, time window, operator, stop owner, rollback owner, and evidence retention location are named.
- [ ] Release owner confirms the applicable approval IDs and records the current evidence ledger snapshot.
- [ ] Free continuity, fixed closed fallback, and signed-subscription-only Paid rule are reconfirmed before the operation.
- [ ] Stop action is defined as closing the relevant paid/public entry gate and suppressing new Creator cost-bearing work; no change may weaken Free behavior.
- [ ] Result is classified only as `live` or `deployed` for the exact approved target and operation; fixture, local, public-source, redirect, or merge evidence is rejected as rollback proof.
- [ ] Any failed, incomplete, stale, or target-mismatched result returns the release record to NO-GO and leaves all activation gates closed.

## Go Or No-Go Record

```text
current_decision=no-go
reason=unresolved-hard-requirements
conditional-go=forbidden-while-hard-requirement-unresolved
activation_status=closed
release_owner_decision=missing
```

Current NC-R1 result is NO-GO. This checklist neither performs nor authorizes deployment, activation, public paid gating, external reads, external writes, migration, provider or billing operation, authenticated browser verification, dependency installation, or Git publication. A later GO is possible only through the separate approval units and a final named release-owner decision; it is not implied by this runbook.
