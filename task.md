# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR body か `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 作業前に `git fetch origin --prune`、`AGENTS.md`、このファイルを確認する。
- 意味のある実装後は、このファイルに実装内容、検証、未確認範囲、残リスク、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- URL 設計、大規模 i18n framework、保存 schema / IndexedDB / localStorage 既存 key / handoff payload、外部投稿連携は、個別タスクで明示されない限り変更しない。
- 1 feature / 1 fix / 1 cleanup を 1 branch / 1 PR に閉じる。公開版の緊急修正と次期機能追加は混ぜない。
- secret / service_role key / private credential は要求・表示・保存しない。
- OAuth access token / refresh token / authorization code value は client component、fixture、docs、PR body、localStorage、IndexedDB、sessionStorage に出さない。

## Active Priorities

1. Kuro Live Comment Translator preview branch
   - status: `codex/comment-translator-preview` は PR #319 (`[codex] Record source surfacing approval evidence`) merge 済み。latest preview head 確認時点: `9b0e1977c1efde0ef9e04b5889fd1fb992c052c4`。
   - current blocker: new client payload `credentialReferenceId` source implementation はこの PR で contract-first に追加済み。credential status display UI wiring は payload source implementation merge 後の別 PR 条件。
   - hard stop: この PR が merge するまで YouTube credential status display UI wiring、status action の UI 呼び出し、localStorage、IndexedDB、sessionStorage、existing handoff payload 変更へ進まない。
   - current source boundary: client-readable output は opaque non-secret `credentialReferenceId` と sanitized credential status metadata のみ。status は `available` / `reconnect-required` / `unavailable` / `credential-resolution-disabled` のみに閉じる。
   - current server boundary: `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED`、owner authorization before status read、no token value logging、unusable credential reference revoke / invalidate rollback boundary を維持する。
   - latest local review result: PR #319 merge commit `9b0e1977c1efde0ef9e04b5889fd1fb992c052c4` が preview-derived branch に含まれることを確認した。`new-client-payload-credentialReferenceId-source` を client-safe / sanitized metadata only の source implementation として追加し、display UI wiring はこの PR では行わない。
   - Cloudflare checks note: PR #302 以降は Cloudflare Pages FAILURE / Workers Builds SUCCESS が継続。local build が通る slice では base history 由来の可能性を分離し、Cloudflare dashboard log は未確認範囲に残す。
   - immediate next condition: この payload source implementation PR の merge 後、別 PR で credential status display UI wiring readiness を再確認する。実 display UI wiring はさらに別 PR 条件として切る。
   - next PR candidate: `comment-translator-credential-status-display-readiness-after-payload-source`。PR #319 前提と payload source implementation merge 前提を確認し、display UI wiring 本実装に進む前の readiness を記録する。
   - out of scope for source decision PR: UI wiring、new client payload implementation、localStorage / IndexedDB / sessionStorage / handoff payload 変更、remote Supabase DB migration apply、Google API live call、safe live YouTube OAuth smoke、refresh runtime、full revocation runtime、provider coupling、quota write、billing integration、main integration。
   - remaining route after source decision:
     1. payload source implementation merge 後、別 PR で credential status display UI wiring readiness を再確認する。
     2. readiness merge 後、別 PR で credential status display UI wiring を行う。
     3. status action の UI 呼び出しを sanitized metadata only で接続する。
     4. token store final table/RLS/key-management/rollback review と explicit implementation approval を解消する。
     5. Supabase migration / RLS / server-only token persistence runtime を別 PR で実装する。
     6. YouTube OAuth / owner verification / Live Chat polling safe smoke を段階的に確認する。
     7. translation provider selection、glossary、usage limits、moderation skip rules、billing / quota を別 PR 群で進める。
   - task-board cleanup completed 2026-06-03:
     - branch: `codex/comment-translator-task-board-cleanup` -> base `codex/comment-translator-preview`。
     - implementation: `task.md` を active board / next order / next-session prompt / contract compatibility anchors に整理し、完了済みの詳細履歴を `docs/archive/TASK_HISTORY_2026-06.md` へ移動した。
     - contract maintenance: archive 追加に合わせ、comment-translator source/evidence gate と token-store gate の changed-file allowlist に `docs/archive/TASK_HISTORY_2026-06.md` を追加した。
     - verification: source/evidence gate bundle、credential status UI wiring contract、token-store status contract、existing YouTube token store contract bundle、translator boundary contracts、`node scripts/tool-portal-entry-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`npm run build`、`git diff --check` PASS。
     - UI / rendered text / CSS は変更していない。docs と contract allowlist の整理のみのため、`/tools/comment-translator` の `390 / 820 / 1024 / 1280 / 1366px` 幅別確認は不要。
     - 未確認範囲: Cloudflare Pages dashboard log、remote Supabase DB apply、safe live service_role status read smoke、safe live YouTube OAuth / owner verification / Live Chat polling smoke、Google API live call、refresh runtime、full revocation runtime、実 credentialReferenceId client payload wiring、実 credential status display wiring。
     - 残リスク: `task.md` には古い contract 向け互換アンカーを残している。将来 contract が archive も読む形に更新できたら、このアンカー section はさらに縮小できる。
   - source decision completed 2026-06-03:
     - branch: `codex/comment-translator-credential-source-decision` -> base `codex/comment-translator-preview`。
     - merge-state: PR #314 merge commit `324e51ad718c5d31b7d0768ebcfed6258c43dd4f` が preview-derived branch に含まれることを確認した。
     - decision: existing approved client-safe source definition はあるが、`/tools/comment-translator` page / `CommentTranslatorDock` / existing handoff payload に surfaced `credentialReferenceId` source は無い。source に紐づく explicit source-surfacing approval evidence も display wiring に使える形では揃っていない。
     - blocker summary: `blocked-pr314-source-decision-missing-surfaced-source-or-approval-evidence`。この PR では UI wiring、status action の UI 呼び出し、新規 client payload source、storage / handoff payload 変更へ進まない。
     - next PR condition: 新規 client payload source が必要なら、payload 実装前に explicit source-surfacing approval evidence を取る。source と evidence が揃った場合も、readiness-only PR を挟み、実 credential status display UI wiring は別 PR に切る。
     - UI / rendered text / CSS は変更していない。contract / boundary / task board の source decision のみのため、`/tools/comment-translator` の `390 / 820 / 1024 / 1280 / 1366px` 幅別確認は不要。
     - 未確認範囲: Cloudflare Pages dashboard log、remote Supabase DB apply、safe live service_role status read smoke、safe live YouTube OAuth / owner verification / Live Chat polling smoke、Google API live call、refresh runtime、full revocation runtime、実 credentialReferenceId client payload wiring、実 credential status display wiring。
     - 検証: source decision contract は RED (`reference source module exports the PR #314 source decision gate type` assertion failure) -> GREEN。`node scripts/comment-translator-youtube-credential-source-decision-contract.mjs`、source/evidence gate bundle、credential status UI wiring contract、token-store status contract、existing YouTube token store contract bundle、translator boundary contracts、`node scripts/tool-portal-entry-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`npm run build`、`git diff --check` PASS。`git diff --check` は既知の CRLF conversion warning のみ。`node scripts/static-export-rsc-aliases.mjs --check` は build 前後とも `out directory is missing` で FAIL。今回の `npm run build` は server-runtime build として exit 0 で、postbuild は `out directory is missing for server-runtime build` として skip。
   - source-surfacing approval evidence requirement completed 2026-06-03:
     - branch: `codex/comment-translator-source-surfacing-approval-evidence` -> base `codex/comment-translator-preview`。
     - merge-state: PR #315 merge commit `8fb6df6e20149dd83e8204c1a17a937c2d7497ee` が preview-derived branch に含まれることを確認した。
     - implementation: `lib/comment-translator-youtube-client-safe-credential-reference-source.ts` に新規 client payload source 用の explicit approval evidence requirement type / helper を contract-only で追加した。新規 client payload source、status display UI wiring、storage / handoff payload 変更は追加していない。
     - blocker / approval-evidence summary: `blocked-pr315-new-client-payload-source-missing-explicit-approval-evidence`。既存 approved client-safe source と explicit source-surfacing approval evidence が両方揃うまでは、status action UI 呼び出しや display wiring へ進まない。
     - explicit approval evidence shape: approver role、approval statement、target source、target surface、target boundary を必須にする。対象 source は `new-client-payload-credentialReferenceId-source`、対象 surface は `/tools/comment-translator`、boundary は `credentialReferenceId` と sanitized status metadata のみ、no localStorage / IndexedDB / sessionStorage / existing handoff payload change、owner authorization と `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` 維持、readiness-only / not display UI wiring。
     - next PR condition: 承認者/承認文言/対象 source/surface/boundary の explicit evidence が揃った場合も、まず readiness-only に留める。実 credential status display UI wiring と新規 payload source implementation は別 PR 条件に切る。
     - UI / rendered text / CSS は変更していない。contract / boundary / task board の approval evidence requirement のみのため、`/tools/comment-translator` の `390 / 820 / 1024 / 1280 / 1366px` 幅別確認は不要。
     - 未確認範囲: Cloudflare Pages dashboard log、remote Supabase DB apply、safe live service_role status read smoke、safe live YouTube OAuth / owner verification / Live Chat polling smoke、Google API live call、refresh runtime、full revocation runtime、実 credentialReferenceId client payload wiring、実 credential status display wiring。
     - 残リスク: explicit approval evidence はまだ無い。今回の helper は evidence shape と blocker 条件を固定するだけで、承認取得や payload source 実装を行わない。
     - 検証: `node scripts/comment-translator-youtube-credential-source-decision-contract.mjs` は RED (`reference source module exports the new client payload source approval evidence requirement type` assertion failure) -> GREEN。`node scripts/comment-translator-youtube-credential-reference-surface-source-recheck-contract.mjs`、`node scripts/comment-translator-youtube-credential-reference-surface-approval-evidence-contract.mjs`、`node scripts/comment-translator-youtube-surfaced-credential-reference-source-gate-contract.mjs`、`node scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs`、`node scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs`、`node scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs`、existing YouTube token store contract bundle、translator boundary contracts、`node scripts/tool-portal-entry-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`npm run build`、`git diff --check` PASS。fresh worktree では `node_modules` 不在により Supabase adapter status contract が一度 `Cannot find module '@supabase/supabase-js'` で止まったため、`npm ci` を実行して再検証した。`git diff --check` は既知の LF -> CRLF warning のみ。`npm run build` は exit 0、postbuild は `out directory is missing for server-runtime build` として static export RSC aliases を skip。
   - source-surfacing approval evidence collection / readiness-only completed 2026-06-04:
     - branch: `codex/comment-translator-source-surfacing-approval-evidence-collection` -> base `codex/comment-translator-preview`。
     - merge-state: PR #316 merge commit `1adf68b47d418c2127c45aeb5d13269b2a82ece6` が preview-derived branch に含まれることを確認した。
     - implementation: `lib/comment-translator-youtube-client-safe-credential-reference-source.ts` に PR #316 後の source-surfacing approval evidence collection / readiness-only helper を contract-only で追加した。新規 client payload source、status display UI wiring、storage / handoff payload 変更は追加していない。
     - blocker / approval-evidence summary: `blocked-pr316-source-surfacing-approval-evidence-not-collected`。新規 client payload source に進むには、承認者 role、承認文言、対象 source、対象 surface、対象 boundary を含む explicit approval evidence が必要。
     - explicit approval evidence shape: approver role、approval statement、target source、target surface、target boundary。対象 source は `new-client-payload-credentialReferenceId-source`、対象 surface は `/tools/comment-translator`、boundary は `credentialReferenceId` と sanitized status metadata のみ、no localStorage / IndexedDB / sessionStorage / existing handoff payload change、owner authorization と `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` 維持、readiness-only / not display UI wiring。
     - next PR condition: explicit evidence が揃った場合も、まず readiness-only に留める。実 credential status display UI wiring と新規 payload source implementation は別 PR 条件に切る。
     - UI / rendered text / CSS は変更していない。contract / boundary / task board の approval evidence collection 判定のみのため、`/tools/comment-translator` の `390 / 820 / 1024 / 1280 / 1366px` 幅別確認は不要。
     - 未確認範囲: Cloudflare Pages dashboard log、remote Supabase DB apply、safe live service_role status read smoke、safe live YouTube OAuth / owner verification / Live Chat polling smoke、Google API live call、refresh runtime、full revocation runtime、実 credentialReferenceId client payload wiring、実 credential status display wiring。
     - 残リスク: explicit approval evidence はまだ無い。今回の helper は evidence collection の blocker 条件と readiness-only の出口を固定するだけで、承認取得や payload source 実装を行わない。
     - 検証: `node scripts/comment-translator-youtube-credential-source-decision-contract.mjs` は RED (`reference source module exports the PR #316 source-surfacing approval evidence collection readiness type` assertion failure) -> GREEN。`node scripts/comment-translator-youtube-credential-reference-surface-source-recheck-contract.mjs`、`node scripts/comment-translator-youtube-credential-reference-surface-approval-evidence-contract.mjs`、`node scripts/comment-translator-youtube-surfaced-credential-reference-source-gate-contract.mjs`、`node scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs`、`node scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs`、`node scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs`、existing YouTube token store contract bundle、translator boundary contracts、`node scripts/tool-portal-entry-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`npm run build`、`git diff --check` PASS。fresh worktree では `node_modules` 不在のため `npm ci` を実行した。`git diff --check` は既知の LF -> CRLF warning のみ。`npm run build` は exit 0、postbuild は `out directory is missing for server-runtime build` として static export RSC aliases を skip。
   - source-surfacing approval evidence readiness / post-PR #317 recheck completed 2026-06-04:
     - branch: `codex/comment-translator-source-surfacing-approval-evidence-readiness` -> base `codex/comment-translator-preview`。
     - merge-state: PR #317 merge commit `8c5c4c3ed5b38a1cb667e520125bf1469dce6b5b` が preview-derived branch に含まれることを確認した。
     - implementation: `lib/comment-translator-youtube-client-safe-credential-reference-source.ts` に PR #317 後の source-surfacing approval evidence readiness helper を contract-only で追加した。新規 client payload source、status display UI wiring、storage / handoff payload 変更は追加していない。
     - blocker / approval-evidence summary: `blocked-pr317-source-surfacing-approval-evidence-readiness-missing-explicit-evidence`。新規 client payload source に進むには、approver role、approval statement、target source、target surface、target boundary を含む explicit source-surfacing approval evidence が必要。
     - explicit approval evidence shape: approver role、approval statement、target source、target surface、target boundary。対象 source は `new-client-payload-credentialReferenceId-source`、対象 surface は `/tools/comment-translator`、boundary は `credentialReferenceId` と sanitized status metadata のみ、no localStorage / IndexedDB / sessionStorage / existing handoff payload change、owner authorization と `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` 維持、readiness-only / not display UI wiring。
     - next PR condition: explicit evidence が揃った場合も、まず readiness-only に留める。実 credential status display UI wiring と新規 payload source implementation は別 PR 条件に切る。
     - UI / rendered text / CSS は変更していない。contract / boundary / task board の source-surfacing approval evidence readiness 判定のみのため、`/tools/comment-translator` の `390 / 820 / 1024 / 1280 / 1366px` 幅別確認は不要。
     - 未確認範囲: Cloudflare Pages dashboard log、remote Supabase DB apply、safe live service_role status read smoke、safe live YouTube OAuth / owner verification / Live Chat polling smoke、Google API live call、refresh runtime、full revocation runtime、実 credentialReferenceId client payload wiring、実 credential status display wiring。
     - 残リスク: explicit approval evidence はまだ無い。今回の helper は readiness の blocker 条件と readiness-only の出口を固定するだけで、承認取得や payload source 実装を行わない。
     - 検証: `node scripts/comment-translator-youtube-credential-source-decision-contract.mjs` は RED (`reference source module exports the PR #317 source-surfacing approval evidence readiness type` assertion failure) -> GREEN。`node scripts/comment-translator-youtube-credential-reference-surface-source-recheck-contract.mjs`、`node scripts/comment-translator-youtube-credential-reference-surface-approval-evidence-contract.mjs`、`node scripts/comment-translator-youtube-surfaced-credential-reference-source-gate-contract.mjs`、`node scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs`、`node scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs`、`node scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs`、existing YouTube token store contract bundle、translator boundary contracts、`node scripts/tool-portal-entry-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`npm run build`、`git diff --check` PASS。fresh worktree では `node_modules` 不在のため `npm ci --prefer-offline` を実行した。`git diff --check` は既知の LF -> CRLF warning のみ。`npm run build` は exit 0、postbuild は `out directory is missing for server-runtime build` として static export RSC aliases を skip。
   - explicit source-surfacing approval evidence readiness completed 2026-06-04:
     - branch: `codex/comment-translator-source-surfacing-explicit-approval-evidence` -> base `codex/comment-translator-preview`。
     - merge-state: PR #318 merge commit `1412791c5f3e5af3bf56f399ac692cfd1715962c` が preview-derived branch に含まれることを確認した。
     - approval evidence: 承認者はこのスレッドで「承認する」と明示したユーザー。approver role は `authorized-product-or-security-owner`。approval statement は `/tools/comment-translator` に向けた `new-client-payload-credentialReferenceId-source` を、実装前の source-surfacing approval evidence として承認するものとして扱う。
     - target boundary: target source は `new-client-payload-credentialReferenceId-source`、target surface は `/tools/comment-translator`。client-readable output は opaque non-secret `credentialReferenceId` と sanitized credential status metadata のみ。status は `available` / `reconnect-required` / `unavailable` / `credential-resolution-disabled` のみに閉じる。
     - preserved boundaries: localStorage / IndexedDB / sessionStorage / existing handoff payload は変更しない。owner authorization と `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` は維持する。service_role key 値、managed secret value、OAuth access token / refresh token / authorization code value は要求・表示・保存しない。
     - implementation: `lib/comment-translator-youtube-client-safe-credential-reference-source.ts` に PR #318 後の explicit source-surfacing approval evidence readiness helper を contract-only で追加した。今回の承認 evidence は readiness-only として記録し、new client payload source implementation、credential status display UI wiring、storage / handoff payload 変更は追加していない。
     - next PR condition: PR #318 merge 後、別 PR で new client payload source implementation を行う。実 credential status display UI wiring はその PR の merge 後にさらに別 PR 条件として切る。
     - UI / rendered text / CSS は変更していない。contract / boundary / task board の explicit approval evidence readiness 記録のみのため、`/tools/comment-translator` の `390 / 820 / 1024 / 1280 / 1366px` 幅別確認は不要。
     - 未確認範囲: Cloudflare Pages dashboard log、remote Supabase DB apply、safe live service_role status read smoke、safe live YouTube OAuth / owner verification / Live Chat polling smoke、Google API live call、refresh runtime、full revocation runtime、実 credentialReferenceId client payload source implementation、実 credential status display wiring。
     - 残リスク: approval evidence は readiness-only であり、payload source implementation と display UI wiring はまだ未実装。Cloudflare Pages FAILURE は Pages 接続解除待ちの既知ノイズとして分離し、Workers Builds と local verification を優先する。
     - 検証: source-surfacing explicit approval evidence readiness contract は RED (`reference source module exports the PR #318 explicit source-surfacing approval evidence readiness type` assertion failure) -> GREEN。`node scripts/comment-translator-youtube-credential-source-decision-contract.mjs`、`node scripts/comment-translator-youtube-credential-reference-surface-source-recheck-contract.mjs`、`node scripts/comment-translator-youtube-credential-reference-surface-approval-evidence-contract.mjs`、`node scripts/comment-translator-youtube-surfaced-credential-reference-source-gate-contract.mjs`、`node scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs`、`node scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs`、`node scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs`、existing YouTube token store contract bundle、translator boundary contracts、`node scripts/tool-portal-entry-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`npm run build`、`git diff --check` PASS。fresh worktree では `node_modules` 不足により Supabase adapter status contract が一度 `Cannot find module '@supabase/supabase-js'` で止まったため、`npm ci --prefer-offline` を実行して再検証した。`git diff --check` は既知の LF -> CRLF warning のみ。`npm run build` は exit 0、postbuild は `out directory is missing for server-runtime build` として static export RSC aliases を skip。
   - new client payload credentialReferenceId source implementation completed 2026-06-04:
     - branch: `codex/comment-translator-new-client-payload-credential-reference-source` -> base `codex/comment-translator-preview`。
     - merge-state: PR #319 merge commit `9b0e1977c1efde0ef9e04b5889fd1fb992c052c4` が preview-derived branch に含まれることを確認した。
     - implementation: `lib/comment-translator-youtube-client-safe-credential-reference-source.ts` に `createYouTubeOAuthNewClientPayloadCredentialReferenceSource` と PR #319 後の implementation gate を追加した。client-readable output は opaque non-secret `credentialReferenceId` と sanitized credential status metadata のみに閉じる。
     - preserved boundaries: localStorage / IndexedDB / sessionStorage / existing handoff payload は変更しない。owner authorization と `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` は維持する。service_role key 値、managed secret value、OAuth access token / refresh token / authorization code value は要求・表示・保存しない。
     - next PR condition: payload source implementation merge 後、別 PR で credential status display UI wiring readiness を記録する。実 display UI wiring と status action の UI 呼び出しはさらに別 PR 条件として切る。
     - UI / rendered text / CSS は変更していない。client-safe boundary と contract / task board のみのため、`/tools/comment-translator` の `390 / 820 / 1024 / 1280 / 1366px` 幅別確認は不要。
     - 未確認範囲: Cloudflare Pages dashboard log、remote Supabase DB apply、safe live service_role status read smoke、safe live YouTube OAuth / owner verification / Live Chat polling smoke、Google API live call、refresh runtime、full revocation runtime、実 credential status display wiring。
     - 残リスク: new client payload source は boundary helper と contract として実装済みだが、表示 UI wiring と runtime UI 呼び出しは未接続。Cloudflare Pages FAILURE は Pages 接続解除待ちの既知ノイズとして分離し、Workers Builds と local verification を優先する。
     - 検証: new client payload credential reference source contract は RED (`reference source module exports the PR #319 new client payload source implementation type` assertion failure) -> GREEN。`node scripts/comment-translator-youtube-new-client-payload-credential-reference-source-contract.mjs`、`node scripts/comment-translator-youtube-credential-source-decision-contract.mjs`、`node scripts/comment-translator-youtube-credential-reference-surface-source-recheck-contract.mjs`、`node scripts/comment-translator-youtube-credential-reference-surface-approval-evidence-contract.mjs`、`node scripts/comment-translator-youtube-surfaced-credential-reference-source-gate-contract.mjs`、`node scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs`、`node scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs`、`node scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs`、existing YouTube token store contract bundle、translator boundary contracts、`node scripts/tool-portal-entry-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`npm run build`、`git diff --check` PASS。fresh worktree では `node_modules` 不足により Supabase adapter status contract が一度 `Cannot find module '@supabase/supabase-js'` で止まったため、`npm ci --prefer-offline` を実行して再検証した。`git diff --check` は既知の LF -> CRLF warning のみ。`npm run build` は exit 0、postbuild は `out directory is missing for server-runtime build` として static export RSC aliases を skip。

2. Analytics / consent later scope
   - status: legal foundation は main に統合済み。GA4 や cookie consent banner は未着手。
   - next condition: public analytics を入れる前に consent copy、tracking boundary、env flag、opt-out policy を決める。

3. Account / monetization later scope
   - status: account / preferences foundation、Supabase Auth first slice、auth recovery hardening、Turnstile CAPTCHA は main に統合済み。
   - next condition: paid plan / quota foundation は Checkout Sessions、Customer Portal、webhooks、server-authoritative quota を別 PR 群に分ける。

4. Thumbnail Editor later scope
   - status: IRIAM 1:1 / material / font expansion の主要履歴は archive へ移動済み。root checkout には thumbnail material contract 関連の別作業があるため、この branch では触らない。
   - next condition: 9:16 preset、crop、text / image layer schema、local font loading は別 branch で扱う。

## Recommended Roadmap

1. Comment Translator source decision: existing approved client-safe `credentialReferenceId` source と explicit source-surfacing approval evidence の有無を確定する。欠ける場合は blocker summary のみ。
2. Comment Translator source approval: 新規 client payload source が必要なら、payload 実装前に explicit approval evidence を取る。
3. Comment Translator credential status readiness: source と evidence が揃った場合だけ readiness を記録する。実 UI wiring はまだ行わない。
4. Comment Translator credential status display wiring: readiness PR merge 後に、sanitized metadata only で display wiring を行う。
5. Comment Translator token-store implementation: final table/RLS/key-management/rollback review と explicit implementation approval が揃ってから migration / RLS / server-only persistence runtime を進める。
6. Comment Translator YouTube runtime: safe live OAuth / owner verification / Live Chat polling を provider / quota と結合せずに確認する。
7. Comment Translator productization: translation provider selection、glossary、usage limits、moderation skip rules、billing / quota、main integration readiness を順に扱う。
8. Other tools: account / monetization、Thumbnail Editor、Schedule Calendar、SNS Split Image Maker は Comment Translator の安全境界を崩さない範囲で別 branch に分ける。

## Next Session Prompt

```text
D:/V_streamer_tools で作業してください。

