import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["scripts/comment-translator-creator-waitlist-admin-contract.mjs"],
  {
    cwd: process.cwd(),
    stdio: "inherit"
  }
);

process.exit(result.status ?? 1);
