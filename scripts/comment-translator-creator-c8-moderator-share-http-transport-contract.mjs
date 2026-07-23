import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const cookieModuleUrl = pathToFileURL(fileURLToPath(
  new URL("../lib/comment-translator-moderator-share-browser-session-cookie.ts", import.meta.url)
)).href;
const asModule = (source) => `data:text/javascript,${encodeURIComponent(source)}`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: asModule("export{}") };
    if (specifier === "next/server") {
      return {
        shortCircuit: true,
        url: asModule(`
          export const NextResponse = {
            redirect(url, status) {
              return {
                url: url.toString(), status, headers: new Map(),
                cookies: { values: [], set(...args) { this.values.push(args); } }
              };
            }
          };
        `)
      };
    }
    if (specifier === "@/lib/comment-translator-moderator-share-browser-session-cookie") {
      return { shortCircuit: true, url: cookieModuleUrl };
    }
    if (specifier === "@/lib/comment-translator-moderator-share-browser-session-runtime") {
      return {
        shortCircuit: true,
        url: asModule(`
          export async function redeemCommentTranslatorModeratorShareBrowserSession({ presentedToken }) {
            return presentedToken === "accepted-c7-credential"
              ? { status: "ready", capability: "c".repeat(43), expiresAtIso: "2026-07-23T07:00:00.000Z" }
              : { status: "unavailable", reason: "invalid-credential", retryable: false };
          }
        `)
      };
    }
    if (specifier === "@/lib/comment-translator-moderator-share-browser-session-store") {
      return { shortCircuit: true, url: asModule("export function createTrustedCommentTranslatorModeratorShareBrowserSessionStore(){return {}}") };
    }
    if (specifier === "@/lib/comment-translator-moderator-share-session-authority") {
      return { shortCircuit: true, url: asModule("export function createCommentTranslatorModeratorShareSessionAuthority(){return {}}") };
    }
    if (specifier === "@/lib/comment-translator-moderator-share-token-store") {
      return { shortCircuit: true, url: asModule("export function createTrustedCommentTranslatorModeratorShareTokenSupabaseStore(){return {status:'unavailable'}}") };
    }
    if (specifier === "@/lib/comment-translator-durable-session-store") {
      return { shortCircuit: true, url: asModule("export function createTrustedCommentTranslatorSessionSupabaseStore(){return {status:'unavailable'}}") };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = `${fileURLToPath(new URL(specifier, context.parentURL))}.ts`;
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: pathToFileURL(candidate).href };
    }
    return nextResolve(specifier, context);
  }
});

const route = await import("../app/api/comment-translator/moderator-share/session/route.ts");
assert.equal(typeof route.POST, "function");
for (const method of ["GET", "PUT", "PATCH", "DELETE"]) assert.equal(route[method], undefined);

const request = (credential) => ({
  url: "https://example.invalid/api/comment-translator/moderator-share/session/",
  async formData() { return new Map([["moderatorShareCredential", credential]]); }
});

const success = await route.POST(request("accepted-c7-credential"));
assert.equal(success.status, 303);
assert.equal(success.url, "https://example.invalid/tools/comment-translator/moderator/");
assert.equal(success.headers.get("Cache-Control"), "no-store");
assert.deepEqual(success.cookies.values[0], [
  "vst-comment-translator-moderator-share",
  "c".repeat(43),
  {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/tools/comment-translator/moderator/",
    expires: new Date("2026-07-23T07:00:00.000Z")
  }
]);

const failure = await route.POST(request("rejected"));
assert.equal(failure.status, 303);
assert.equal(failure.url, "https://example.invalid/tools/comment-translator/moderator/");
assert.equal(failure.cookies.values[0][0], "vst-comment-translator-moderator-share");
assert.equal(failure.cookies.values[0][1], "");
assert.equal(failure.cookies.values[0][2].maxAge, 0);
assert.equal(failure.cookies.values[0][2].httpOnly, true);
assert.equal(failure.cookies.values[0][2].secure, true);
assert.equal(failure.cookies.values[0][2].sameSite, "strict");

console.log("comment_translator_creator_c8_moderator_share_http_transport_contract=pass");
