import { describe, expect, expectTypeOf, test } from "vitest";
import type { PromptBoardVideoContent, PromptId } from "./content";

describe("Japanese prompt board video content contract", () => {
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
        order: 1,
      },
      {
        id: "prompt-current-favorite",
        body: "最近ハマっているもの",
        category: "talking-point",
        segment: "main",
        tone: "casual",
        safetyNotes: "",
        order: 2,
      },
      {
        id: "prompt-weekend-question",
        body: "みんなの週末予定を聞く",
        category: "question",
        segment: "closing",
        tone: "casual",
        safetyNotes: "",
        order: 3,
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
    expectTypeOf<PromptBoardVideoContent["prompts"]["length"]>().toEqualTypeOf<3>();
    expectTypeOf<PromptBoardVideoContent["prompts"][0]>().toExtend<{
      readonly id: "prompt-weekly-recap";
      readonly order: 1;
    }>();
    expectTypeOf<PromptBoardVideoContent["prompts"][1]>().toExtend<{
      readonly id: "prompt-current-favorite";
      readonly order: 2;
    }>();
    expectTypeOf<PromptBoardVideoContent["prompts"][2]>().toExtend<{
      readonly id: "prompt-weekend-question";
      readonly order: 3;
    }>();
    expectTypeOf<PromptBoardVideoContent["captions"]["length"]>().toEqualTypeOf<8>();
  });

  test("keeps every video-visible label Japanese and URL-free", async () => {
    const implementation = await import("./content").catch(() => undefined);
    expect(implementation).toBeDefined();
    if (!implementation) {
      return;
    }

    const { JA_CONTENT, VIDEO_VISIBLE_TEXT } = implementation;
    const visibleText = VIDEO_VISIBLE_TEXT.join("\n");

    expect(JA_CONTENT.ui.productTitle).toBe("配信カンペボード");
    expect(VIDEO_VISIBLE_TEXT).toEqual(
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

  test("keeps public post copy separate from video-visible text and locks glyph inputs", async () => {
    const implementation = await import("./content").catch(() => undefined);
    expect(implementation).toBeDefined();
    if (!implementation) {
      return;
    }

    const { FONT_GLYPH_TEXT, JA_CONTENT, JA_POST_COPY, STATIC_UI_COUNTER_TEXT, VIDEO_VISIBLE_TEXT } =
      implementation;
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
      ...STATIC_UI_COUNTER_TEXT,
    ];

    expect(VIDEO_VISIBLE_TEXT).toContain("リンクは投稿本文へ");
    expect(VIDEO_VISIBLE_TEXT.join("\n")).not.toContain(JA_POST_COPY);
    expect(JA_POST_COPY).toBe(`配信中に「次、何を話そう？」となる前に。

配信プランの作成から、話題の整理、配信中のカンペ表示まで、ブラウザだけでまとめて管理できます。

配信カンペボードは無料ですぐ使えます。
🔗 https://streamer-tools.kuro-lab.com/tools/viewer-engagement-prompt-board/

#VTuber #配信者向けツール`);
    expect(STATIC_UI_COUNTER_TEXT).toEqual(["#1", "#2", "#3", "1 / 2", "2 / 2", "3件"]);
    for (const text of visibleContentFields) {
      for (const character of text) {
        expect(FONT_GLYPH_TEXT).toContain(character);
      }
    }
  });
});
