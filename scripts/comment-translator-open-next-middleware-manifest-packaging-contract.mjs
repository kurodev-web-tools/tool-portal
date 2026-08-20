import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const previewWranglerConfigPath = path.join(projectRoot, "wrangler.preview.jsonc");

function stripJsonComments(source) {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (inString) {
      result += character;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      result += character;
      continue;
    }

    if (character === "/" && nextCharacter === "/") {
      index += 2;
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      if (index < source.length) {
        result += "\n";
      }
      continue;
    }

    if (character === "/" && nextCharacter === "*") {
      const commentStart = index;
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        if (source[index] === "\n") {
          result += "\n";
        }
        index += 1;
      }
      assert.notEqual(
        index,
        source.length,
        `Preview Wrangler config has an unterminated block comment at offset ${commentStart}`
      );
      index += 1;
      continue;
    }

    result += character;
  }

  return result;
}

function stripTrailingCommas(source) {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (inString) {
      result += character;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      result += character;
      continue;
    }

    if (character === ",") {
      let nextIndex = index + 1;
      while (nextIndex < source.length && /\s/.test(source[nextIndex])) {
        nextIndex += 1;
      }
      if (source[nextIndex] === "}" || source[nextIndex] === "]") {
        continue;
      }
    }

    result += character;
  }

  return result;
}

const previewWranglerSource = fs.readFileSync(previewWranglerConfigPath, "utf8");
let previewWrangler;

try {
  previewWrangler = JSON.parse(
    stripTrailingCommas(stripJsonComments(previewWranglerSource))
  );
} catch {
  assert.fail("Preview Wrangler config must be valid JSONC");
}

assert.ok(
  previewWrangler !== null &&
    typeof previewWrangler === "object" &&
    !Array.isArray(previewWrangler),
  "Preview Wrangler config root must be an object"
);
assert.ok(
  previewWrangler.find_additional_modules === true,
  "Preview Wrangler must collect additional OpenNext modules"
);
assert.ok(
  previewWrangler.base_dir === ".open-next/server-functions/default",
  "Preview additional modules must be rooted at the default OpenNext server function"
);
assert.ok(
  previewWrangler.preserve_file_names === true,
  "Preview must preserve manifest filenames for runtime require resolution"
);
assert.ok(
  Array.isArray(previewWrangler.rules) &&
    previewWrangler.rules.some(
      (rule) =>
        rule !== null &&
        typeof rule === "object" &&
        rule.type === "Data" &&
        Array.isArray(rule.globs) &&
        rule.globs.includes(".next/server/*.json")
    ),
  "Preview must include default server JSON manifests in a Data module rule"
);
assert.ok(
  previewWrangler.build &&
    typeof previewWrangler.build === "object" &&
    previewWrangler.build.command ===
      "node scripts/comment-translator-open-next-middleware-manifest-preview-build.mjs",
  "Preview Wrangler must retain the Preview-only build command"
);

