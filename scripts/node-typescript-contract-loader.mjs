import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

const stubs = new Map([
  ["server-only", "export {};"],
  [
    "@supabase/supabase-js",
    "export function createClient() { throw new Error('Supabase client must be injected by focused contracts.'); }"
  ],
  [
    "stripe",
    "export default class Stripe { constructor() { this.checkout = { sessions: {} }; this.billingPortal = { sessions: {} }; this.webhooks = {}; } }"
  ]
]);

export async function resolve(specifier, context, nextResolve) {
  const stub = stubs.get(specifier);
  if (stub) {
    return {
      url: `data:text/javascript,${encodeURIComponent(stub)}`,
      shortCircuit: true
    };
  }

  if (specifier.startsWith("@/")) {
    return resolveProjectModule(specifier.slice(2));
  }

  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const resolved = new URL(specifier, context.parentURL);
    if (!path.extname(resolved.pathname)) {
      for (const extension of [".ts", ".tsx"]) {
        const candidate = new URL(`${resolved.href}${extension}`);
        if (fs.existsSync(candidate)) {
          return { url: candidate.href, shortCircuit: true };
        }
      }
    }
  }

  return nextResolve(specifier, context);
}

function resolveProjectModule(relativePath) {
  for (const extension of [".ts", ".tsx"]) {
    const candidate = path.join(root, `${relativePath}${extension}`);
    if (fs.existsSync(candidate)) {
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }

  throw new Error(`Project module not found: ${relativePath}`);
}
