# TASK_HISTORY_2026-06

このファイルは 2026-06 時点の Kuro Live Comment Translator preview branch の履歴アーカイブ。active board は `task.md` に残し、ここには完了済み経緯、確認済み blocker、今後参照しそうな安全境界だけを残す。

## Kuro Live Comment Translator Preview Branch

- preview branch: `codex/comment-translator-preview`
- latest confirmed preview head for this cleanup: PR #313 merge commit `aea6934e8f82ef4505cc4fc7b9a2000edca6b5ee`
- user decision: 初回 platform は YouTube。実際に使える翻訳ツールになるまで `main` へ統合しない。
- security boundary: secret / service_role key / private credential、OAuth access token / refresh token / authorization code value、ciphertext、decrypt capability は client、fixture、docs、PR body、browser storage に出さない。
- storage boundary: localStorage / IndexedDB / sessionStorage / existing handoff payload は明示タスクなしに変更しない。

## Phase Summary

1. Manual / mock / provider boundary foundation
   - mock foundation、interactive shell、Manual / Paste Input MVP、Translation provider boundary design、Server-side translation prototype を preview branch へ積み上げた。
   - `MockTranslationProvider` と manual / paste flow は live provider 接続なしで保持。
   - contract anchors: comment translator provider boundary contract、comment translator YouTube input boundary contract。

2. YouTube input / runtime / token reference design
   - YouTube input boundary design、owner polling runtime foundation、Google API adapter + token reference resolver design を追加。
   - token resolver は `credentialReferenceId` を server-side reference として扱い、token value は返さない。
   - safe live Google API smoke、safe live YouTube login / OAuth / owner verification / Live Chat polling smoke は未実施。

3. OAuth token store approval gates
   - PR #271: YouTube encrypted token store implementation plan / blocker resolution。
   - PR #272: YouTube encrypted token store schema/key approval checkpoint。
   - PR #273: YouTube encrypted token store approved migration proposal gate。
   - PR #274: YouTube encrypted token store explicit approval collection。
   - PR #275: separate approved migration readiness。Product owner / Data owner / Security owner の readiness は揃ったが migration implementation approval ではない。
   - PR #277 以降: table/RLS/key-management/rollback review と explicit implementation approval を blocker として追跡。
   - PR #288: separate implementation slice として SQL migration、RLS policy、server-only token persistence runtime skeleton を扱ったが、remote Supabase DB apply、safe live smoke、refresh / revocation runtime は未実施。

4. Credential status server boundary
   - PR #289 - #293: token store implementation skeleton、trusted Supabase adapter / sanitized status boundary、credential status endpoint / server action skeleton、trusted service-role status wiring、credential status owner authorization。
   - client-readable status metadata は `available` / `reconnect-required` / `unavailable` / `credential-resolution-disabled` のみに閉じる。
   - owner authorization before status read と `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` rollback boundary を維持。

5. Credential status display readiness gates
   - PR #294: credential status UI wiring contract。
   - PR #295: credential status display wiring readiness。
   - PR #296: approved client-safe credential reference source readiness。
   - PR #297: approved-source definition-only blocker。
   - PR #298: surfaced credential reference source gate。
   - PR #299: source-surfacing approval gate。
   - PR #300: credential source approval evidence。
   - PR #301 - #313: source/evidence recheck gates。PR #302 以降は Cloudflare Pages FAILURE / Workers Builds SUCCESS が継続し、local build は各 slice で PASS したため、source/evidence blocker と分離して扱った。

## Current Blockers Archived From Task Board

- `/tools/comment-translator` に surfaced できる existing approved client-safe `credentialReferenceId` source は page / dock / mock snapshot / handoff payload にまだ無い。
- その source に紐づく source-surfacing explicit approval evidence もまだ無い。
- そのため YouTube credential status display UI wiring、status action の UI 呼び出し、新規 client payload source、localStorage、IndexedDB、sessionStorage、existing handoff payload は実装しない。
- 新規 client payload source が必要な場合も、payload 実装前に explicit source-surfacing approval evidence が必要。
- source と evidence が揃った場合でも、readiness を記録する PR と実 UI wiring PR は分ける。
- token store は final table/RLS/key-management/rollback review と explicit implementation approval が揃うまで remote migration apply / live credential runtime へ進めない。

## Verification Notes

- PR #312 post-merge review sliceでは、`node scripts/comment-translator-youtube-credential-reference-surface-source-recheck-contract.mjs` を RED -> GREEN で確認。
- source/evidence gate bundle、token-store status contract、existing YouTube token store contract bundle、translator boundary contracts、`npm run lint`、`npx tsc --noEmit`、`npm run build`、`git diff --check` は各 review slice で確認済み。
- fresh worktree で `@supabase/supabase-js` missing が出た場合は `npm ci` が必要。
- `git diff --check` の CRLF conversion warning は既知ノイズ。exit code と whitespace error の有無で判断する。
- UI / rendered text / CSS を触らない docs / contract-only slice では `/tools/comment-translator` の `390 / 820 / 1024 / 1280 / 1366px` 幅別確認は不要。

## Remaining Order

1. credential source decision: existing source / evidence があるか確認する。
2. source approval: 新規 client payload source が必要なら payload 実装前に explicit approval evidence を取る。
3. readiness-only PR: source / evidence が揃ったことだけを記録する。
4. credential status display UI wiring PR: sanitized metadata only で実装する。
5. token-store implementation approvals: final table/RLS/key-management/rollback review と explicit implementation approval を解消する。
6. Supabase migration / RLS / server-only token persistence runtime。
7. safe live OAuth / owner verification / Live Chat polling smoke。
8. translation provider、glossary、usage limits、moderation、billing / quota、main integration readiness。
