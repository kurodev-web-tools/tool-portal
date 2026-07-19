export type PromptCategory = "talking-point" | "question";
export type PromptSegment = "main" | "closing";
export type PromptTone = "casual";

export type PromptCardFixture = {
  readonly id: string;
  readonly body: string;
  readonly category: PromptCategory;
  readonly segment: PromptSegment;
  readonly tone: PromptTone;
  readonly safetyNotes: "";
  readonly order: number;
};

export type PromptBoardVisualState =
  | { readonly kind: "plan-editor"; readonly typedCharacters: number }
  | { readonly kind: "plan-created" }
  | { readonly kind: "cards"; readonly visibleCards: 1 | 2 | 3 }
  | { readonly kind: "make-current"; readonly settled: boolean }
  | { readonly kind: "live"; readonly selectedPromptId: "prompt-weekly-recap" | "prompt-current-favorite" }
  | {
      readonly kind: "next-prompt";
      readonly selectedPromptId: "prompt-weekly-recap";
      readonly pressed: boolean;
    };

export type PromptBoardUiLabels = {
  readonly productTitle: string;
  readonly tabs: {
    readonly plans: string;
    readonly cards: string;
    readonly live: string;
  };
  readonly newPlan: string;
  readonly makeCurrent: string;
  readonly nextPrompt: string;
  readonly planStatusLabels: {
    readonly idea: string;
    readonly preparing: string;
    readonly live: string;
  };
  readonly promptStatusLabels: {
    readonly talkingPoint: string;
    readonly question: string;
  };
  readonly segmentLabels: {
    readonly main: string;
    readonly closing: string;
  };
  readonly toneLabels: {
    readonly casual: string;
  };
};

export type PromptBoardVideoContent = {
  readonly locale: "ja";
  readonly ui: PromptBoardUiLabels;
  readonly plan: {
    readonly id: "plan-weekend-chat";
    readonly title: "週末雑談";
  };
  readonly prompts: readonly PromptCardFixture[];
  readonly captions: readonly string[];
};

const UI_LABELS = {
  productTitle: "配信カンペボード",
  tabs: {
    plans: "配信プラン",
    cards: "カンペ編集",
    live: "配信中",
  },
  newPlan: "新しい配信プラン",
  makeCurrent: "現在の配信にする",
  nextPrompt: "次のカンペ",
  planStatusLabels: {
    idea: "アイデア",
    preparing: "準備中",
    live: "配信中",
  },
  promptStatusLabels: {
    talkingPoint: "トークポイント",
    question: "質問",
  },
  segmentLabels: {
    main: "本編",
    closing: "クロージング",
  },
  toneLabels: {
    casual: "カジュアル",
  },
} as const satisfies PromptBoardUiLabels;

export const JA_CONTENT = {
  locale: "ja",
  ui: UI_LABELS,
  plan: {
    id: "plan-weekend-chat",
    title: "週末雑談",
  },
  prompts: [
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
  ],
  captions: [
    "配信中、次に何を話すか迷ってない？",
    "まずは配信プランを作成",
    "話したいことをカンペにまとめる",
    "配信中は、今の話題に集中",
    "準備から配信中まで、話すことをひとつに。",
    "無料ですぐ使える",
    "配信カンペボード",
    "リンクは投稿本文へ",
  ],
} as const satisfies PromptBoardVideoContent;

export const PRODUCT_TITLE = JA_CONTENT.ui.productTitle;
export const UI_LABELS_FOR_VIDEO = JA_CONTENT.ui;

export const VIDEO_VISIBLE_TEXT = [
  JA_CONTENT.ui.productTitle,
  JA_CONTENT.ui.tabs.plans,
  JA_CONTENT.ui.tabs.cards,
  JA_CONTENT.ui.tabs.live,
  JA_CONTENT.ui.newPlan,
  JA_CONTENT.ui.makeCurrent,
  JA_CONTENT.ui.nextPrompt,
  JA_CONTENT.ui.planStatusLabels.idea,
  JA_CONTENT.ui.planStatusLabels.preparing,
  JA_CONTENT.ui.planStatusLabels.live,
  JA_CONTENT.ui.promptStatusLabels.talkingPoint,
  JA_CONTENT.ui.promptStatusLabels.question,
  JA_CONTENT.ui.segmentLabels.main,
  JA_CONTENT.ui.segmentLabels.closing,
  JA_CONTENT.ui.toneLabels.casual,
  JA_CONTENT.plan.title,
  ...JA_CONTENT.prompts.map(({ body }) => body),
  ...JA_CONTENT.captions,
] as const;

export const JA_POST_COPY = `配信中に「次、何を話そう？」となる前に。

配信プランの作成から、話題の整理、配信中のカンペ表示まで、ブラウザだけでまとめて管理できます。

配信カンペボードは無料ですぐ使えます。
🔗 https://streamer-tools.kuro-lab.com/tools/viewer-engagement-prompt-board/

#VTuber #配信者向けツール`;

export const STATIC_UI_COUNTER_TEXT = ["#1", "#2", "#3", "1 / 2", "2 / 2", "3件"] as const;

export const FONT_GLYPH_TEXT = Array.from(
  new Set([...VIDEO_VISIBLE_TEXT, ...STATIC_UI_COUNTER_TEXT].join("")),
)
  .sort((left, right) => (left.codePointAt(0) ?? 0) - (right.codePointAt(0) ?? 0))
  .join("");