目的:
Kuro Live Comment Translator の次タスクとして、PR #319 (`[codex] Record source surfacing approval evidence`) と new client payload `credentialReferenceId` source implementation PR の merge 状態を確認し、YouTube credential status display wiring 本実装に進む前の readiness を別 PR として記録してください。display UI wiring 本実装はこの PR では行わず、readiness PR merge 後の別 PR 条件に切ってください。

前提:
- main 直作業は禁止です。
- まず `git fetch origin --prune` を実行してください。
- AGENTS.md と task.md を確認してください。
- new client payload `credentialReferenceId` source implementation PR が `codex/comment-translator-preview` に merge 済みであることを確認してください。未mergeなら新規実装へ進まず review / CI / blocker summary を返してください。
- merge 済みなら `codex/comment-translator-preview` から新しい feature branch / worktree を切ってください。
- 推奨 branch: `codex/comment-translator-credential-status-display-readiness-after-payload-source`
- 推奨 worktree: `D:/V_streamer_tools/.worktrees/comment-translator-credential-status-display-readiness-after-payload-source`

scope:
- contract-first / merge-state-first で進める。
- `/tools/comment-translator` page、`CommentTranslatorDock`、mock snapshot、server action、route、token-store boundary、`lib/comment-translator-youtube-client-safe-credential-reference-source.ts`、`lib/comment-translator-youtube-credential-status-ui-wiring.ts`、handoff boundary を再確認する。
- PR #319 の explicit source-surfacing approval evidence と payload source implementation を前提に、credential status display UI wiring readiness を client-safe / sanitized metadata only で記録する。
- client-readable output は opaque non-secret `credentialReferenceId` と sanitized credential status metadata のみに閉じる。
- owner authorization と `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` を維持する。
- 実 display UI wiring はこの PR では行わず、readiness PR merge 後の別 PR 条件として切る。

