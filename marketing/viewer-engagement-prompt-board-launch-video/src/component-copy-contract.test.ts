import { describe, expect, test, vi } from "vitest";

vi.mock("./fonts", () => ({ PROMPT_BOARD_FONT_FAMILY: "test-font" }));

const COMPONENT_PATHS = [
  "./components/MemoHook.tsx",
  "./components/PromptBoardMock.tsx",
  "./components/Cursor.tsx",
  "./components/Caption.tsx",
  "./components/EndCard.tsx",
] as const;

const COMPONENT_SOURCES = import.meta.glob(
  [
    "./components/MemoHook.tsx",
    "./components/PromptBoardMock.tsx",
    "./components/Cursor.tsx",
    "./components/Caption.tsx",
    "./components/EndCard.tsx",
  ],
  { eager: true, import: "default", query: "?raw" },
);

const PRODUCT_LITERAL_PATTERN =
  /[\u3040-\u30ff\u3400-\u9fff]|Live Prompt Board|stream plan|talking point|next prompt|link in this post|free to use/i;
const PRODUCTION_DEPENDENCY_PATTERN =
  /(?:from\s*|import\s*\()["'][^"']*(?:\/src\/(?:app|components|lib)\/|runtime|storage)[^"']*["']|\b(?:localStorage|sessionStorage|indexedDB)\b/;

describe("prompt board video component copy boundary", () => {
  test("exports the reconstructed prompt-board owner", async () => {
    // Given: the component contract requires a concrete prompt-board renderer.
    // When: the renderer module is loaded from the package-local component layer.
    const implementation = await import("./components/PromptBoardMock").catch(() => undefined);

    // Then: a callable owner exists, so the source scan cannot pass vacuously.
    expect(implementation).toBeDefined();
    expect(typeof implementation?.PromptBoardMock).toBe("function");
  });

  test("keeps locale copy and production state outside every component", async () => {
    // Given: the exact five component files allowed by Task 4.
    const expectedPaths = [...COMPONENT_PATHS];

    // When: every required file is read directly, without directory-glob omissions.
    const sources = Object.entries(COMPONENT_SOURCES);

    // Then: all five exist and none owns product copy or production runtime/storage access.
    expect(sources.map(([path]) => path).sort()).toEqual(expectedPaths.sort());
    for (const [, source] of sources) {
      expect(typeof source).toBe("string");
      if (typeof source !== "string") {
        continue;
      }
      expect(source).not.toMatch(PRODUCT_LITERAL_PATTERN);
      expect(source).not.toMatch(PRODUCTION_DEPENDENCY_PATTERN);
    }
  });
});
