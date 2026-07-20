export type PromptCategory = "talking-point" | "question";
export type PromptSegment = "main" | "closing";
export type PromptTone = "casual";
export const PROMPT_IDS = [
  "prompt-weekly-recap",
  "prompt-current-favorite",
  "prompt-weekend-question",
] as const;
export type PromptId = (typeof PROMPT_IDS)[number];
export type PromptOrder = 0 | 1 | 2;

export type PromptCardFixture<Id extends PromptId, Order extends PromptOrder> = {
  readonly id: Id;
  readonly body: string;
  readonly category: PromptCategory;
  readonly segment: PromptSegment;
  readonly tone: PromptTone;
  readonly safetyNotes: "";
  readonly order: Order;
};

export type PromptFixtures = readonly [
  PromptCardFixture<(typeof PROMPT_IDS)[0], 0>,
  PromptCardFixture<(typeof PROMPT_IDS)[1], 1>,
  PromptCardFixture<(typeof PROMPT_IDS)[2], 2>,
];

export type PromptBoardCaptions = readonly [string, string, string, string, string, string, string, string];

export type PromptBoardVisualState =
  | { readonly kind: "plan-editor"; readonly typedCharacters: number }
  | { readonly kind: "plan-created" }
  | { readonly kind: "cards"; readonly visibleCards: 1 | 2 | 3 }
  | { readonly kind: "make-current"; readonly settled: boolean }
  | {
      readonly kind: "live";
      readonly selectedPromptId: (typeof PROMPT_IDS)[0] | (typeof PROMPT_IDS)[1] | null;
    }
  | {
      readonly kind: "next-prompt";
      readonly selectedPromptId: (typeof PROMPT_IDS)[0];
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
  readonly locale: "ja" | "en";
  readonly ui: PromptBoardUiLabels;
  readonly plan: {
    readonly id: "plan-weekend-chat";
    readonly title: string;
  };
  readonly prompts: PromptFixtures;
  readonly captions: PromptBoardCaptions;
};

const JA_UI_LABELS = {
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
  ui: JA_UI_LABELS,
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

const EN_UI_LABELS = {
  productTitle: "Live Prompt Board",
  tabs: {
    plans: "Stream Plans",
    cards: "Prompt Cards",
    live: "Live Mode",
  },
  newPlan: "New Stream Plan",
  makeCurrent: "Use for Current Stream",
  nextPrompt: "Next Prompt",
  planStatusLabels: {
    idea: "Idea",
    preparing: "Preparing",
    live: "Live",
  },
  promptStatusLabels: {
    talkingPoint: "Talking Point",
    question: "Question",
  },
  segmentLabels: {
    main: "Main",
    closing: "Closing",
  },
  toneLabels: {
    casual: "Casual",
  },
} as const satisfies PromptBoardUiLabels;

export const EN_CONTENT = {
  locale: "en",
  ui: EN_UI_LABELS,
  plan: {
    id: "plan-weekend-chat",
    title: "Weekend Chat",
  },
  prompts: [
    {
      id: "prompt-weekly-recap",
      body: "What happened this week",
      category: "talking-point",
      segment: "main",
      tone: "casual",
      safetyNotes: "",
      order: 0,
    },
    {
      id: "prompt-current-favorite",
      body: "What I’m into lately",
      category: "talking-point",
      segment: "main",
      tone: "casual",
      safetyNotes: "",
      order: 1,
    },
    {
      id: "prompt-weekend-question",
      body: "Ask about everyone’s weekend plans",
      category: "question",
      segment: "closing",
      tone: "casual",
      safetyNotes: "",
      order: 2,
    },
  ],
  captions: [
    "Ever lose track of what to say next?",
    "Start with a stream plan",
    "Organize your talking points",
    "Stay focused on the current topic",
    "From prep to live, keep every talking point in one place.",
    "Free to use",
    "Live Prompt Board",
    "Link in this post",
  ],
} as const satisfies PromptBoardVideoContent;

export const PRODUCT_TITLE = JA_CONTENT.ui.productTitle;
export const UI_LABELS_FOR_VIDEO = JA_CONTENT.ui;

export const JA_VIDEO_VISIBLE_TEXT = [
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

export const EN_VIDEO_VISIBLE_TEXT = [
  EN_CONTENT.ui.productTitle,
  EN_CONTENT.ui.tabs.plans,
  EN_CONTENT.ui.tabs.cards,
  EN_CONTENT.ui.tabs.live,
  EN_CONTENT.ui.newPlan,
  EN_CONTENT.ui.makeCurrent,
  EN_CONTENT.ui.nextPrompt,
  EN_CONTENT.ui.planStatusLabels.idea,
  EN_CONTENT.ui.planStatusLabels.preparing,
  EN_CONTENT.ui.planStatusLabels.live,
  EN_CONTENT.ui.promptStatusLabels.talkingPoint,
  EN_CONTENT.ui.promptStatusLabels.question,
  EN_CONTENT.ui.segmentLabels.main,
  EN_CONTENT.ui.segmentLabels.closing,
  EN_CONTENT.ui.toneLabels.casual,
  EN_CONTENT.plan.title,
  ...EN_CONTENT.prompts.map(({ body }) => body),
  ...EN_CONTENT.captions,
] as const;

export const VIDEO_VISIBLE_TEXT = [...JA_VIDEO_VISIBLE_TEXT, ...EN_VIDEO_VISIBLE_TEXT] as const;

export const JA_POST_COPY = `配信中に「次、何を話そう？」となる前に。

配信プランの作成から、話題の整理、配信中のカンペ表示まで、ブラウザだけでまとめて管理できます。

配信カンペボードは無料ですぐ使えます。
🔗 https://streamer-tools.kuro-lab.com/tools/viewer-engagement-prompt-board/

#VTuber #配信者向けツール`;

export const EN_POST_COPY = `Never wonder what to talk about next during a stream.

Create a stream plan, organize your talking points, and keep the current prompt visible while you’re live—all in your browser.

Live Prompt Board is free to use.
🔗 https://streamer-tools.kuro-lab.com/tools/viewer-engagement-prompt-board/

#VTuber #StreamerTools`;

export const STATIC_UI_COUNTER_TEXT = ["#1", "#2", "#3", "1 / 2", "2 / 2", "3件"] as const;

export const FONT_GLYPH_TEXT = Array.from(
  new Set([...VIDEO_VISIBLE_TEXT, ...STATIC_UI_COUNTER_TEXT].join("")),
)
  .sort((left, right) => (left.codePointAt(0) ?? 0) - (right.codePointAt(0) ?? 0))
  .join("");
