import type { PromptBoardUiLabels, PromptBoardVideoContent } from "./content";

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

export const EN_POST_COPY = `Never wonder what to talk about next during a stream.

Create a stream plan, organize your talking points, and keep the current prompt visible while you’re live—all in your browser.

Live Prompt Board is free to use.
🔗 https://streamer-tools.kuro-lab.com/tools/viewer-engagement-prompt-board/

#VTuber #StreamerTools`;
