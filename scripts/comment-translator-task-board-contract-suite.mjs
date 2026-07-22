import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const scriptsRoot = path.join(root, "scripts");
const selfPath = fileURLToPath(import.meta.url);
const timeoutMs = 60_000;

function discoverTaskContracts(directory) {
  const discovered = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, "en"));

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      discovered.push(...discoverTaskContracts(absolutePath));
      continue;
    }
    if (!entry.isFile() || path.extname(entry.name) !== ".mjs" || path.resolve(absolutePath) === selfPath) {
      continue;
    }

    const source = fs.readFileSync(absolutePath, "utf8").toLowerCase();
    if (source.includes("task") && source.includes(".md")) {
      discovered.push(absolutePath);
    }
  }

  return discovered;
}

function displayPath(absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

let passed = 0;
let failed = 0;

try {
  const contracts = discoverTaskContracts(scriptsRoot)
    .sort((left, right) => left.localeCompare(right, "en"));
  for (const contractPath of contracts) {
    const result = spawnSync(process.execPath, [contractPath], {
      cwd: root,
      encoding: "utf8",
      stdio: "ignore",
      timeout: timeoutMs,
      windowsHide: true,
    });
    const relativePath = displayPath(contractPath);

    if (result.status === 0 && result.error === undefined) {
      passed += 1;
      console.log(`PASS ${relativePath}`);
      continue;
    }

    failed += 1;
    const exit = result.error?.code === "ETIMEDOUT" ? 124 : (result.status ?? 1);
    console.log(`FAIL ${relativePath} exit=${exit}`);
  }
} catch {
  failed += 1;
  console.log("FAIL scripts exit=1");
}

const total = passed + failed;
console.log(`task_contracts total=${total} passed=${passed} failed=${failed}`);
if (failed > 0) {
  process.exitCode = 1;
}
