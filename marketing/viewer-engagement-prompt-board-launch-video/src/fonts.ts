import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

export const PROMPT_BOARD_FONT_FAMILY = "Prompt Board Noto Sans JP";

const FONT_ASSETS = [
  { path: "fonts/noto-sans-jp-700-promo-v1.woff2", weight: "700" },
  { path: "fonts/noto-sans-jp-900-promo-v1.woff2", weight: "900" },
] as const;

class PromptBoardFontLoadError extends Error {
  readonly name = "PromptBoardFontLoadError";

  constructor(cause: unknown) {
    super("Package-local prompt-board fonts failed to load", { cause });
  }
}

const normalizeFontLoadError = (error: unknown): Error =>
  error instanceof Error ? error : new PromptBoardFontLoadError(error);

const fontRenderHandle = delayRender("Loading package-local prompt-board fonts");

const loadPromptBoardFonts = async (): Promise<void> => {
  try {
    const faces = FONT_ASSETS.map(
      ({ path, weight }) =>
        new FontFace(PROMPT_BOARD_FONT_FAMILY, `url("${staticFile(path)}")`, {
          style: "normal",
          weight,
        }),
    );
    const loadedFaces = await Promise.all(faces.map((face) => face.load()));
    for (const face of loadedFaces) {
      document.fonts.add(face);
    }
    await document.fonts.ready;
    continueRender(fontRenderHandle);
  } catch (error: unknown) {
    cancelRender(normalizeFontLoadError(error));
  }
};

export const PROMPT_BOARD_FONTS_READY = loadPromptBoardFonts();
