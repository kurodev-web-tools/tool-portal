import { useEffect, useState } from "react";
import { staticFile, useDelayRender } from "remotion";

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

class PromptBoardFontResponseError extends Error {
  readonly name = "PromptBoardFontResponseError";

  constructor(path: string, status: number) {
    super(`Package-local prompt-board font request failed (${status}): ${path}`);
  }
}

const normalizeFontLoadError = (error: unknown): Error =>
  error instanceof Error ? error : new PromptBoardFontLoadError(error);

const fetchFontBytes = async (path: string): Promise<ArrayBuffer> => {
  const response = await fetch(staticFile(path));
  if (!response.ok) {
    throw new PromptBoardFontResponseError(path, response.status);
  }
  return response.arrayBuffer();
};

export const loadPromptBoardFonts = async (): Promise<void> => {
  const faces = await Promise.all(
    FONT_ASSETS.map(async ({ path, weight }) => {
      const bytes = await fetchFontBytes(path);
      return new FontFace(PROMPT_BOARD_FONT_FAMILY, bytes, {
        style: "normal",
        weight,
      });
    }),
  );
  const loadedFaces = await Promise.all(faces.map((face) => face.load()));
  for (const face of loadedFaces) {
    document.fonts.add(face);
  }
};

export function PromptBoardFontGate(): null {
  const { cancelRender, continueRender, delayRender } = useDelayRender();
  const [fontRenderHandle] = useState(() => delayRender("Loading package-local prompt-board fonts"));

  useEffect(() => {
    loadPromptBoardFonts().then(
      () => continueRender(fontRenderHandle),
      (error: unknown) => cancelRender(normalizeFontLoadError(error)),
    );
  }, [cancelRender, continueRender, fontRenderHandle]);

  return null;
}
