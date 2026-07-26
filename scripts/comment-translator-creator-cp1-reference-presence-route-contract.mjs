import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const helperPath = fileURLToPath(
  new URL(
    "../lib/comment-translator-creator-paid-readiness.ts",
    import.meta.url,
  ),
);
const helperUrl = pathToFileURL(helperPath).href;
const routePath = fileURLToPath(
  new URL(
    "../app/api/comment-translator/creator-paid/readiness/route.ts",
    import.meta.url,
  ),
);
const asModule = (source) =>
  `data:text/javascript,${encodeURIComponent(source)}`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: asModule("export{}") };
    }
    if (specifier === "next/server") {
      return {
        shortCircuit: true,
        url: asModule(`
          export const NextResponse = {
            json(body, init) {
              return {
                body,
                status: init?.status ?? 200,
                headers: new Headers(init?.headers)
              };
            }
          };
        `),
      };
    }
    if (
      specifier ===
      "@/lib/comment-translator-creator-paid-readiness"
    ) {
      return { shortCircuit: true, url: helperUrl };
    }
    return nextResolve(specifier, context);
  },
});

const expectedSupportingReferences = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES",
  "STRIPE_SECRET_KEY",
  "COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID",
  "STRIPE_WEBHOOK_SECRET",
  "COMMENT_TRANSLATOR_PAID_TRANSLATION_PROVIDER",
  "COMMENT_TRANSLATOR_TRANSLATION_MONTHLY_BUDGET_USD",
  "COMMENT_TRANSLATOR_TRANSLATION_BUDGET_SOFT_STOP_RATIO",
  "COMMENT_TRANSLATOR_TRANSLATION_BUDGET_HARD_STOP_RATIO",
  "OPENAI_API_KEY",
  "OPENAI_TRANSLATION_MODEL",
  "AZURE_TRANSLATOR_KEY",
  "AZURE_TRANSLATOR_ENDPOINT",
  "AZURE_TRANSLATOR_REGION",
  "COMMENT_TRANSLATOR_AZURE_MONTHLY_CHARACTER_CAP",
];
const activationReference =
  "COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_BILLING_ACCESS";

function createPresenceOnlyEnvironment(referenceNames) {
  const environment = {};
  for (const name of referenceNames) {
    Object.defineProperty(environment, name, {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error("environment reference values must not be read");
      },
    });
  }
  return new Proxy(environment, {
    get() {
      throw new Error("environment reference values must not be read");
    },
  });
}

assert.equal(
  fs.existsSync(helperPath),
  true,
  "the server-only readiness helper exists",
);
assert.equal(
  fs.existsSync(routePath),
  true,
  "the GET readiness route exists",
);

const helper = await import(helperUrl);
const inactive = helper.readCommentTranslatorCreatorPaidReadiness(
  createPresenceOnlyEnvironment(expectedSupportingReferences),
);

assert.deepEqual(inactive, {
  status: "ready-inactive",
  references: [
    ...expectedSupportingReferences.map((name) => ({
      name,
      status: "present",
    })),
    { name: activationReference, status: "missing" },
  ],
  counts: {
    present: 18,
    missing: 1,
    unreviewed: 0,
    total: 19,
  },
});

const activationPresent = helper.readCommentTranslatorCreatorPaidReadiness(
  createPresenceOnlyEnvironment([
    ...expectedSupportingReferences,
    activationReference,
  ]),
);
assert.equal(
  activationPresent.status,
  "activation-reference-unreviewed",
);
assert.deepEqual(activationPresent.counts, {
  present: 18,
  missing: 0,
  unreviewed: 1,
  total: 19,
});
assert.deepEqual(activationPresent.references.at(-1), {
  name: activationReference,
  status: "unreviewed",
});

const blocked = helper.readCommentTranslatorCreatorPaidReadiness(
  createPresenceOnlyEnvironment(expectedSupportingReferences.slice(1)),
);
assert.equal(blocked.status, "missing-supporting-references");
assert.deepEqual(blocked.counts, {
  present: 17,
  missing: 2,
  unreviewed: 0,
  total: 19,
});

const route = await import(pathToFileURL(routePath).href);
assert.equal(typeof route.GET, "function");
for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
  assert.equal(route[method], undefined);
}
const response = await route.GET();
assert.equal(response.status, 200);
assert.equal(response.headers.get("Cache-Control"), "no-store");
assert.deepEqual(Object.keys(response.body), [
  "status",
  "references",
  "counts",
]);

const helperSource = fs.readFileSync(helperPath, "utf8");
const routeSource = fs.readFileSync(routePath, "utf8");
assert.doesNotMatch(helperSource, /environment\s*\[[^\]]+\]/);
assert.doesNotMatch(
  `${helperSource}\n${routeSource}`,
  /\bfetch\s*\(|cookies\s*\(|headers\s*\(|console\.|createClient\s*\(|from\s+["'][^"']*(stripe|provider|supabase|oauth|token|session)/i,
);
assert.match(routeSource, /export\s+async\s+function\s+GET\s*\(\s*\)/);
assert.match(routeSource, /Cache-Control["']?\s*:\s*["']no-store["']/);

console.log(
  "comment_translator_creator_cp1_reference_presence_route_contract=pass",
);