Out of scope:
- YouTube credential status display UI wiring 本実装。
- new client payload source implementation の再実装。
- localStorage / IndexedDB / sessionStorage / existing handoff payload 変更。
- remote Supabase DB migration apply。
- Google API live call / safe live YouTube OAuth smoke。
- refresh runtime / full revocation runtime。
- provider coupling、quota write、billing integration、main integration。
- service_role key 値、managed secret value、OAuth access token / refresh token / authorization code value の要求・表示・保存。

検証:
- credential status display readiness after payload source contract を RED -> GREEN で確認する。
- `node scripts/comment-translator-youtube-credential-source-decision-contract.mjs`
- `node scripts/comment-translator-youtube-new-client-payload-credential-reference-source-contract.mjs`
- `node scripts/comment-translator-youtube-credential-reference-surface-source-recheck-contract.mjs`
- `node scripts/comment-translator-youtube-credential-reference-surface-approval-evidence-contract.mjs`
- `node scripts/comment-translator-youtube-surfaced-credential-reference-source-gate-contract.mjs`
- `node scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs`
- `node scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs`
- `node scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs`
- existing YouTube token store contract bundle
- translator boundary contracts
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- UI / rendered text / CSS を触った場合のみ `/tools/comment-translator` を `390 / 820 / 1024 / 1280 / 1366px` で確認し、結果を task.md に残す。

