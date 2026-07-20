import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { Caption } from "./components/Caption";
import { Cursor } from "./components/Cursor";
import { EndCard } from "./components/EndCard";
import { MemoHook } from "./components/MemoHook";
import { PromptBoardMock } from "./components/PromptBoardMock";
import { FONT_GLYPH_TEXT, JA_CONTENT, type PromptBoardVisualState } from "./content";
import { TOKENS } from "./tokens";

vi.mock("./fonts", () => ({ PROMPT_BOARD_FONT_FAMILY: "test-font" }));

const COMPONENT_PATHS = [
  "./components/MemoHook.tsx",
  "./components/PromptBoardMock.tsx",
  "./components/Cursor.tsx",
  "./components/Caption.tsx",
  "./components/EndCard.tsx",
] as const;

const COMPONENT_SOURCES = import.meta.glob("./components/**/*.{ts,tsx}", {
  eager: true,
  import: "default",
  query: "?raw",
});

const VISUAL_STATES = [
  { kind: "plan-editor", typedCharacters: 1 },
  { kind: "plan-created" },
  { kind: "cards", visibleCards: 1 },
  { kind: "cards", visibleCards: 2 },
  { kind: "cards", visibleCards: 3 },
  { kind: "make-current", settled: false },
  { kind: "make-current", settled: true },
  { kind: "live", selectedPromptId: null },
  { kind: "live", selectedPromptId: JA_CONTENT.prompts[0].id },
  { kind: "live", selectedPromptId: JA_CONTENT.prompts[1].id },
  { kind: "next-prompt", selectedPromptId: JA_CONTENT.prompts[0].id, pressed: false },
  { kind: "next-prompt", selectedPromptId: JA_CONTENT.prompts[0].id, pressed: true },
] as const satisfies readonly PromptBoardVisualState[];

const renderBoard = (state: PromptBoardVisualState): string =>
  renderToStaticMarkup(
    createElement(PromptBoardMock, { content: JA_CONTENT, state, opacity: 1, scale: 1, translateY: 0 }),
  );

function renderedText(markup: string): string {
  return markup
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

function detailHeadingText(markup: string): string {
  const heading = /<h2[^>]*>(.*?)<\/h2>/s.exec(markup);
  return renderedText(heading?.[1] ?? "");
}

function actionStyleFor(markup: string, label: string): string {
  const action = Array.from(markup.matchAll(/<div style="([^"]*)">([^<]*)<\/div>/g)).find(
    (match) => renderedText(match[2] ?? "") === label,
  );
  return action?.[1] ?? "";
}

const PRODUCT_LITERAL_PATTERN =
  /[\u3040-\u30ff\u3400-\u9fff]|Live Prompt Board|stream plan|talking point|next prompt|link in this post|free to use/i;
