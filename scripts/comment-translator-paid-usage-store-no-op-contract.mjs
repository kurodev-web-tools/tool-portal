import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export default {};#server-only" };
    }
    if (specifier === "@supabase/supabase-js") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const createClient=()=>({});export default {};#supabase"
      };
    }
    if (specifier.startsWith("@/")) {
      const candidate = pathToFileURL(path.join(repoRoot, `${specifier.slice(2)}.ts`));
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: candidate.href };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: candidate.href };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      const source = fs.readFileSync(new URL(url), "utf8");
      return {
        format: "module",
        shortCircuit: true,
        source: stripTypeScriptTypes(source, { mode: "transform", sourceMap: false })
      };
    }
    return nextLoad(url, context);
  }
});

const { createCommentTranslatorPaidUsageStore } = await import(
  pathToFileURL(path.join(repoRoot, "lib/comment-translator-paid-usage-store.ts")).href
);

const request = {
  workItemId: "00000000-0000-4000-8000-000000000009",
  reconcileLeaseToken: "00000000-0000-4000-8000-000000000010",
  utcMonth: "2026-07-01",
  nowIso: "2026-08-17T00:00:00.000Z"
};

const calls = [];
const noOpStore = createCommentTranslatorPaidUsageStore({
  supabase: {
    async rpc(functionName, params) {
      calls.push({ functionName, params });
      return { data: false, error: null };
    }
  }
});

await assert.doesNotReject(async () => {
  const result = await noOpStore.closeUtcMonth(request);
  assert.equal(result, false, "a valid no-op must return false as moreOverdueMonths");
});
assert.equal(calls.length, 1, "the UTC close RPC is called once");
assert.equal(calls[0].functionName, "ct_paid_close_utc_month_reconciled");

const trueStore = createCommentTranslatorPaidUsageStore({
  supabase: { async rpc() { return { data: true, error: null }; } }
});
assert.equal(await trueStore.closeUtcMonth(request), true, "true continues to signal another overdue month");

const errorStore = createCommentTranslatorPaidUsageStore({
  supabase: { async rpc() { return { data: null, error: { code: "rpc-error" } }; } }
});
await assert.rejects(
  () => errorStore.closeUtcMonth(request),
  /Paid UTC-month close failed/,
  "an RPC error remains fail-closed"
);

console.log("comment-translator-paid-usage-store-no-op-contract: PASS");