完了時:
- `task.md` に PR #319 merge 前提、readiness 内容、検証結果、未確認範囲、残リスク、次 PR 条件を記録してください。
- UI 変更なしの場合、幅別確認が不要な理由を `task.md` に残してください。
- 問題なければ commit / push / `codex/comment-translator-preview` 宛て draft PR 作成まで進めてください。
```

## Verification Baseline

docs / contract / boundary 変更時は、必要に応じて次を実行する。

- `node scripts/static-export-rsc-aliases.mjs --check`
- `node scripts/tool-portal-entry-contract.mjs`
- `node scripts/tool-handoff-contract.mjs`
- `node scripts/comment-translator-youtube-credential-reference-surface-source-recheck-contract.mjs`
- `node scripts/comment-translator-youtube-credential-reference-surface-approval-evidence-contract.mjs`
- `node scripts/comment-translator-youtube-surfaced-credential-reference-source-gate-contract.mjs`
- `node scripts/comment-translator-youtube-client-safe-credential-reference-source-contract.mjs`
- `node scripts/comment-translator-youtube-credential-status-ui-wiring-contract.mjs`
- `node scripts/comment-translator-youtube-token-store-supabase-adapter-status-contract.mjs`
- existing YouTube token store contract bundle
- translator boundary contracts
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`

