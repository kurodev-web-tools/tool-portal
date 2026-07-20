import { describe, expect, expectTypeOf, test } from "vitest";
import type { PromptBoardVideoContent, PromptBoardVisualState, PromptId, PromptOrder } from "./content";

type PromptIds = typeof import("./content").PROMPT_IDS;
type LiveVisualState = Extract<PromptBoardVisualState, { readonly kind: "live" }>;
type NextPromptVisualState = Extract<PromptBoardVisualState, { readonly kind: "next-prompt" }>;

describe("bilingual prompt board video content contract", () => {
  test("provides the locked weekend-chat fixture and Japanese captions", async () => {
    const implementation = await import("./content").catch(() => undefined);
    expect(implementation).toBeDefined();
    if (!implementation) {
      return;
    }

    const { JA_CONTENT } = implementation;

    expect(JA_CONTENT.plan).toEqual({ id: "plan-weekend-chat", title: "週末雑談" });
    expect(JA_CONTENT.prompts).toEqual([
      {
        id: "prompt-weekly-recap",
        body: "今週あったこと",
        category: "talking-point",
        segment: "main",
        tone: "casual",
        safetyNotes: "",
        order: 0,
      },
      {
        id: "prompt-current-favorite",
        body: "最近ハマっているもの",
        category: "talking-point",
        segment: "main",
        tone: "casual",
        safetyNotes: "",
        order: 1,
      },
      {
        id: "prompt-weekend-question",
        body: "みんなの週末予定を聞く",
        category: "question",
        segment: "closing",
        tone: "casual",
        safetyNotes: "",
        order: 2,
      },
    ]);
    expect(JA_CONTENT.captions).toEqual([
      "配信中、次に何を話すか迷ってない？",
      "まずは配信プランを作成",
      "話したいことをカンペにまとめる",
      "配信中は、今の話題に集中",
      "準備から配信中まで、話すことをひとつに。",
      "無料ですぐ使える",
      "配信カンペボード",
      "リンクは投稿本文へ",
    ]);
    expectTypeOf<PromptId>().toEqualTypeOf<
      "prompt-weekly-recap" | "prompt-current-favorite" | "prompt-weekend-question"
    >();
    expectTypeOf<PromptOrder>().toEqualTypeOf<0 | 1 | 2>();
    expectTypeOf<PromptBoardVideoContent["prompts"]["length"]>().toEqualTypeOf<3>();
    expectTypeOf<PromptBoardVideoContent["prompts"][0]>().toExtend<{
      readonly id: "prompt-weekly-recap";
      readonly order: 0;
    }>();
    expectTypeOf<PromptBoardVideoContent["prompts"][1]>().toExtend<{
      readonly id: "prompt-current-favorite";
      readonly order: 1;
    }>();
    expectTypeOf<PromptBoardVideoContent["prompts"][2]>().toExtend<{
      readonly id: "prompt-weekend-question";
      readonly order: 2;
    }>();
    expectTypeOf<PromptBoardVideoContent["captions"]["length"]>().toEqualTypeOf<8>();
    expectTypeOf<LiveVisualState["selectedPromptId"]>().toEqualTypeOf<PromptIds[0] | PromptIds[1] | null>();
    expectTypeOf<NextPromptVisualState["selectedPromptId"]>().toEqualTypeOf<PromptIds[0]>();
  });

  test("keeps every Japanese video-visible label localized and URL-free", async () => {
    const implementation = await import("./content").catch(() => undefined);
    expect(implementation).toBeDefined();
    if (!implementation) {
      return;
    }

    const { JA_CONTENT, JA_VIDEO_VISIBLE_TEXT } = implementation;
    const visibleText = JA_VIDEO_VISIBLE_TEXT.join("\n");

    expect(JA_CONTENT.ui.productTitle).toBe("配信カンペボード");
    expect(JA_VIDEO_VISIBLE_TEXT).toEqual(
      expect.arrayContaining([
        "配信カンペボード",
        "配信プラン",
        "カンペ編集",
        "配信中",
        "新しい配信プラン",
        "現在の配信にする",
        "次のカンペ",
        "アイデア",
        "準備中",
        "トークポイント",
        "質問",
        "本編",
        "クロージング",
        "カジュアル",
      ]),
    );
    expect(visibleText).not.toContain("https://");
    expect(visibleText).not.toMatch(/completed|完了/);
    expect(JA_CONTENT.ui.planStatusLabels).toEqual({
      idea: "アイデア",
      preparing: "準備中",
      live: "配信中",
    });
    expect(JA_CONTENT.ui.promptStatusLabels).toEqual({
      talkingPoint: "トークポイント",
      question: "質問",
    });
    expect(JA_CONTENT.ui.segmentLabels).toEqual({ main: "本編", closing: "クロージング" });
    expect(JA_CONTENT.ui.toneLabels).toEqual({ casual: "カジュアル" });
  });

  test("provides complete English UI, fixture, captions, and structurally identical prompt metadata", async () => {
    const implementation = await import("./content");
    const { EN_CONTENT, EN_VIDEO_VISIBLE_TEXT, JA_CONTENT } = implementation;

    expect(EN_CONTENT.plan).toEqual({ id: "plan-weekend-chat", title: "Weekend Chat" });
    expect(EN_CONTENT.prompts.map(({ body }) => body)).toEqual([
      "What happened this week",
      "What I’m into lately",
      "Ask about everyone’s weekend plans",
    ]);
    expect(EN_CONTENT.captions).toEqual([
      "Ever lose track of what to say next?",
      "Start with a stream plan",
      "Organize your talking points",
      "Stay focused on the current topic",
      "From prep to live, keep every talking point in one place.",
      "Free to use",
      "Live Prompt Board",
      "Link in this post",
    ]);
    expect(EN_CONTENT.ui).toEqual({
      productTitle: "Live Prompt Board",
      tabs: { plans: "Stream Plans", cards: "Prompt Cards", live: "Live Mode" },
      newPlan: "New Stream Plan",
      makeCurrent: "Use for Current Stream",
      nextPrompt: "Next Prompt",
      planStatusLabels: { idea: "Idea", preparing: "Preparing", live: "Live" },
      promptStatusLabels: { talkingPoint: "Talking Point", question: "Question" },
      segmentLabels: { main: "Main", closing: "Closing" },
      toneLabels: { casual: "Casual" },
    });
    expect(EN_CONTENT.prompts.map(({ body: _body, ...prompt }) => prompt)).toEqual(
      JA_CONTENT.prompts.map(({ body: _body, ...prompt }) => prompt),
    );
    expect(EN_VIDEO_VISIBLE_TEXT.join("\n")).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/u);
    expect(EN_VIDEO_VISIBLE_TEXT.join("\n")).not.toContain("https://");
  });

  test("keeps public post copy separate from video-visible text and locks glyph inputs", async () => {
    const implementation = await import("./content").catch(() => undefined);
    expect(implementation).toBeDefined();
    if (!implementation) {
      return;
    }

    const {
      EN_CONTENT,
      EN_POST_COPY,
      FONT_GLYPH_TEXT,
      JA_CONTENT,
      JA_POST_COPY,
      STATIC_UI_COUNTER_TEXT,
      VIDEO_VISIBLE_TEXT,
    } = implementation;
    const visibleContentFields = [
      JA_CONTENT.ui.productTitle,
      ...Object.values(JA_CONTENT.ui.tabs),
      JA_CONTENT.ui.newPlan,
      JA_CONTENT.ui.makeCurrent,
      JA_CONTENT.ui.nextPrompt,
      ...Object.values(JA_CONTENT.ui.planStatusLabels),
      ...Object.values(JA_CONTENT.ui.promptStatusLabels),
      ...Object.values(JA_CONTENT.ui.segmentLabels),
      ...Object.values(JA_CONTENT.ui.toneLabels),
      JA_CONTENT.plan.title,
      ...JA_CONTENT.prompts.map(({ body }) => body),
      ...JA_CONTENT.captions,
      EN_CONTENT.ui.productTitle,
      ...Object.values(EN_CONTENT.ui.tabs),
      EN_CONTENT.ui.newPlan,
      EN_CONTENT.ui.makeCurrent,
      EN_CONTENT.ui.nextPrompt,
      ...Object.values(EN_CONTENT.ui.planStatusLabels),
      ...Object.values(EN_CONTENT.ui.promptStatusLabels),
      ...Object.values(EN_CONTENT.ui.segmentLabels),
      ...Object.values(EN_CONTENT.ui.toneLabels),
      EN_CONTENT.plan.title,
      ...EN_CONTENT.prompts.map(({ body }) => body),
      ...EN_CONTENT.captions,
      ...STATIC_UI_COUNTER_TEXT,
    ];
    const expectedGlyphCorpus = Array.from(new Set(visibleContentFields.join("")))
      .sort((left, right) => (left.codePointAt(0) ?? 0) - (right.codePointAt(0) ?? 0))
      .join("");

    expect(VIDEO_VISIBLE_TEXT).toContain("リンクは投稿本文へ");
    expect(VIDEO_VISIBLE_TEXT).toContain("Link in this post");
    expect(VIDEO_VISIBLE_TEXT.join("\n")).not.toContain(JA_POST_COPY);
    expect(JA_POST_COPY).toBe(`配信中に「次、何を話そう？」となる前に。

配信プランの作成から、話題の整理、配信中のカンペ表示まで、ブラウザだけでまとめて管理できます。

配信カンペボードは無料ですぐ使えます。
🔗 https://streamer-tools.kuro-lab.com/tools/viewer-engagement-prompt-board/

#VTuber #配信者向けツール`);
    expect(EN_POST_COPY).toBe(`Never wonder what to talk about next during a stream.

Create a stream plan, organize your talking points, and keep the current prompt visible while you’re live—all in your browser.

Live Prompt Board is free to use.
🔗 https://streamer-tools.kuro-lab.com/tools/viewer-engagement-prompt-board/

#VTuber #StreamerTools`);
    expect(STATIC_UI_COUNTER_TEXT).toEqual(["#1", "#2", "#3", "1 / 2", "2 / 2", "3件"]);
    expect(FONT_GLYPH_TEXT).toBe(expectedGlyphCorpus);
  });
});
