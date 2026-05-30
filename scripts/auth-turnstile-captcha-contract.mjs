import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertFile(relativePath) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `file exists: ${relativePath}`);
}

function assertIncludes(source, snippets, label) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `${label} includes ${snippet}`);
  }
}

function assertExcludes(source, snippets, label) {
  for (const snippet of snippets) {
    assert.equal(source.includes(snippet), false, `${label} excludes ${snippet}`);
  }
}

assertFile("components/account/AuthTurnstile.tsx");

const turnstileSource = read("components/account/AuthTurnstile.tsx");
assertIncludes(
  turnstileSource,
  [
    "turnstileSiteKey",
    "turnstileSiteKey?: string",
    "https://challenges.cloudflare.com/turnstile/v0/api.js",
    "cf-turnstile",
    "data-sitekey={turnstileSiteKey}",
    "data-size=\"flexible\"",
    "data-response-field-name=\"cf-turnstile-response\"",
    "return null"
  ],
  "Turnstile component keeps local/dev graceful and uses Cloudflare form integration"
);
assertExcludes(turnstileSource, ["process.env"], "Turnstile client component avoids browser runtime env reads");
assertExcludes(
  turnstileSource,
  ["TURNSTILE_SECRET", "CF_TURNSTILE_SECRET", "CAPTCHA_SECRET", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "service_role"],
  "Turnstile component excludes private keys"
);

const authFlowShell = read("components/account/AuthFlowShell.tsx");
assertIncludes(
  authFlowShell,
  [
    "import { AuthTurnstile } from \"@/components/account/AuthTurnstile\";",
    "turnstileSiteKey?: string;",
    "const showTurnstile = mode === \"login\" || mode === \"signup\" || mode === \"reset\";",
    "{showTurnstile ? <AuthTurnstile turnstileSiteKey={turnstileSiteKey} /> : null}"
  ],
  "auth forms render Turnstile only for login/signup/reset"
);

for (const routeFile of ["app/login/page.tsx", "app/signup/page.tsx", "app/reset-password/page.tsx"]) {
  const routeSource = read(routeFile);
  assertIncludes(
    routeSource,
    ["process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY", "turnstileSiteKey={turnstileSiteKey}"],
    `${routeFile} passes the public site key from the server page into the client form`
  );
}

const actionSource = read("app/account/actions.ts");
assertIncludes(
  actionSource,
  [
    "const turnstileTokenFieldName = \"cf-turnstile-response\";",
    "function readTurnstileCaptchaToken(formData: FormData)",
    "const captchaOptions = getAuthCaptchaOptions(formData);",
    "options: captchaOptions",
    "...captchaOptions",
    "resetPasswordForEmail(email, {",
    "captchaToken"
  ],
  "auth server actions forward Turnstile token to Supabase Auth captchaToken options"
);
assertExcludes(
  actionSource,
  [
    "TURNSTILE_SECRET",
    "CF_TURNSTILE_SECRET",
    "CAPTCHA_SECRET",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "service_role",
    "localStorage.setItem",
    "indexedDB.open"
  ],
  "auth server actions exclude secret keys and browser storage writes"
);

const changedFiles = execFileSync("git", ["diff", "--name-only", "origin/main...HEAD"], {
  cwd: root,
  encoding: "utf8"
})
  .split(/\r?\n/)
  .filter(Boolean);
const worktreeFiles = execFileSync("git", ["status", "--short", "--untracked-files=all"], {
  cwd: root,
  encoding: "utf8"
})
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => line.slice(3).trim());
const touchedFiles = new Set([...changedFiles, ...worktreeFiles]);
assert.equal(
  [...touchedFiles].some((file) => file.startsWith("supabase/")),
  false,
  "Turnstile app slice does not change Supabase schema, migrations, RLS, or storage policy files"
);

console.log("auth turnstile captcha contract checks passed");