UI / 表示文言 / CSS を触った場合のみ、幅別確認結果をこのファイルに残す。

## Contract Compatibility Anchors

この section は古い comment-translator contract が `task.md` だけを読むための短い索引。詳細ログは `docs/archive/TASK_HISTORY_2026-06.md` を参照する。

- comment translator provider boundary contract / comment translator YouTube input boundary contract は `codex/comment-translator-preview` へ merge 済み。
- YouTube owner verification + Live Chat polling runtime foundation contract は merge 済み。
- YouTube Google API adapter + token reference resolver design は merge 済み。safe live Google API smoke は未実施。safe live YouTube login / OAuth / owner verification / Live Chat polling smoke は未実施。
- YouTube OAuth token store + consent runtime foundation は merge 済み。safe live Google API smoke は未実施。
- PR #271 merge: YouTube encrypted token store implementation plan / blocker resolution。safe live Google API smoke は未実施。
- PR #272 merge: YouTube encrypted token store schema/key approval checkpoint。safe live Google API smoke は未実施。
- PR #273 merge: YouTube encrypted token store approved migration proposal。Product owner / Data owner / Security owner の明示承認はないため `blocked-missing-explicit-owner-approvals`。safe live Google API smoke は未実施。
- PR #274 merge: YouTube encrypted token store explicit approval collection。Product owner / Data owner / Security owner の明示承認は不足し `blocked-missing-explicit-owner-approvals`。UI変更なし。
- PR #275 merge: separate approved migration readiness / `readiness-approved-not-migration-implementation`。Product owner / Data owner / Security owner の明示承認は揃ったが migration implementation approval ではない。UI変更なし。
- PR #288 merge: YouTube encrypted token store separate implementation included SQL migration, RLS policy, server-only token persistence runtime skeleton. safe live YouTube login / OAuth and Supabase migration / RLS smoke は未実施。幅別確認は不要。
- PR #292 merge: credential status owner authorization。幅別確認は不要。
- PR #293 merge: credential status UI wiring contract。
- PR #295 merge: approved client-safe credential reference source。幅別確認は不要。
- PR #297 merge: surfaced approved client-safe credential reference source gate。幅別確認は不要。
- PR #299 merge: source-surfacing explicit approval evidence。幅別確認は不要。
- PR #300 merge commit `a4c272817bab3234eb7a360331c7b54ea419e1b9`。
- PR #301 merge commit `9b0a3e518262dee4058dca4154a888fe079f48cc`。
- PR #302 merge commit `7b08186833350e21814385fa7294e90c36b919de`。
- PR #303 merge commit `1c82713dbeea54ffe0990415618adbb5d8ee55b2`。
- PR #304 merge commit `3c4058768ff46954deaa1c5bbe15eb58328ba427`。
- PR #305 merge commit `78dd0f1edc43828e008285efda01b07ca6bd5053`。
- PR #306 merge commit `650917f72963bf82649ec39142e3c54f2db6bc4e`。
- PR #307 merge commit `3b1a76a8c6b7102bc9c640e9173d016d6a5343d5`。
- PR #308 merge commit `995261d714a1e01ae08fcdd52ed94c7f96720571`。
- PR #309 merge commit `265f5b5a635da35b5bdf70d85f6fc99e35330cb9`。
- PR #310 merge commit `27968bcf7e9e10e9a9b50d17bf81595d6d5e8601`。
- PR #311 merge commit `d57a21a9f2c705b541d48f1f4098d71cb31abdee`。
- PR #312 merge commit `05292e79bb5f8a6d9916c417f1e7fcb672ae5b6e`。
- post-PR #312 source/evidence review gate は blocker summary。幅別確認は不要。
- PR #314 merge commit `324e51ad718c5d31b7d0768ebcfed6258c43dd4f`。
- post-PR #314 source decision は blocker summary。幅別確認は不要。
- PR #315 merge commit `8fb6df6e20149dd83e8204c1a17a937c2d7497ee`。
- post-PR #315 source-surfacing approval evidence requirement は blocker / approval-evidence summary。幅別確認は不要。
- PR #316 merge commit `1adf68b47d418c2127c45aeb5d13269b2a82ece6`。
- post-PR #316 source-surfacing approval evidence collection / readiness-only は blocker / approval-evidence summary。幅別確認は不要。
- PR #317 merge commit `8c5c4c3ed5b38a1cb667e520125bf1469dce6b5b`。
- post-PR #317 source-surfacing approval evidence readiness は blocker / approval-evidence summary。幅別確認は不要。
- PR #318 merge commit `1412791c5f3e5af3bf56f399ac692cfd1715962c`。
- post-PR #318 explicit source-surfacing approval evidence readiness は readiness-only。幅別確認は不要。
- PR #319 merge commit `9b0e1977c1efde0ef9e04b5889fd1fb992c052c4`。
- post-PR #319 new client payload `credentialReferenceId` source implementation は client-safe / sanitized metadata only。幅別確認は不要。

