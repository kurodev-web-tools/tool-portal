# Comment Translator Paid Core v1 Task 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 固定済みのFree baselineを維持し、現行mainに残る旧Paid-shaped billing表示・runtimeが承認済みPaid Core v1へ混入しないよう、durable Paid実装接続までfail-closedのunavailable境界へ隔離する。

**Architecture:** 既存のFree session/usage/provider経路は変更せず、server-only billing boundaryをFree-onlyの安全な読み取りへ戻す。Checkout、Portal、Webhook、旧Paid entitlementは新しいdurable authorityが接続されるまで実行せず、browser-safe viewはFree baselineとPaid unavailableだけを返す。Free entitlement baselineはbilling入力が欠落・未設定・読取不能でもFreeへ安全に収束する。

**Tech Stack:** Next.js server-only TypeScript runtime、既存のNode contract scripts、TypeScript compiler、ESLint、Next.js build。

---

### Task 1: Free/Paid boundary contractをREDへ更新

**Files:**
- Modify: `scripts/comment-translator-stripe-paid-plan-integration-contract.mjs`
- Modify: `scripts/comment-translator-public-entitlement-baseline-contract.mjs`

- [ ] 旧JPY月額・年額、旧plan name、memory `Map` entitlement、署名Webhookによる旧Paid付与の期待を削除し、旧経路が新仕様の権威ではないことをassertする。
- [ ] configured/missing Stripe env、Checkout/Portal adapter、Webhook入力のすべてがPaid unavailableまたはFree-onlyへ収束する期待を書く。
- [ ] Freeの30分/日、30分/session、30件/分、1同時session、20,000 provider-input characters/month、Azure primaryの既存契約をRED対象へ含める。
- [ ] billing snapshotが未設定・Paid-shaped・読取不能でもFree baselineを返す期待を書く。

Run: `node scripts/comment-translator-stripe-paid-plan-integration-contract.mjs` and `node scripts/comment-translator-public-entitlement-baseline-contract.mjs`
Expected: FAIL against the current old Paid runtime.

### Task 2: 最小のserver-only boundary隔離

**Files:**
- Modify: `lib/comment-translator-billing-runtime.ts`
- Modify: `lib/comment-translator-public-entitlement-baseline.ts`

- [ ] in-memory Paid entitlement store、old plan options、JPY/yearly values、old product name、Stripe API executionを削除する。
- [ ] 既存import callerとの互換性を保ちながら、billing snapshotをFree-onlyへ固定し、checkout/portal/webhookを明示的なunavailable/rejectedへ収束する。
- [ ] browser-safe modelからPaid plan presentationを返さず、Free baselineとPaid unavailable statusだけを返す。
- [ ] baseline resolverのbilling入力をoptional/null-safeにし、durable usageが読める限りFreeを返す。durable usage自体のfail-closedは既存契約どおり維持する。

Run: the two focused contracts above.
Expected: PASS.

### Task 3: Free回帰と変更境界を確認

**Files:**
- No additional production files unless Task 1 contract evidence identifies a direct compatibility fix.

- [ ] Free entitlement/session/quota/Azure contractsを実行し、FreeのOAuth・YouTube polling・Azure translation・quota/session/feed/UIの呼び出し境界を壊していないことを確認する。
- [ ] `npm run lint`、`npx tsc --noEmit --pretty false`、`npm run build`、`git diff --check`、changed-file secret/private-identifier scanを実行する。
- [ ] 実diffと変更ファイルがTask 1のcontract/billing boundaryへ限定されていることを確認する。

### Task 4: reviewとPreview Draft PR

**Files:**
- No additional source changes during review.

- [ ] `sol-reviewer` read-only reviewを実行する。
- [ ] 仕様不一致が列挙された場合だけ、限定された修正を行い、rootでdiffとfocused checksを再確認する。
- [ ] Task branchをPreview baseへpushし、Preview向けDraft PRを作成する。mainへのpush/merge、deploy、external mutation、branch/worktree cleanupは行わない。
