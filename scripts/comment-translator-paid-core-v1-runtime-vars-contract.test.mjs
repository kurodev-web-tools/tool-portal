import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

// Incident regression contract (2026-09-21).
//
// A fresh `wrangler versions upload` without `--keep-vars` dropped every
// Production plain-text var, because the 13 values existed only as remote
// bindings. Losing `NEXT_PUBLIC_SUPABASE_URL` made the trusted stores
// unavailable and `paid-maintenance` answered 503.
//
// The expectations below are the exact values recovered read-only from the
// known-good Production Version f424749b-95f4-4759-b27b-9cfeb4baa548
// (`wrangler versions view <id> --json`). They are public values by design.
// The 16 secret bindings are deliberately absent here and must stay remote
// secrets; this contract exists so a fresh upload reproduces the plain-text
// bindings from source instead of from the previous deployment.

// Minimal JSONC reader for a config whose only comment form is line comments
// outside strings. No dependency is added for this check.
function parseJsonc(source) {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      out += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
      continue;
    }
    if (char === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      out += "\n";
      continue;
    }
    out += char;
  }
  return JSON.parse(out);
}

const root = process.cwd();
const productionRaw = fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8");
const previewRaw = fs.readFileSync(path.join(root, "wrangler.preview.jsonc"), "utf8");
const productionConfig = parseJsonc(productionRaw);
const previewConfig = parseJsonc(previewRaw);

const productionPlainVars = {
  AZURE_TRANSLATOR_ENDPOINT: "https://api.cognitive.microsofttranslator.com/",
  AZURE_TRANSLATOR_REGION: "japaneast",
  COMMENT_TRANSLATOR_AZURE_MONTHLY_CHARACTER_CAP: "500000",
  COMMENT_TRANSLATOR_EDGE_RATE_LIMITING: "enabled",
  // Paid checkout safety authority: without a UTC-day bucket row the billing
  // runtime falls back to this configured daily poll budget. The value is
  // measured from the account-wide Cloudflare Workers requests over the last
  // seven complete UTC days (P95 = 2,276) as 100000 - 2276 - 20000.
  COMMENT_TRANSLATOR_PAID_POLL_DAILY_BUDGET: "77724",
  GOOGLE_OAUTH_CLIENT_ID: "802207624176-gd098dq00ih6807ek775lto5kd20bqqt.apps.googleusercontent.com",
  GOOGLE_OAUTH_REDIRECT_URI: "https://streamer-tools.kuro-lab.com/api/comment-translator/youtube/oauth/callback",
  NEXT_PUBLIC_SITE_URL: "https://streamer-tools.kuro-lab.com",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_W_vbID6B0Wo_Ju2_gmEceQ_2xUwYXwM",
  NEXT_PUBLIC_SUPABASE_URL: "https://jcmutakletqisakunzmn.supabase.co",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "0x4AAAAAADZRqKAqezIyrY3y",
  VERCEL_ENV: "production",
  YOUTUBE_OAUTH_TOKEN_STORE_KEY_REF: "youtube-token-store-main",
  YOUTUBE_OAUTH_TOKEN_STORE_KEY_VERSION: "v1"
};

// Recovered read-only from the newest preview upload
// (Version 9e1a72be-5648-4b04-a902-d5c5e20ae4d3, 2026-08-31). Preview values
// are environment specific and must never be copied from Production.
const previewPlainVars = {
  COMMENT_TRANSLATOR_PAID_ATTEMPT_KEY_VERSION: "v1",
  COMMENT_TRANSLATOR_PAID_AUTOMATIC_TAX_ENABLED: "false",
  COMMENT_TRANSLATOR_PAID_AZURE_FALLBACK_ENABLED: "false",
  COMMENT_TRANSLATOR_PAID_CHECKOUT_ENABLED: "true",
  COMMENT_TRANSLATOR_PAID_CONDITIONS_VERSION: "paid-v1",
  COMMENT_TRANSLATOR_PAID_OPENAI_ENABLED: "false",
  COMMENT_TRANSLATOR_PAID_POLL_DAILY_BUDGET: "79000",
  COMMENT_TRANSLATOR_PAID_SCHEDULER_AUTHORITY: "supabase-cron",
  COMMENT_TRANSLATOR_PAID_TAX_REGISTRATION_READY: "false",
  COMMENT_TRANSLATOR_PAID_TRANSLATION_ENABLED: "false",
  COMMENT_TRANSLATOR_PAID_US_CHECKOUT_ENABLED: "false",
  COMMENT_TRANSLATOR_PRIVACY_VERSION: "privacy-v1",
  COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_1U5JPp0MPTMdbZdsXEDz6ZXZ",
  COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID: "prod_V5UO1XNXgXSWaj",
  COMMENT_TRANSLATOR_TERMS_VERSION: "terms-v1",
  NEXT_PUBLIC_SITE_URL: "https://v-streamer-tools-preview.kurodev-web-tools.workers.dev/",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_XAsFS4KOTRUluuGaEqtfrA_eCj8Nesw",
  NEXT_PUBLIC_SUPABASE_URL: "https://elwkfbqbzysjfyuukjci.supabase.co"
};