## Completed / Archive Summary

- Comment Translator preview branch detailed history: `docs/archive/TASK_HISTORY_2026-06.md`
- Account / preferences foundation: PR #229 - #234。詳細は PR bodies と `docs/archive/TASK_HISTORY_2026-05.md` の P33。
- Auth production hardening: PR #250 - #253、PR #257 - #259。詳細は PR bodies と `docs/archive/TASK_HISTORY_2026-05.md` の P34 / P36。
- Legal foundation: PR #254。詳細は PR body と `docs/archive/TASK_HISTORY_2026-05.md` の P35。
- Thumbnail Editor IRIAM square preview branch: PR #200 - #220。詳細は PR bodies と `docs/archive/TASK_HISTORY_2026-05.md` の P30 / P31。
- Thumbnail Editor font expansion: PR #221 - #226。詳細は PR bodies と `docs/archive/TASK_HISTORY_2026-05.md` の P32。
- 2026-04 の履歴: `docs/archive/TASK_HISTORY_2026-04.md`
- 2026-05 の履歴: `docs/archive/TASK_HISTORY_2026-05.md`
- Schedule Calendar future tasks: `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md`
- Portal settings future direction: `docs/future/PORTAL_SETTINGS_FUTURE.md`
- Thumbnail Editor next PR scope: `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md`
- Thumbnail Editor usecase preset candidates: `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md`
- Thumbnail Editor font candidates: `docs/future/THUMBNAIL_EDITOR_FONT_CANDIDATES.md`
- Thumbnail Editor registered material expansion plan: `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_DECORATION_MATERIAL_CONTRACT.md`

## Backlog

- Comment Translator: YouTube OAuth / owner verification / Live Chat polling、translation provider selection、glossary terms、usage limits、short-lived logs、moderation skip rules、paid plan / quota integration。
- Thumbnail Editor: 9:16 preset、crop 仕様、text / image layer schema、local font loading、preset typography refinement。
- Account / monetization: password hardening dashboard alignment、preferences sync MVP、paid plan / quota foundation。
- Schedule Calendar: Google Calendar 連携、ログイン / サーバー同期、シリーズ一括編集、例外日、週間予定画像生成。
- SNS Split Image Maker: ZIP 出力、X 以外の比率、複数形式の大規模 export。
- EN / locale: 内部説明、debug 文、保存済みデータ本文、aria、Next metadata の動的 locale 切替。
