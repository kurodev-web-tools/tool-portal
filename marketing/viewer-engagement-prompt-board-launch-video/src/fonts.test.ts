import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const remotion = vi.hoisted(() => ({
  cancelRender: vi.fn(),
  continueRender: vi.fn(),
  delayRender: vi.fn(() => 73),
  staticFile: vi.fn((path: string) => `/static/${path}`),
}));

vi.mock("remotion", () => remotion);

type LoadedFace = {
  readonly family: string;
  readonly source: string;
  readonly descriptors: FontFaceDescriptors;
};

const loadedFaces: LoadedFace[] = [];
let rejectedWeight: string | null = null;
let documentFontsReady: Promise<void>;
let resolveDocumentFonts: (() => void) | null;

class TestFontFace {
  readonly family: string;
  readonly source: string;
  readonly descriptors: FontFaceDescriptors;

  constructor(family: string, source: string, descriptors: FontFaceDescriptors) {
    this.family = family;
    this.source = source;
    this.descriptors = descriptors;
  }

  async load(): Promise<TestFontFace> {
    if (this.descriptors.weight === rejectedWeight) {
      throw new Error(`font ${rejectedWeight} rejected`);
    }
    loadedFaces.push(this);
    return this;
  }
}

describe("prompt-board package fonts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    loadedFaces.length = 0;
    rejectedWeight = null;
    resolveDocumentFonts = null;
    documentFontsReady = new Promise((resolve) => {
      resolveDocumentFonts = resolve;
    });
    vi.stubGlobal("FontFace", TestFontFace);
    vi.stubGlobal("document", {
      fonts: {
        add: vi.fn(),
        ready: documentFontsReady,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("continues rendering only after both package-local weights and the document font set are ready", async () => {
    const module = await import("./fonts");

    expect(remotion.delayRender).toHaveBeenCalledOnce();
    expect(remotion.continueRender).not.toHaveBeenCalled();
    expect(loadedFaces.map(({ descriptors }) => descriptors.weight)).toEqual(["700", "900"]);
    expect(loadedFaces.map(({ source }) => source)).toEqual([
      'url("/static/fonts/noto-sans-jp-700-promo-v1.woff2")',
      'url("/static/fonts/noto-sans-jp-900-promo-v1.woff2")',
    ]);

    resolveDocumentFonts?.();
    await module.PROMPT_BOARD_FONTS_READY;

    expect(document.fonts.add).toHaveBeenCalledTimes(2);
    expect(remotion.continueRender).toHaveBeenCalledExactlyOnceWith(73);
    expect(remotion.cancelRender).not.toHaveBeenCalled();
  });

  it("cancels rendering without continuing when either package-local weight fails", async () => {
    rejectedWeight = "900";

    const module = await import("./fonts");
    await module.PROMPT_BOARD_FONTS_READY;

    expect(remotion.cancelRender).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
    expect(remotion.continueRender).not.toHaveBeenCalled();
  });
});