const PRODUCTION_DEPENDENCY_PATTERN =
  /(?:from\s*|import\s*\()["'][^"']*(?:\/src\/(?:app|components|lib)\/|runtime|storage)[^"']*["']|\b(?:localStorage|sessionStorage|indexedDB)\b/;
const TEST_ONLY_ATTRIBUTE_PATTERN = /data-(?:current-prompt-id|next-action-state|cursor-phase)/;

describe("prompt board video component copy boundary", () => {
  test("exports the reconstructed prompt-board owner", async () => {
    // Given: the component contract requires a concrete prompt-board renderer.
    // When: the renderer module is loaded from the package-local component layer.
    const implementation = await import("./components/PromptBoardMock").catch(() => undefined);

    // Then: a callable owner exists, so the source scan cannot pass vacuously.
    expect(implementation).toBeDefined();
    expect(typeof implementation?.PromptBoardMock).toBe("function");
    expect(
      [MemoHook, PromptBoardMock, Cursor, Caption, EndCard].every((owner) => typeof owner === "function"),
    ).toBe(true);
  });

  test("keeps locale copy and production state outside every component", async () => {
    // Given: the exact five component files allowed by Task 4.
    const expectedPaths = [...COMPONENT_PATHS];

    // When: every required file is read directly, without directory-glob omissions.
    const sources = Object.entries(COMPONENT_SOURCES);

    // Then: all five exist and none owns product copy or production runtime/storage access.
    expect(sources.map(([path]) => path)).toEqual(expect.arrayContaining(expectedPaths));
    for (const [, source] of sources) {
      expect(typeof source).toBe("string");
      if (typeof source !== "string") {
        continue;
      }
      expect(source).not.toMatch(PRODUCT_LITERAL_PATTERN);
      expect(source).not.toMatch(PRODUCTION_DEPENDENCY_PATTERN);
      expect(source).not.toMatch(TEST_ONLY_ATTRIBUTE_PATTERN);
    }
  });

  test("renders every visual-state boundary with its meaningful content", () => {
    // Given: each locked PromptBoardVisualState boundary from planning through live operation.
    const renderedStates = VISUAL_STATES.map((state) => ({ state, markup: renderBoard(state) }));

    // When: every boundary is rendered through the real reconstructed component.
    const cards = renderedStates.filter(({ state }) => state.kind === "cards");
    const unsettled = renderBoard({ kind: "make-current", settled: false });
    const settled = renderBoard({ kind: "make-current", settled: true });
    const liveEmpty = renderBoard({ kind: "live", selectedPromptId: null });

    // Then: plans, incremental cards, both activation states, and an initially empty live detail remain meaningful.
    expect(renderedStates.every(({ markup }) => markup.includes(JA_CONTENT.ui.productTitle))).toBe(true);
    expect(renderBoard({ kind: "plan-editor", typedCharacters: 1 })).toContain(
      JA_CONTENT.plan.title.slice(0, 1),
    );
    expect(renderBoard({ kind: "plan-created" })).toContain(JA_CONTENT.plan.title);
    expect(
      cards.map(({ markup }) => JA_CONTENT.prompts.filter(({ body }) => markup.includes(body)).length),
    ).toEqual([1, 2, 3]);
    expect(unsettled).toContain(JA_CONTENT.ui.planStatusLabels.idea);
    expect(settled).toContain(JA_CONTENT.ui.planStatusLabels.live);
    expect(actionStyleFor(unsettled, JA_CONTENT.ui.makeCurrent)).toContain(`background:${TOKENS.primary}`);
    expect(actionStyleFor(unsettled, JA_CONTENT.ui.makeCurrent)).toContain("transform:scale(1)");
    expect(actionStyleFor(settled, JA_CONTENT.ui.makeCurrent)).toContain(
      `background:${TOKENS.primaryStrong}`,
    );
    expect(actionStyleFor(settled, JA_CONTENT.ui.makeCurrent)).toContain("transform:scale(1)");
    expect(detailHeadingText(liveEmpty)).toBe("");
  });

  test("switches directly from prompt one to prompt two without completion UI", () => {
    // Given: prompt one, prompt two, and both next-action feedback boundaries.
    const promptOne = renderBoard({ kind: "live", selectedPromptId: JA_CONTENT.prompts[0].id });
    const nextIdle = renderBoard({
      kind: "next-prompt",
      selectedPromptId: JA_CONTENT.prompts[0].id,
      pressed: false,
    });
    const nextPressed = renderBoard({
      kind: "next-prompt",
      selectedPromptId: JA_CONTENT.prompts[0].id,
      pressed: true,
    });
    const promptTwo = renderBoard({ kind: "live", selectedPromptId: JA_CONTENT.prompts[1].id });

    // When: the next action advances from the first current prompt.
    const renderedFlow = [promptOne, nextIdle, nextPressed, promptTwo].join("\n");

    // Then: both feedback states exist, prompt two replaces prompt one directly, and no completion copy appears.
    expect(promptOne).toContain(JA_CONTENT.ui.nextPrompt);
    expect(detailHeadingText(promptOne)).toBe(JA_CONTENT.prompts[0].body);
    expect(detailHeadingText(nextIdle)).toBe(JA_CONTENT.prompts[0].body);
    expect(detailHeadingText(nextPressed)).toBe(JA_CONTENT.prompts[0].body);
    expect(detailHeadingText(promptTwo)).toBe(JA_CONTENT.prompts[1].body);
    expect(actionStyleFor(nextIdle, JA_CONTENT.ui.nextPrompt)).toContain(`background:${TOKENS.primary}`);
    expect(actionStyleFor(nextIdle, JA_CONTENT.ui.nextPrompt)).toContain("transform:scale(1)");
    expect(actionStyleFor(nextPressed, JA_CONTENT.ui.nextPrompt)).toContain(
      `background:${TOKENS.primaryStrong}`,
    );
    expect(actionStyleFor(nextPressed, JA_CONTENT.ui.nextPrompt)).toContain("transform:scale(0.97)");
    expect(promptTwo).not.toContain(JA_CONTENT.ui.nextPrompt);
    expect(renderedFlow).not.toMatch(/完了|completed/i);
  });

  test("renders all cursor phases through SVG shape, transform, and press ring", () => {
    // Given: all four deterministic cursor phases at one fixed position.
    const cursorMarkup = {
      idle: renderToStaticMarkup(createElement(Cursor, { x: 120, y: 240, opacity: 1, phase: "idle" })),
      moving: renderToStaticMarkup(createElement(Cursor, { x: 120, y: 240, opacity: 1, phase: "moving" })),
      pressed: renderToStaticMarkup(createElement(Cursor, { x: 120, y: 240, opacity: 1, phase: "pressed" })),
      settled: renderToStaticMarkup(createElement(Cursor, { x: 120, y: 240, opacity: 1, phase: "settled" })),
    } as const;

    // When: each phase is rendered without a mirrored phase attribute.
    const pressRing = `border:4px solid ${TOKENS.primaryStrong}`;

    // Then: SVG remains present, motion scales differ, and only the pressed phase owns the feedback ring.
    expect(Object.values(cursorMarkup).every((markup) => markup.includes("<svg"))).toBe(true);
    expect(cursorMarkup.idle).toContain("scale(1)");
    expect(cursorMarkup.moving).toContain("scale(1.04)");
    expect(cursorMarkup.pressed).toContain("scale(0.86)");
    expect(cursorMarkup.settled).toContain("scale(1)");
    expect(cursorMarkup.pressed).toContain(pressRing);
    expect(cursorMarkup.idle).not.toContain(pressRing);
    expect(cursorMarkup.moving).not.toContain(pressRing);
    expect(cursorMarkup.settled).not.toContain(pressRing);
  });

  test("covers every rendered component text codepoint with the package-local font corpus", () => {
    // Given: all board states plus every text-bearing leaf component.
    const markup = [
      ...VISUAL_STATES.map(renderBoard),
      renderToStaticMarkup(
        createElement(MemoHook, {
          headline: JA_CONTENT.captions[0],
          notes: JA_CONTENT.prompts.map(({ body }) => body),
          opacity: 1,
          translateY: 0,
        }),
      ),
      renderToStaticMarkup(
        createElement(Caption, { text: JA_CONTENT.captions[4], opacity: 1, translateY: 0 }),
      ),
      renderToStaticMarkup(createElement(EndCard, { content: JA_CONTENT, opacity: 1, translateY: 0 })),
    ].join("\n");

    // When: HTML markup is removed and React's possible text entities are decoded.
    const visibleCodepoints = new Set(
      Array.from(renderedText(markup)).filter((character) => !/\s/u.test(character)),
    );
    const allowedCodepoints = new Set(Array.from(FONT_GLYPH_TEXT));

    // Then: no implementation-owned visible glyph can fall through to a system font.
    expect([...visibleCodepoints].filter((character) => !allowedCodepoints.has(character))).toEqual([]);
  });
});
