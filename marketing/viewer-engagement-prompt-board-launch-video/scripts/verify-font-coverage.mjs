import { existsSync } from "node:fs";
import { openSync } from "fontkit";
import { FONT_GLYPH_TEXT } from "../src/content.ts";
import { FONT_OUTPUTS } from "./font-source.mjs";

export const collectRequiredCodePoints = (text) =>
  new Set(Array.from(text, (character) => character.codePointAt(0)));

const requiredCodePoints = [...collectRequiredCodePoints(FONT_GLYPH_TEXT)]
  .filter((codePoint) => codePoint !== undefined && !/^\s$/u.test(String.fromCodePoint(codePoint)))
  .sort((left, right) => left - right);

const missingAssets = FONT_OUTPUTS.filter(({ path }) => !existsSync(path));
if (missingAssets.length > 0) {
  for (const { path } of missingAssets) {
    console.error(path);
  }
  process.exitCode = 1;
} else {
  for (const { path, weight } of FONT_OUTPUTS) {
    try {
      const font = openSync(path);
      const missingCodePoints = requiredCodePoints.filter(
        (codePoint) => !font.hasGlyphForCodePoint(codePoint),
      );
      if (missingCodePoints.length > 0) {
        console.error(
          `${weight} missing=${missingCodePoints.map((codePoint) => `U+${codePoint.toString(16).toUpperCase()}`).join(",")}`,
        );
        process.exitCode = 1;
      } else {
        console.log(`${weight} required=${requiredCodePoints.length} PASS`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${weight} ${message}`);
      process.exitCode = 1;
    }
  }
}
