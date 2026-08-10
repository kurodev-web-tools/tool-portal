import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export{}" };
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = `${fileURLToPath(new URL(specifier, context.parentURL))}.ts`;
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: pathToFileURL(candidate).href };
    }
    return nextResolve(specifier, context);
  }
});

const root = process.cwd();
const templatePath = "lib/comment-translator-creator-obs-overlay-template.ts";
const routePath = "app/api/comment-translator/obs-overlay/session/route.ts";
const pagePath = "app/tools/comment-translator/overlay/page.tsx";
const componentPath = "components/comment-translator/CommentTranslatorObsOverlay.tsx";
const cssPath = "app/globals.css";

assert.ok(fs.existsSync(templatePath), "NC-X4 template reader module exists");
const template = await import(`../${templatePath}`);

const enumValues = template.commentTranslatorCreatorObsOverlayTemplateValues;
assert.deepEqual(enumValues, ["default", "compact", "high-contrast"], "NC-X4 keeps a closed template enum");
assert.equal(template.commentTranslatorCreatorObsOverlayTemplateDefault, "default");

const readTemplate = template.readCommentTranslatorCreatorObsOverlayTemplate;
assert.equal(typeof readTemplate, "function", "NC-X4 exposes a server template reader");
for (const value of [undefined, null, "", "unknown", "default;token", 1, {}, [], Symbol("malformed")]) {
  assert.equal(readTemplate(value), "default", `unknown/missing/malformed template falls back closed: ${String(value)}`);
}
assert.equal(readTemplate("default"), "default");
assert.equal(readTemplate("compact"), "compact");
assert.equal(readTemplate("high-contrast"), "high-contrast");
assert.equal(template.isCommentTranslatorCreatorObsOverlayTemplate("default"), true);
assert.equal(template.isCommentTranslatorCreatorObsOverlayTemplate("compact"), true);
assert.equal(template.isCommentTranslatorCreatorObsOverlayTemplate("high-contrast"), true);
assert.equal(template.isCommentTranslatorCreatorObsOverlayTemplate("invalid"), false);

const sessionExpiry = "2026-08-10T12:34:56.000Z";
const cookieOptions = template.createCommentTranslatorCreatorObsOverlayTemplateCookieOptions(sessionExpiry);
assert.equal(cookieOptions.httpOnly, true, "template preference is HttpOnly");
assert.equal(cookieOptions.secure, true, "template preference is Secure");
assert.equal(cookieOptions.sameSite, "strict", "template preference is SameSite Strict");
assert.equal(cookieOptions.path, "/tools/comment-translator/overlay/", "template preference is overlay-path scoped");
assert.equal(cookieOptions.expires.toISOString(), sessionExpiry, "template preference cannot outlive overlay session expiry");
const expiredCookieOptions = template.createExpiredCommentTranslatorCreatorObsOverlayTemplateCookieOptions();
assert.equal(expiredCookieOptions.maxAge, 0, "template preference expires on failure or closed route");
assert.equal(expiredCookieOptions.path, "/tools/comment-translator/overlay/");

const routeSource = read(routePath);
const pageSource = read(pagePath);
const componentSource = read(componentPath);
const cssSource = read(cssPath);

