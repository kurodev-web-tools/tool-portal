import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

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
    if (char === '"') { inString = true; out += char; continue; }
    if (char === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      out += "\n";
      continue;
    }
    out += char;
  }
  return JSON.parse(out);
}

const configPath = path.join(process.cwd(), "wrangler.jsonc");
const raw = fs.readFileSync(configPath, "utf8");
const config = parseJsonc(raw);
const wrapper = fs.readFileSync(path.join(process.cwd(), "workers/comment-translator-paid-open-next-wrapper.mjs"), "utf8");

test("Production Worker config keeps the maintenance stop switches explicit", () => {
  assert.equal(config.name, "v-streamer-tools");
  assert.equal(config.workers_dev, false, "workers.dev must stay explicitly disabled");
  assert.equal(config.preview_urls, false, "preview URLs must stay explicitly disabled");
  assert.equal(Object.hasOwn(config, "workers_dev"), true, "workers_dev must be present, not omitted");
  assert.equal(Object.hasOwn(config, "preview_urls"), true, "preview_urls must be present, not omitted");
});

test("Production Worker config declares no Cloudflare cron trigger", () => {
  assert.ok(config.triggers, "triggers block is present");
  assert.deepEqual(config.triggers.crons, [], "Cloudflare cron list stays empty until Paid activation");
  assert.equal(/\*\/5 \* \* \* \*/.test(raw), false, "no five-minute cadence remains in the config");
});

test("routes, assets, compatibility and observability are unchanged", () => {
  assert.equal(Object.hasOwn(config, "route"), false);
  assert.equal(Object.hasOwn(config, "routes"), false);
  assert.deepEqual(config.assets, { directory: ".open-next/assets", binding: "ASSETS" });
  assert.equal(config.compatibility_date, "2026-05-27");
  assert.deepEqual(config.compatibility_flags, ["nodejs_compat"]);
  assert.deepEqual(config.observability, { enabled: true });
  assert.equal(config.main, "workers/comment-translator-paid-open-next-wrapper.mjs");
});

test("the scheduled handler stays a Paid-only fallback", () => {
  assert.match(wrapper, /scheduled\(_controller, env, ctx\)/);
  assert.match(wrapper, /COMMENT_TRANSLATOR_PAID_SCHEDULER_AUTHORITY !== "cloudflare-cron-fallback"/);
  assert.match(wrapper, /COMMENT_TRANSLATOR_PAID_CRON_TOKEN/);
});
