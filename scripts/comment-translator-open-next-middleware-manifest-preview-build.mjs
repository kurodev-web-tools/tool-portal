import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const buildEnvironment = {
  ...process.env,
  COMMENT_TRANSLATOR_PREVIEW_BUILD: "true"
};
const result = spawnSync(npmCommand, ["run", "build:cloudflare"], {
  cwd: projectRoot,
  env: buildEnvironment,
  shell: process.platform === "win32",
  stdio: "inherit"
});

if (result.error || result.status !== 0) {
  process.exit(result.status ?? 1);
}