assert.match(routeSource, /request\.formData\(\)/, "NC-X4 validates the existing POST form");
assert.match(routeSource, /overlayCredential/, "existing token redemption field remains unchanged");
assert.match(routeSource, /overlayTemplate/, "NC-X4 reads the server-validated overlayTemplate field");
assert.match(routeSource, /readCommentTranslatorCreatorObsOverlayTemplate/, "POST uses the closed server parser");
assert.match(routeSource, /isCommentTranslatorCreatorObsOverlayTemplate/, "POST distinguishes valid enum values from fallback input");
assert.match(routeSource, /createCommentTranslatorCreatorObsOverlayTemplateCookieOptions/, "successful redemption writes the preference cookie");
assert.match(routeSource, /createExpiredCommentTranslatorCreatorObsOverlayTemplateCookieOptions/, "failed/closed redemption expires the preference cookie");
const readyBranch = extractBlockAfter(routeSource, 'if (result.status === "ready")');
const capabilityCookieWrite = readyBranch.body.indexOf("commentTranslatorCreatorObsOverlayBrowserSessionCookieName");
const preferenceCookieWrite = readyBranch.body.indexOf("commentTranslatorCreatorObsOverlayTemplateCookieName");
assert.ok(capabilityCookieWrite >= 0, "successful redemption writes the capability cookie inside the ready branch");
assert.ok(preferenceCookieWrite > capabilityCookieWrite, "successful redemption writes the validated preference cookie after the capability cookie");
assert.match(
  readyBranch.body,
  /response\.cookies\.set\(\s*commentTranslatorCreatorObsOverlayBrowserSessionCookieName,\s*result\.capability,\s*createCommentTranslatorCreatorObsOverlayBrowserSessionCookieOptions\(result\.expiresAtIso\)\s*\)/,
  "successful redemption binds the capability cookie to the redeemed capability and session expiry"
);
assert.match(
  readyBranch.body,
  /const overlayTemplate = isCommentTranslatorCreatorObsOverlayTemplate\(form\.overlayTemplate\)[\s\S]*response\.cookies\.set\(\s*commentTranslatorCreatorObsOverlayTemplateCookieName,\s*overlayTemplate,\s*createCommentTranslatorCreatorObsOverlayTemplateCookieOptions\(result\.expiresAtIso\)\s*\)/,
  "successful redemption writes only the validated preference with the session expiry"
);
const failedBranch = extractBlockAfter(routeSource, "else", readyBranch.endIndex);
assert.match(failedBranch.body, /^\s*expireOverlayCookies\(response\);\s*$/, "failed redemption calls the common cookie expiry path");
const closedRouteBranch = extractBlockAfter(routeSource, "if (isCommentTranslatorCreatorObsOverlayBrowserRouteClosed())");
assert.match(closedRouteBranch.body, /return redirectWithExpiredCapability\(overlayUrl\);/, "closed route delegates to the expiring redirect path");
const closedRedirectBody = extractBlockAfter(routeSource, "function redirectWithExpiredCapability");
assert.match(closedRedirectBody.body, /expireOverlayCookies\(response\);/, "closed-route redirect calls the common cookie expiry path");
const expireCookiesBody = extractBlockAfter(routeSource, "function expireOverlayCookies");
const expiredCapabilityCookie = expireCookiesBody.body.indexOf("commentTranslatorCreatorObsOverlayBrowserSessionCookieName");
const expiredPreferenceCookie = expireCookiesBody.body.indexOf("commentTranslatorCreatorObsOverlayTemplateCookieName");
assert.ok(expiredCapabilityCookie >= 0, "common expiry path expires the capability cookie");
assert.ok(expiredPreferenceCookie > expiredCapabilityCookie, "common expiry path expires the preference cookie after the capability cookie");
assert.match(
  expireCookiesBody.body,
  /response\.cookies\.set\(\s*commentTranslatorCreatorObsOverlayBrowserSessionCookieName,\s*"",\s*createExpiredCommentTranslatorCreatorObsOverlayBrowserSessionCookieOptions\(\)\s*\)/,
  "common expiry path uses the capability expiry options"
);
assert.match(
  expireCookiesBody.body,
  /response\.cookies\.set\(\s*commentTranslatorCreatorObsOverlayTemplateCookieName,\s*"",\s*createExpiredCommentTranslatorCreatorObsOverlayTemplateCookieOptions\(\)\s*\)/,
  "common expiry path uses the preference expiry options"
);
assert.ok(
  routeSource.indexOf("if (isCommentTranslatorCreatorObsOverlayBrowserRouteClosed())") < routeSource.indexOf("const browserSessionStoreResult"),
  "closed route gate runs before trusted store reads"
);
assert.match(routeSource, /NextResponse\.redirect\([^,]+, 303\)/, "redirect remains stable and token-free");
assert.doesNotMatch(routeSource, /searchParams|localStorage|sessionStorage|indexedDB|console\./, "route has no browser/query/log authority");

assert.match(pageSource, /cookies\(\)/, "page reads the server cookie only");
assert.match(pageSource, /commentTranslatorCreatorObsOverlayTemplateCookieName/, "page reads the overlay-path preference cookie");
assert.match(pageSource, /readCommentTranslatorCreatorObsOverlayTemplate/, "page parses preference server-side");
assert.match(pageSource, /template=/, "page passes the parsed enum to the component");
assert.doesNotMatch(pageSource, /searchParams|localStorage|sessionStorage|indexedDB|console\./, "page has no browser/query/log authority");

assert.match(componentSource, /template/, "component receives the closed template enum");
assert.match(componentSource, /readCommentTranslatorProjectedPriority/, "component retains NC-V1 priority projection");
for (const safeField of ["authorDisplayName", "authorLabel", "badgeLabel", "purchaseLabel", "translatedText", "originalText", "sourceAttributionLabel"]) {
  assert.match(componentSource, new RegExp(`row\\.${safeField}`), `component retains safe field: ${safeField}`);
}
for (const forbidden of ["ownerUserId", "sessionReferenceId", "liveChatId", "providerChannelId", "tokenDigest", "capabilityDigest", "rawProviderPayload", "rawComments", "providerTargetMetadata", "serverOnlyCursor", "localStorage", "sessionStorage", "indexedDB", "searchParams", "console\\."]) {
  assert.doesNotMatch(componentSource, new RegExp(forbidden, "i"), `component does not expose ${forbidden}`);
}

