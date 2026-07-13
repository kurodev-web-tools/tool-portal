import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = "app/tools/comment-translator/about/page.tsx";

assert.ok(fs.existsSync(path.join(root, pagePath)), `${pagePath} exists`);

const pageSource = fs.readFileSync(path.join(root, pagePath), "utf8");

for (const requiredText of [
  "Kuro Live Comment Translator",
  "YouTubeライブコメントを翻訳する配信者向けツール",
  "利用者が明示的にStartを押した後だけ",
  "接続しただけでは、コメント取得、監視、翻訳、クォータ消費を開始しません。",
  "YouTubeへの書き込み、動画の変更、コメントの投稿や削除は行いません。",
  "youtube.readonly",
  'href="/privacy"',
  'href="/terms"',
  'href="/tools/comment-translator"'
]) {
  assert.ok(pageSource.includes(requiredText), `${pagePath} includes ${requiredText}`);
}

assert.match(pageSource, /export const dynamic = "force-static";/, "public information page is statically rendered");
assert.match(pageSource, /<h1[^>]*>[\s\S]*Kuro Live Comment Translator[\s\S]*<\/h1>/, "page has one explicit product heading");
assert.match(pageSource, /<h2[^>]*>[\s\S]*このツールについて[\s\S]*<\/h2>/, "page explains the app purpose under a descriptive heading");
assert.match(pageSource, /<h2[^>]*>[\s\S]*YouTubeデータの利用[\s\S]*<\/h2>/, "page explains YouTube data access under a descriptive heading");

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
