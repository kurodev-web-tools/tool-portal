import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wrangler = JSON.parse(
  readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8")
);

assert.equal(wrangler.main, ".open-next/worker.js");
assert.equal(wrangler.containers, undefined);
assert.equal(wrangler.durable_objects, undefined);
assert.equal(wrangler.exports, undefined);
assert.deepEqual(wrangler.migrations, [
  {
    tag: "c1-container-v1",
    new_sqlite_classes: ["CommentTranslatorC1Container"]
  },
  {
    tag: "c1-container-retired-v2",
    deleted_classes: ["CommentTranslatorC1Container"]
  }
]);

process.stdout.write(
  "comment translator Cloudflare legacy Durable Object retirement contract passed\n"
);
