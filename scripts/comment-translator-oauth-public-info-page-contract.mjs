import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = "app/tools/comment-translator/about/page.tsx";
const legalContentPath = "lib/legal-content.ts";
const reviewPacketPath = "docs/active/COMMENT_TRANSLATOR_GOOGLE_OAUTH_REVIEW_RESPONSE_PACKET.md";

assert.ok(fs.existsSync(path.join(root, pagePath)), `${pagePath} exists`);
assert.ok(fs.existsSync(path.join(root, legalContentPath)), `${legalContentPath} exists`);
assert.ok(fs.existsSync(path.join(root, reviewPacketPath)), `${reviewPacketPath} exists`);

const pageSource = fs.readFileSync(path.join(root, pagePath), "utf8");
const legalContentSource = fs.readFileSync(path.join(root, legalContentPath), "utf8");
const reviewPacketSource = fs.readFileSync(path.join(root, reviewPacketPath), "utf8");

for (const requiredText of [
  "Kuro Live Comment Translator",
  "YouTubeライブコメントを翻訳する配信者向けツール",
  "利用者が明示的にStartを押した後だけ",
  "接続しただけでは、コメント取得、監視、翻訳、クォータ消費を開始しません。",
  "YouTubeへの書き込み、動画の変更、コメントの投稿や削除は行いません。",
  "youtube.readonly",
  'data-google-oauth-review-link="privacy-policy"',
  'href="/privacy"',
  'href="/terms"',
  'href="/tools/comment-translator"',
  'href="/account/integrations"',
  "Google側で許可したアクセス権は取り消しません",
  'href="https://support.google.com/accounts/answer/13533235?hl=ja"'
]) {
  assert.ok(pageSource.includes(requiredText), `${pagePath} includes ${requiredText}`);
}

assert.match(pageSource, /export const dynamic = "force-static";/, "public information page is statically rendered");
assert.match(pageSource, /<h1[^>]*>[\s\S]*Kuro Live Comment Translator[\s\S]*<\/h1>/, "page has one explicit product heading");
assert.match(pageSource, /<h2[^>]*>[\s\S]*このツールについて[\s\S]*<\/h2>/, "page explains the app purpose under a descriptive heading");
assert.match(pageSource, /<h2[^>]*>[\s\S]*YouTubeデータの利用[\s\S]*<\/h2>/, "page explains YouTube data access under a descriptive heading");
assert.match(pageSource, /<h2[^>]*>[\s\S]*YouTube連携の解除と[\s\S]*Googleアクセス権の取り消し[\s\S]*<\/h2>/, "page explains both application disconnect and Google-side access removal");
assert.match(pageSource, /className="whitespace-nowrap">Googleアクセス権の取り消し<\/span>/, "mobile heading keeps the Google access-removal phrase together");

for (const requiredLegalText of [
  "Kuro Stream Kit側のアカウント連携ページで切断",
  "Google側で許可したアクセス権は取り消しません",
  "Googleアカウントの「サードパーティとの接続」"
]) {
  assert.ok(legalContentSource.includes(requiredLegalText), `${legalContentPath} includes ${requiredLegalText}`);
}

for (const requiredPacketText of [
  "google_auth_verification_status=approved",
  "unverified_app_warning_status=not-observed-after-fresh-reconnect",
  "oauth_reconnect_verification_status=pass",
  "public_release_capable=no",
  "youtube.readonly",
  "/tools/comment-translator/about/",
  "/privacy/",
  "Trust & Safety返信文下書き",
  "メール受信後にのみ送信"
]) {
  assert.ok(reviewPacketSource.includes(requiredPacketText), `${reviewPacketPath} includes ${requiredPacketText}`);
}

for (const forbiddenDependency of [
  "getAccountSessionState",
  "supabase/session",
  "private-launch-access-gate",
  "startYouTube",
  "redirect("
]) {
  assert.doesNotMatch(pageSource, new RegExp(forbiddenDependency.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${pagePath} excludes ${forbiddenDependency}`);
}

console.log("comment translator OAuth public information page contract checks passed");