for (const marker of [
  ".comment-translator-obs-overlay-canvas",
  "background: transparent !important",
  ".comment-translator-obs-overlay-canvas[data-overlay-template=\"compact\"]",
  ".comment-translator-obs-overlay-canvas[data-overlay-template=\"high-contrast\"]",
  "overflow-wrap: anywhere"
]) {
  assert.match(cssSource, new RegExp(escapeRegExp(marker)), `NC-X4 CSS marker: ${marker}`);
}
assert.match(cssSource, /html:has\(\.comment-translator-obs-overlay-canvas\)[\s\S]*body:has\(\.comment-translator-obs-overlay-canvas\)[\s\S]*background: transparent !important/);
assert.match(cssSource, /data-overlay-template=\\?"compact\\?"[\s\S]*gap:/, "compact only changes density spacing");
assert.match(cssSource, /data-overlay-template=\\?"high-contrast\\?"[\s\S]*background:/, "high-contrast changes surface readability");
assertVariantCssProperties(
  cssSource,
  "compact",
  new Set(["padding", "gap", "font-size", "margin-top", "line-height"])
);
assertVariantCssProperties(
  cssSource,
  "high-contrast",
  new Set(["border-color", "background", "color"])
);
for (const forbiddenProperty of ["color", "background", "border-color"]) {
  assert.throws(
    () => assertVariantCssProperties(
      `${cssSource}\n.comment-translator-obs-overlay-canvas[data-overlay-template="compact"] { ${forbiddenProperty}: red; }`,
      "compact",
      new Set(["padding", "gap", "font-size", "margin-top", "line-height"])
    ),
    new RegExp(`compact CSS property remains in its approved boundary: ${forbiddenProperty}`),
    `compact rejects ${forbiddenProperty}`
  );
}
for (const forbiddenProperty of ["padding", "gap", "font-size", "margin-top", "line-height"]) {
  assert.throws(
    () => assertVariantCssProperties(
      `${cssSource}\n.comment-translator-obs-overlay-canvas[data-overlay-template="high-contrast"] { ${forbiddenProperty}: 1px; }`,
      "high-contrast",
      new Set(["border-color", "background", "color"])
    ),
    new RegExp(`high-contrast CSS property remains in its approved boundary: ${forbiddenProperty}`),
    `high-contrast rejects ${forbiddenProperty}`
  );
}

process.stdout.write("comment translator Creator NC-X4 overlay templates contract passed\n");

function read(relativePath) {
  return fs.readFileSync(`${root}/${relativePath}`, "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractBlockAfter(source, marker, fromIndex = 0) {
  const markerIndex = source.indexOf(marker, fromIndex);
  assert.ok(markerIndex >= 0, `source marker exists: ${marker}`);
  const openBraceIndex = source.indexOf("{", markerIndex + marker.length);
  assert.ok(openBraceIndex >= 0, `source marker opens a block: ${marker}`);
  let depth = 1;
  for (let index = openBraceIndex + 1; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      return { body: source.slice(openBraceIndex + 1, index), endIndex: index + 1 };
    }
  }
  assert.fail(`source marker has a balanced block: ${marker}`);
}

function assertVariantCssProperties(source, variant, allowedProperties) {
  const selectorMarker = `.comment-translator-obs-overlay-canvas[data-overlay-template="${variant}"]`;
  const rules = extractCssLeafRules(source).filter(({ selector }) => selector.includes(selectorMarker));
  assert.ok(rules.length > 0, `${variant} CSS rules exist`);
  const declarations = rules.flatMap(({ body }) => parseCssDeclarations(body));
  assert.ok(declarations.length > 0, `${variant} CSS rules contain declarations`);
  for (const property of declarations) {
    assert.ok(allowedProperties.has(property), `${variant} CSS property remains in its approved boundary: ${property}`);
  }
}

function extractCssLeafRules(source) {
  const rules = [];
  const commentFreeSource = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const leafRulePattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of commentFreeSource.matchAll(leafRulePattern)) {
    rules.push({ selector: match[1].trim(), body: match[2] });
  }
  return rules;
}

function parseCssDeclarations(body) {
  return body
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const colonIndex = declaration.indexOf(":");
      assert.ok(colonIndex > 0, `CSS declaration has a property and value: ${declaration}`);
      return declaration.slice(0, colonIndex).trim().toLowerCase();
    });
}