const secretLikeNamePattern = /SECRET|_TOKEN$|^STRIPE_|SERVICE_ROLE_KEY|_API_KEY$/;
const publicNameAllowlist = new Set([
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY"
]);

function assertPlainVars(config, raw, expected, label) {
  assert.ok(
    config.vars && typeof config.vars === "object" && !Array.isArray(config.vars),
    `${label} declares a vars object`
  );

  const declared = Object.keys(config.vars).sort();
  const required = Object.keys(expected).sort();
  assert.deepEqual(declared, required, `${label} declares exactly the recovered plain-var set`);

  for (const [name, value] of Object.entries(expected)) {
    assert.equal(config.vars[name], value, `${label} pins ${name} to its recovered value`);
    const occurrences = raw.split(`"${name}"`).length - 1;
    assert.equal(occurrences, 1, `${label} declares ${name} exactly once`);
  }
}

test("Production deployment config reproduces the recovered plain vars on a fresh upload", () => {
  assertPlainVars(productionConfig, productionRaw, productionPlainVars, "Production wrangler.jsonc");
});

test("Production deployment config keeps every plain var free of secret material", () => {
  for (const name of Object.keys(productionPlainVars)) {
    if (publicNameAllowlist.has(name)) continue;
    assert.doesNotMatch(name, secretLikeNamePattern, `${name} is not a secret-shaped plain var`);
  }

  for (const forbidden of [
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "COMMENT_TRANSLATOR_PAID_CRON_TOKEN",
    "TURNSTILE_SECRET",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "YOUTUBE_OAUTH_STATE_SECRET"
  ]) {
    assert.equal(
      Object.hasOwn(productionConfig.vars ?? {}, forbidden),
      false,
      `${forbidden} stays a remote secret, never a config var`
    );
  }
});

test("trusted store factories keep their runtime env satisfied by config plus secrets", () => {
  const libDir = path.join(root, "lib");
  const storeFiles = fs
    .readdirSync(libDir)
    .filter((name) => /^comment-translator-paid-.*-store\.ts$/.test(name))
    .filter((name) =>
      fs.readFileSync(path.join(libDir, name), "utf8").includes("CommentTranslatorPaidStoreFactoryEnvName")
    );

  assert.ok(storeFiles.length > 0, "trusted store factories were found");

  for (const name of storeFiles) {
    const source = fs.readFileSync(path.join(libDir, name), "utf8");
    assert.match(source, /NEXT_PUBLIC_SUPABASE_URL/, `${name} requires the Supabase URL env`);
    assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/, `${name} requires the service-role secret`);
    assert.match(
      source,
      /trusted-service-role-env-missing/,
      `${name} keeps its fail-closed missing-env reason`
    );
    assert.equal(
      productionConfig.vars.NEXT_PUBLIC_SUPABASE_URL,
      productionPlainVars.NEXT_PUBLIC_SUPABASE_URL,
      `${name} URL requirement is satisfied by the config vars`
    );
  }
});

test("Production deployment config still stops the public and scheduled surfaces", () => {
  assert.equal(productionConfig.workers_dev, false);
  assert.equal(productionConfig.preview_urls, false);
  assert.deepEqual(productionConfig.triggers?.crons, []);
});

test("Preview deployment config reproduces the recovered preview plain vars", () => {
  assertPlainVars(previewConfig, previewRaw, previewPlainVars, "Preview wrangler.preview.jsonc");
});