function listFilesRecursively(directoryPath) {
  const files = [];
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

const dryRunPrefix = `comment-translator-wrangler-dry-run-${process.pid}-`;
const temporaryRoot = path.resolve(os.tmpdir());
const dryRunOutdir = fs.mkdtempSync(path.join(temporaryRoot, dryRunPrefix));
const temporaryConfigPrefix =
  `.comment-translator-wrangler-packaging-contract-${process.pid}-`;
const temporaryConfigPath = path.join(
  projectRoot,
  `${temporaryConfigPrefix}${randomUUID()}.jsonc`
);

try {
  const packagingWrangler = JSON.parse(JSON.stringify(previewWrangler));
  delete packagingWrangler.build.command;
  if (Object.keys(packagingWrangler.build).length === 0) {
    delete packagingWrangler.build;
  }
  assert.ok(
    !packagingWrangler.build ||
      !Object.prototype.hasOwnProperty.call(packagingWrangler.build, "command"),
    "packaging-only Wrangler config must not invoke a build command"
  );
  fs.writeFileSync(
    temporaryConfigPath,
    `${JSON.stringify(packagingWrangler, null, 2)}\n`,
    { encoding: "utf8", flag: "wx" }
  );

  const wranglerCommand = path.join(
    projectRoot,
    "node_modules/.bin",
    process.platform === "win32" ? "wrangler.cmd" : "wrangler"
  );
  assert.ok(fs.existsSync(wranglerCommand), "local Wrangler executable must exist");

  const dryRunResult = spawnSync(
    wranglerCommand,
    [
      "deploy",
      "--config",
      temporaryConfigPath,
      "--dry-run",
      "--outdir",
      dryRunOutdir
    ],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        WRANGLER_SEND_METRICS: "false"
      },
      shell: process.platform === "win32",
      windowsHide: true
    }
  );
  if (dryRunResult.error) {
    assert.fail("local Wrangler Preview dry-run must start successfully");
  }
  assert.equal(
    dryRunResult.status,
    0,
    "local Wrangler Preview dry-run must exit successfully"
  );
  assert.ok(fs.existsSync(dryRunOutdir), "Wrangler dry-run outdir must exist");

  const outputFiles = listFilesRecursively(dryRunOutdir);
  assert.ok(outputFiles.length > 0, "Wrangler dry-run outdir must not be empty");
  const outputRelativePaths = outputFiles.map((filePath) =>
    path.relative(dryRunOutdir, filePath).split(path.sep).join("/")
  );
  const expectedManifestRelativePath = ".next/server/middleware-manifest.json";
  assert.ok(
    outputRelativePaths.includes(expectedManifestRelativePath),
    "Wrangler dry-run must emit the middleware manifest Data module path"
  );

  const generatedManifestPath = path.join(
    dryRunOutdir,
    ...expectedManifestRelativePath.split("/")
  );
  const generatedManifestSource = fs.readFileSync(generatedManifestPath, "utf8");
  assert.ok(
    generatedManifestSource.length > 0,
    "Wrangler dry-run middleware manifest Data module must not be empty"
  );
  const expectedManifestPath = path.join(
    projectRoot,
    ".open-next/server-functions/default/.next/server/middleware-manifest.json"
  );
  assert.ok(
    fs.existsSync(expectedManifestPath),
    "OpenNext middleware manifest input must exist"
  );
  let generatedManifest;
  let expectedManifest;
  try {
    generatedManifest = JSON.parse(generatedManifestSource);
    expectedManifest = JSON.parse(fs.readFileSync(expectedManifestPath, "utf8"));
  } catch {
    assert.fail("Wrangler dry-run middleware manifest evidence must be valid JSON");
  }
  assert.ok(
    JSON.stringify(generatedManifest) === JSON.stringify(expectedManifest),
    "Wrangler dry-run Data module must retain the OpenNext middleware manifest"
  );

  const bundleFiles = outputFiles.filter(
    (filePath) => path.extname(filePath) === ".js"
  );
  assert.ok(bundleFiles.length > 0, "Wrangler dry-run must emit a JavaScript bundle");
  assert.ok(
    bundleFiles.some((filePath) =>
      fs.readFileSync(filePath, "utf8").includes("middleware-manifest.json")
    ),
    "Wrangler dry-run bundle must retain middleware manifest module evidence"
  );
} finally {
  const resolvedConfigPath = path.resolve(temporaryConfigPath);
  const safeTemporaryConfig =
    path.dirname(resolvedConfigPath) === path.resolve(projectRoot) &&
    path.basename(resolvedConfigPath).startsWith(temporaryConfigPrefix) &&
    path.extname(resolvedConfigPath) === ".jsonc";
  assert.ok(
    safeTemporaryConfig,
    "packaging-only cleanup must remain inside the exact project config path"
  );
  fs.rmSync(resolvedConfigPath, { force: true });

  const resolvedOutdir = path.resolve(dryRunOutdir);
  const safeTemporaryOutdir =
    path.dirname(resolvedOutdir) === temporaryRoot &&
    path.basename(resolvedOutdir).startsWith(dryRunPrefix);
  assert.ok(
    safeTemporaryOutdir,
    "Wrangler dry-run cleanup must remain inside its exact temporary root"
  );
  fs.rmSync(resolvedOutdir, { recursive: true, force: true });
}

console.log("OpenNext middleware manifest packaging contract checks passed");
