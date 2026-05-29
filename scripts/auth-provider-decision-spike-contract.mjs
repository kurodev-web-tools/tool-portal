import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const planPath = path.join(root, "docs", "future", "USER_ACCOUNT_PREFERENCES_FOUNDATION_PLAN.md");
const taskPath = path.join(root, "task.md");
const plan = fs.readFileSync(planPath, "utf8");
const task = fs.readFileSync(taskPath, "utf8");

function section(title) {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = plan.match(new RegExp(`^## ${escapedTitle}\\s*$([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m"));
  assert.ok(match, `plan contains section: ${title}`);
  return match[1];
}

function assertContainsAll(source, snippets, label) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `${label} includes ${snippet}`);
  }
}

function assertExcludes(source, forbiddenSnippets, label) {
  for (const snippet of forbiddenSnippets) {
    assert.equal(source.includes(snippet), false, `${label} does not include ${snippet}`);
  }
}

const spike = section("Auth Provider Decision Spike");

assertContainsAll(
  spike,
  [
    "Supabase Auth",
    "Clerk",
    "Auth.js",
    "DB shape",
    "RLS / session handling",
    "Account merge policy",
    "Quota / paid plan boundary",
    "Rollback / migration risk",
    "Provisional Recommendation",
    "Use Supabase Auth as the provisional candidate"
  ],
  "auth provider decision spike"
);

assertContainsAll(
  spike,
  [
    "https://supabase.com/docs/guides/auth",
    "https://supabase.com/docs/guides/database/postgres/row-level-security",
    "https://clerk.com/docs/reference/nextjs/overview",
    "https://clerk.com/docs/guides/billing/overview",
    "https://authjs.dev/concepts/session-strategies",
    "https://authjs.dev/getting-started/database"
  ],
  "official reference snapshot"
);

assertContainsAll(
  spike,
  [
    "user_profiles",
    "user_preferences",
    "tool_preferences",
    "usage_quotas",
    "server-authoritative",
    "not editable as preference JSON"
  ],
  "minimal future DB shape"
);

assertContainsAll(
  spike,
  [
    "First sign-in starts with local app behavior unchanged",
    "explicit user action",
    "Do not auto-upload current drafts, schedules, user materials, comments, local font inventory, or handoff payloads",
    "keep local, keep account, or merge"
  ],
  "account merge and migration policy"
);

assertContainsAll(
  spike,
  [
    "Supabase project/runtime target and supported Node version pinned",
    "Minimal additive DB schema draft with RLS policies and rollback plan",
    "publishable vs secret key handling",
    "Quota read/write ownership defined separately from preferences",
    "preserving current storage keys, local payloads, IndexedDB blobs, `sessionStorage` handoff"
  ],
  "next slice gate"
);

assertExcludes(
  spike,
  [
    "npm install @supabase/supabase-js",
    "create table",
    "alter table",
    "create policy",
    "export async function POST",
    "localStorage.setItem",
    "indexedDB.open"
  ],
  "docs-only spike"
);

assert.match(
  task,
  /node scripts\/auth-provider-decision-spike-contract\.mjs/,
  "task.md records the auth provider decision spike contract check"
);

console.log("auth provider decision spike contract checks passed");
