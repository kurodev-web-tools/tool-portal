import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  FONT_SHA256,
  FONT_SOURCE_BYTES,
  FONT_SOURCE_PATH,
  FONT_URL,
  OFL_PATH,
  OFL_SHA256,
  OFL_URL,
} from "./font-source.mjs";

class FontSourceIntegrityError extends Error {
  name = "FontSourceIntegrityError";

  constructor(label, expected, actual) {
    super(`${label} integrity mismatch: expected ${expected}, received ${actual}`);
    this.label = label;
    this.expected = expected;
    this.actual = actual;
  }
}

class FontSourceResponseError extends Error {
  name = "FontSourceResponseError";

  constructor(url, status) {
    super(`Unable to fetch pinned font source (${status})`);
    this.url = url;
    this.status = status;
  }
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const download = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) {
    throw new FontSourceResponseError(url, response.status);
  }
  return Buffer.from(await response.arrayBuffer());
};

const assertHash = (label, bytes, expectedHash) => {
  const actualHash = sha256(bytes);
  if (actualHash !== expectedHash) {
    throw new FontSourceIntegrityError(`${label} SHA-256`, expectedHash, actualHash);
  }
};

const writeAtomically = async (path, bytes) => {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}`;
  await writeFile(temporaryPath, bytes);
  await rename(temporaryPath, path);
};

const main = async () => {
  const [fontSource, license] = await Promise.all([download(FONT_URL), download(OFL_URL)]);
  if (fontSource.byteLength !== FONT_SOURCE_BYTES) {
    throw new FontSourceIntegrityError(
      "font byte count",
      String(FONT_SOURCE_BYTES),
      String(fontSource.byteLength),
    );
  }
  assertHash("font source", fontSource, FONT_SHA256);
  assertHash("OFL", license, OFL_SHA256);

  await Promise.all([writeAtomically(FONT_SOURCE_PATH, fontSource), writeAtomically(OFL_PATH, license)]);
  console.log(`font source bytes=${fontSource.byteLength} sha256=${FONT_SHA256} PASS`);
  console.log(`OFL sha256=${OFL_SHA256} PASS`);
};

try {
  await main();
} catch (error) {
  // no-excuse-ok: catch -- CLI boundary converts every failure to a non-zero exit.
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
