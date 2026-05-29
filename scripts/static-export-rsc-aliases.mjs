import { copyFileSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const outDir = path.resolve(process.cwd(), "out");
const checkOnly = process.argv.includes("--check");
const aliasPairs = [];

function toDisplayPath(filePath) {
  return path.relative(outDir, filePath).split(path.sep).join("/");
}

function filesMatch(source, target) {
  if (!existsSync(target)) {
    return false;
  }

  return Buffer.compare(readFileSync(source), readFileSync(target)) === 0;
}

function collectAliasPairs(nextDir, currentDir = nextDir) {
  for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
    const entryPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      collectAliasPairs(nextDir, entryPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".txt")) {
      continue;
    }

    const nextDirName = path.basename(nextDir);
    const nextDirParent = path.dirname(nextDir);
    const relativeParts = path.relative(nextDir, entryPath).split(path.sep);
    const aliasName = [nextDirName, ...relativeParts].join(".");
    const aliasPath = path.join(nextDirParent, aliasName);

    if (entryPath !== aliasPath) {
      aliasPairs.push({ source: entryPath, target: aliasPath });
    }
  }
}

function walkForNextDirs(currentDir) {
  for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
    const entryPath = path.join(currentDir, entry.name);
    if (!entry.isDirectory()) {
      continue;
    }

    if (entry.name.startsWith("__next.")) {
      collectAliasPairs(entryPath);
    }

    walkForNextDirs(entryPath);
  }
}

if (!existsSync(outDir) || !statSync(outDir).isDirectory()) {
  if (!checkOnly) {
    console.log("Static export RSC aliases skipped: out directory is missing for server-runtime build.");
    process.exit(0);
  }

  console.error("out directory is missing. Run npm run build before checking static export RSC aliases.");
  process.exit(1);
}

walkForNextDirs(outDir);

const missingOrStale = aliasPairs.filter(({ source, target }) => !filesMatch(source, target));

if (checkOnly) {
  if (missingOrStale.length > 0) {
    console.error(`Static export RSC aliases are missing or stale: ${missingOrStale.length}`);
    for (const pair of missingOrStale.slice(0, 20)) {
      console.error(`- ${toDisplayPath(pair.target)} <- ${toDisplayPath(pair.source)}`);
    }
    process.exit(1);
  }

  console.log(`Static export RSC aliases verified: ${aliasPairs.length}`);
  process.exit(0);
}

for (const { source, target } of missingOrStale) {
  copyFileSync(source, target);
}

console.log(`Static export RSC aliases ready: ${aliasPairs.length} checked, ${missingOrStale.length} written.`);
