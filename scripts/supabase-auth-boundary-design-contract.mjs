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

const boundary = section("Supabase Auth Boundary Design");

assertContainsAll(
  boundary,
  [
    "Status: docs-only contract",
    "Supabase Auth adoption premise",
    "Next.js App Router / SSR",
    "cookie-backed session boundary",
    "Official Reference Snapshot",
    "No SDK dependency, `.env.local`, migration, SQL, API route, Server Action, login UI, or storage payload change is authorized by this section."
  ],
  "supabase auth boundary overview"
);

assertContainsAll(
  boundary,
  [
    "https://supabase.com/docs/guides/auth/server-side/creating-a-client",
    "https://supabase.com/docs/guides/auth/server-side/advanced-guide",
    "https://supabase.com/docs/guides/getting-started/api-keys",
    "https://supabase.com/docs/guides/database/postgres/row-level-security",
    "https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically"
  ],
  "official Supabase reference snapshot"
);

assertContainsAll(
  boundary,
  [
    "`NEXT_PUBLIC_SUPABASE_URL`",
    "`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`",
    "`SUPABASE_SECRET_KEY`",
    "`SUPABASE_SERVICE_ROLE_KEY`",
    "must never use the `NEXT_PUBLIC_` prefix",
    "Do not request, display, commit, paste into docs, or store a secret / service_role key"
  ],
  "environment and key handling"
);

assertContainsAll(
  boundary,
  [
    "`user_profiles`",
    "`user_preferences`",
    "`tool_preferences`",
    "`usage_quotas`",
    "server-authoritative",
    "trusted server"
  ],
  "minimal DB shape"
);

assertContainsAll(
  boundary,
  [
    "RLS enabled before any Data API access",
    "`Automatically expose new tables` OFF",
    "explicit `GRANT`",
    "`authenticated`",
    "`auth.uid()`",
    "`usage_quotas` read for owner only",
    "quota writes are trusted-server-only"
  ],
  "RLS and grant boundary"
);

assertContainsAll(
  boundary,
  [
    "Initial account merge is limited to locale/theme only",
    "`v-streamer-tools-locale`",
    "`v-streamer-tools-theme`",
    "No Thumbnail, Schedule Calendar, Translator, IndexedDB, handoff, local font, project, asset, or billing data participates in the first merge"
  ],
  "account merge boundary"
);

assertContainsAll(
  boundary,
  [
    "Rollback path",
    "Migration risks",
    "additive tables",
    "local-first behavior remains intact",
    "No existing localStorage, IndexedDB, or sessionStorage key is renamed, deleted, migrated, or rewritten in this slice"
  ],
  "rollback and migration risk"
);

assertExcludes(
  boundary,
  [
    "npm install @supabase/supabase-js",
    "npm install @supabase/ssr",
    "create table public.",
    "alter table public.",
    "create policy",
    "supabase.auth.signIn",
    "supabase.auth.signOut",
    "export async function POST",
    "localStorage.setItem(",
    "indexedDB.open("
  ],
  "docs-only boundary"
);

assert.match(
  task,
  /node scripts\/supabase-auth-boundary-design-contract\.mjs/,
  "task.md records the Supabase auth boundary design contract check"
);

console.log("supabase auth boundary design contract checks passed");
