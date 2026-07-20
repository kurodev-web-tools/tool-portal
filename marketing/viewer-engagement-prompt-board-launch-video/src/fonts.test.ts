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

type LoadControl = {
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
};

const constructedFaces: LoadedFace[] = [];
const loadControls = new Map<string, LoadControl>();

class TestFontFace {
  readonly family: string;
  readonly source: string;
  readonly descriptors: FontFaceDescriptors;

  constructor(family: string, source: string, descriptors: FontFaceDescriptors) {
    this.family = family;
    this.source = source;
    this.descriptors = descriptors;
    constructedFaces.push(this);
  }

  load(): Promise<TestFontFace> {
    return new Promise((resolve, reject) => {
      loadControls.set(this.descriptors.weight ?? "", {
        resolve: () => resolve(this),
        reject,
      });
    });
  }
}

describe("prompt-board package fonts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    constructedFaces.length = 0;
    loadControls.clear();
    vi.stubGlobal("FontFace", TestFontFace);
    vi.stubGlobal("document", {
      fonts: {
        add: vi.fn(),
        get ready(): never {
          throw new Error("document.fonts.ready must not own render readiness");
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("continues rendering only after both exact package-local weights load", async () => {
    const module = await import("./fonts");

    expect(remotion.delayRender).toHaveBeenCalledOnce();
    expect(remotion.continueRender).not.toHaveBeenCalled();
    expect(constructedFaces.map(({ descriptors }) => descriptors.weight)).toEqual(["700", "900"]);
    expect(constructedFaces.map(({ source }) => source)).toEqual([
      'url("/static/fonts/noto-sans-jp-700-promo-v1.woff2")',
      'url("/static/fonts/noto-sans-jp-900-promo-v1.woff2")',
    ]);

    loadControls.get("700")?.resolve();
    await Promise.resolve();
    expect(document.fonts.add).not.toHaveBeenCalled();
    expect(remotion.continueRender).not.toHaveBeenCalled();

    loadControls.get("900")?.resolve();
    await module.PROMPT_BOARD_FONTS_READY;

    expect(document.fonts.add).toHaveBeenCalledTimes(2);
    expect(remotion.continueRender).toHaveBeenCalledExactlyOnceWith(73);
    expect(remotion.cancelRender).not.toHaveBeenCalled();
  });

  it.each(["700", "900"])(
    "cancels rendering without continuing when package-local weight %s fails",
    async (failedWeight) => {
      const module = await import("./fonts");
      const otherWeight = failedWeight === "700" ? "900" : "700";

      loadControls.get(otherWeight)?.resolve();
      loadControls.get(failedWeight)?.reject(new Error(`font ${failedWeight} rejected`));
      await module.PROMPT_BOARD_FONTS_READY;

      expect(remotion.cancelRender).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
      expect(remotion.continueRender).not.toHaveBeenCalled();
    },
  );
});
