import { readFile, rename, writeFile } from "node:fs/promises";
import subsetFont from "subset-font";
import { FONT_GLYPH_TEXT } from "../src/content.ts";
import { FONT_OUTPUTS, FONT_SOURCE_PATH } from "./font-source.mjs";

class EmptyFontSubsetError extends Error {
  name = "EmptyFontSubsetError";

  constructor(weight) {
    super(`Subset generation produced an empty ${weight} font`);
    this.weight = weight;
  }
}

const buildSubset = async (source, { path, weight }) => {
  const subset = await subsetFont(source, FONT_GLYPH_TEXT, {
    targetFormat: "woff2",
    variationAxes: { wght: weight },
  });
  if (subset.byteLength === 0) {
    throw new EmptyFontSubsetError(weight);
  }

  const temporaryPath = `${path}.tmp-${process.pid}`;
  await writeFile(temporaryPath, subset);
  await rename(temporaryPath, path);
  return { path, size: subset.byteLength, weight };
};

const main = async () => {
  const source = await readFile(FONT_SOURCE_PATH);
  const outputs = [];
  for (const output of FONT_OUTPUTS) {
    outputs.push(await buildSubset(source, output));
  }
  for (const { size, weight } of outputs) {
    console.log(`${weight} bytes=${size} PASS`);
  }
};

try {
  await main();
} catch (error) {
  // no-excuse-ok: catch -- CLI boundary converts every failure to a non-zero exit.
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
