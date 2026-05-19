import type { Locale } from "@/lib/locale";
import type { SuiteKey } from "@/lib/suite-types";
import type { ToolCategory, ToolStatus } from "@/lib/tools";

type ToolCopy = {
  name: string;
  description: string;
  notice?: string;
};

type SuiteCopy = {
  name: string;
  description: string;
  tags: string[];
};

const toolCopy = {
  ja: {
    "schedule-calendar": {
      name: "Schedule Calendar",
      description: "配信予定と告知文を管理し、サムネ作成やSNS分割画像作成へ一時handoffできます。"
    },
    "thumbnail-editor": {
      name: "Thumbnail Editor",
      description: "用途別プリセットを選んで、文字と立ち絵を差し替えるVTuber向けサムネ組み立てツールです。",
      notice: "内蔵プリセットには、当方で生成・加工した抽象背景や装飾素材を含みます。"
    },
    "sns-split-image-maker": {
      name: "SNS分割画像メーカー",
      description: "X向けの2分割 / 3分割 / 4分割画像を手動調整し、投稿順どおりに個別PNG/JPEGで書き出せます。"
    },
    "stream-manager": {
      name: "Stream Manager",
      description: "配信前後の管理をまとめる追加ツールとして準備中です。公開後に順次追加予定です。"
    },
    "analytics-dashboard": {
      name: "Analytics Dashboard",
      description: "配信データの確認を支える追加ツールとして準備中です。公開後に順次追加予定です。"
    },
    "fan-community": {
      name: "Fan Community",
      description: "ファン交流の整理を支える追加ツールとして準備中です。公開後に順次追加予定です。"
    },
    "content-planner": {
      name: "Content Planner",
      description: "企画メモや配信準備をまとめる追加ツールとして準備中です。公開後に順次追加予定です。"
    },
    "task-tracker": {
      name: "Task Tracker",
      description: "制作タスク管理を支える追加ツールとして準備中です。公開後に順次追加予定です。"
    },
    "asset-library": {
      name: "Asset Library",
      description: "素材整理を支える追加ツールとして準備中です。公開後に順次追加予定です。"
    },
    "coming-soon": {
      name: "Coming Soon",
      description: "今後の追加ツール候補です。公開後に順次追加予定です。"
    }
  },
  en: {
    "schedule-calendar": {
      name: "Schedule Calendar",
      description: "Manage stream plans and announcement copy, then hand off a temporary draft to thumbnail or SNS split-image workflows."
    },
    "thumbnail-editor": {
      name: "Thumbnail Editor",
      description: "Choose a purpose-built preset and swap text and standee images to assemble VTuber thumbnails quickly.",
      notice: "Built-in presets include abstract backgrounds and decorative assets generated or edited by us."
    },
    "sns-split-image-maker": {
      name: "SNS Split Image Maker",
      description: "Manually tune 2, 3, or 4 images for X and export each image as PNG/JPEG in posting order."
    },
    "stream-manager": {
      name: "Stream Manager",
      description: "A planned tool for organizing before-and-after stream management. Additional tools will be added after launch."
    },
    "analytics-dashboard": {
      name: "Analytics Dashboard",
      description: "A planned tool for reviewing stream data. Additional tools will be added after launch."
    },
    "fan-community": {
      name: "Fan Community",
      description: "A planned tool for organizing fan communication. Additional tools will be added after launch."
    },
    "content-planner": {
      name: "Content Planner",
      description: "A planned tool for keeping ideas and stream prep notes together. Additional tools will be added after launch."
    },
    "task-tracker": {
      name: "Task Tracker",
      description: "A planned tool for managing production tasks. Additional tools will be added after launch."
    },
    "asset-library": {
      name: "Asset Library",
      description: "A planned tool for organizing reusable assets. Additional tools will be added after launch."
    },
    "coming-soon": {
      name: "Coming Soon",
      description: "A placeholder for future tool candidates. Additional tools will be added after launch."
    }
  }
} as const satisfies Record<Locale, Record<string, ToolCopy>>;

const suiteCopy = {
  ja: {
    "stream-workflow": {
      name: "配信ワークフロー",
      description: "予定管理からサムネ作成、SNS投稿画像づくりまで、配信準備の流れを支えるツール群",
      tags: ["Schedule Calendar", "Thumbnail Editor", "SNS分割画像", "+ その他"]
    },
    "fan-brand": {
      name: "ファン＆ブランド",
      description: "ファン交流、プロフィール整備、ブランド素材づくりを通じて活動の見せ方を整えるツール群",
      tags: ["ファン交流", "プロフィール整備", "ブランド素材", "+ その他"]
    },
    "business-collab": {
      name: "ビジネス＆コラボ",
      description: "収益化やバックオフィス、コラボ進行を整理するためのツール群",
      tags: ["収益管理", "コラボ管理", "契約・ドキュメント", "+ その他"]
    },
    "growth-selfcare": {
      name: "成長＆セルフケア",
      description: "学習、活動継続、セルフマネジメントを支えるツール群",
      tags: ["学習トラッカー", "目標管理", "習慣管理", "+ その他"]
    }
  },
  en: {
    "stream-workflow": {
      name: "Stream Workflow",
      description: "Tools that support the stream-prep flow from scheduling to thumbnails and SNS posting images.",
      tags: ["Schedule Calendar", "Thumbnail Editor", "SNS Split Image Maker", "+ More"]
    },
    "fan-brand": {
      name: "Fan & Brand",
      description: "Planned tools for fan communication, profile upkeep, and reusable brand assets.",
      tags: ["Fan communication", "Profile upkeep", "Brand assets", "+ More"]
    },
    "business-collab": {
      name: "Business & Collab",
      description: "Planned tools for monetization, back-office work, and collaboration management.",
      tags: ["Revenue management", "Collab management", "Contracts & docs", "+ More"]
    },
    "growth-selfcare": {
      name: "Growth & Self-Care",
      description: "Planned tools for learning, long-term activity, and self-management.",
      tags: ["Learning tracker", "Goal management", "Habit management", "+ More"]
    }
  }
} as const satisfies Record<Locale, Record<SuiteKey, SuiteCopy>>;

const categoryLabels = {
  ja: {
    schedule: "スケジュール",
    stream: "配信管理",
    analytics: "分析・レポート",
    community: "コミュニケーション",
    design: "画像・デザイン",
    management: "タスク管理",
    other: "その他"
  },
  en: {
    schedule: "Schedule",
    stream: "Stream Management",
    analytics: "Analytics & Reports",
    community: "Community",
    design: "Image & Design",
    management: "Task Management",
    other: "Other"
  }
} as const satisfies Record<Locale, Record<ToolCategory, string>>;

const statusLabels = {
  ja: {
    available: "利用可能",
    planned: "準備中"
  },
  en: {
    available: "Available",
    planned: "Planned"
  }
} as const satisfies Record<Locale, Record<ToolStatus, string>>;

export const portalCopy = {
  ja: {
    home: {
      hero: {
        title: "配信準備を、いま使えるツールから。",
        paragraphs: [
          "Schedule Calendar、Thumbnail Editor、SNS分割画像メーカーで、予定整理から投稿用画像づくりまで進められます。",
          "準備中の候補は一覧で分けて表示し、まず使える導線を迷わず開けるようにしています。"
        ],
        primaryCta: "ツール一覧を見る",
        secondaryCta: "Schedule Calendar を開く",
        panelTitle: "公開中の使い方",
        panelLead: "入口では今すぐ使える3ツールを優先し、追加予定の候補は状態を分けて表示します。",
        summary: {
          availableTools: { label: "使えるツール", helper: "予定・サムネ・分割画像", unit: "個" },
          publicFlow: { label: "公開導線", value: "3 ステップ", helper: "Schedule -> Thumbnail -> SNS" },
          suites: { label: "探し方", helper: "公開中と準備中を分けて確認", unit: "スイート" }
        }
      },
      suiteHeading: "スイートから探す",
      suiteLead: "いま使えるスイートと、追加予定の候補を分けて確認できます。",
      footer: "今すぐ使える個別ツールは Schedule Calendar / Thumbnail Editor / SNS分割画像メーカーです。"
    },
    tools: {
      eyebrow: "Tools",
      title: "ツール一覧",
      description: "Schedule Calendar / Thumbnail Editor / SNS分割画像メーカーを公開中です。追加予定の候補は準備中として分け、必要なときだけ絞り込んで確認できます。",
      currentSuiteSuffix: "を表示中",
      resultCountSuffix: "件を表示中",
      listLabel: "ツール一覧",
      empty: "条件に一致するツールはまだありません。"
    },
    loading: {
      tools: "ツール一覧を読み込んでいます。"
    },
    filters: {
      suite: "スイートで絞り込む",
      category: "カテゴリで絞り込む",
      status: "実装状態で絞り込む",
      all: "すべて"
    },
    suiteCard: {
      representative: "代表的な候補",
      availableCount: "公開中ツール",
      plannedCount: "準備中候補",
      toolUnit: "個",
      open: "開く",
      viewCandidates: "候補を見る"
    },
    toolCard: {
      open: "開く",
      planned: "準備中 - 追加予定"
    },
    feedback: {
      title: "不具合報告 / 要望",
      body: "表示崩れ、操作不具合、欲しい改善点はメール、X、Discord で受け付けています。",
      email: "メールで送る",
      xAria: "Xでkurodevを開く",
      discordAria: "Discordのツールポータル受付を開く"
    },
    navigation: {
      menuOpen: "メニューを開く",
      menuClose: "メニューを閉じる",
      language: "表示言語",
      theme: "表示テーマ",
      fixed: "固定ナビ",
      availableTools: "実装済みツール",
      future: "将来の機能（予定）",
      futureItems: ["お気に入り", "最近使ったツール", "ピン留め"],
      comingSoon: "近日対応",
      loginTitle: "ログインするともっと便利に",
      loginBody: "お気に入りや履歴の保存など、あなた専用の体験は後続フェーズで追加予定です。",
      loginButton: "ログイン予定",
      toolTitles: {
        "schedule-calendar": "スケジュールカレンダー",
        "thumbnail-editor": "Thumbnail Editor",
        "sns-split-image-maker": "SNS分割画像メーカー",
        tools: "ツール一覧"
      }
    },
    themeToggle: {
      groupLabel: "テーマ切替",
      toggleAria: "ライトモードとダークモードを切り替える",
      title: "表示テーマ",
      light: "ライト",
      dark: "ダーク"
    }
  },
  en: {
    home: {
      hero: {
        title: "Start your stream prep with tools you can use today.",
        paragraphs: [
          "Use Schedule Calendar, Thumbnail Editor, and SNS Split Image Maker to move from planning to posting images.",
          "Planned candidates are clearly separated so the ready-to-use flow stays easy to open first."
        ],
        primaryCta: "View tools",
        secondaryCta: "Open Schedule Calendar",
        panelTitle: "Current workflow",
        panelLead: "The portal prioritizes the three public tools now available and separates planned candidates by status.",
        summary: {
          availableTools: { label: "Available tools", helper: "Schedule, thumbnails, split images", unit: "tools" },
          publicFlow: { label: "Public flow", value: "3 steps", helper: "Schedule -> Thumbnail -> SNS" },
          suites: { label: "Browse by", helper: "Separate available and planned tools", unit: "suites" }
        }
      },
      suiteHeading: "Browse by suite",
      suiteLead: "Check the suite you can use now and the candidates planned for later.",
      footer: "Tools available now: Schedule Calendar / Thumbnail Editor / SNS Split Image Maker."
    },
    tools: {
      eyebrow: "Tools",
      title: "Tools",
      description: "Schedule Calendar, Thumbnail Editor, and SNS Split Image Maker are available now. Planned candidates stay separated so you can filter only when needed.",
      currentSuiteSuffix: "selected",
      resultCountSuffix: "visible",
      listLabel: "Tool list",
      empty: "No tools match these filters yet."
    },
    loading: {
      tools: "Loading tools."
    },
    filters: {
      suite: "Filter by suite",
      category: "Filter by category",
      status: "Filter by status",
      all: "All"
    },
    suiteCard: {
      representative: "Representative candidates",
      availableCount: "Available tools",
      plannedCount: "Planned candidates",
      toolUnit: "tools",
      open: "Open",
      viewCandidates: "View candidates"
    },
    toolCard: {
      open: "Open",
      planned: "Planned"
    },
    feedback: {
      title: "Bug reports / requests",
      body: "Send layout issues, operation bugs, or improvement requests by email, X, or Discord.",
      email: "Send email",
      xAria: "Open kurodev on X",
      discordAria: "Open the Kuro Stream Kit Discord feedback channel"
    },
    navigation: {
      menuOpen: "Open menu",
      menuClose: "Close menu",
      language: "Language",
      theme: "Theme",
      fixed: "Pinned nav",
      availableTools: "Available tools",
      future: "Future features",
      futureItems: ["Favorites", "Recent tools", "Pinned tools"],
      comingSoon: "Planned",
      loginTitle: "Sign in features are planned",
      loginBody: "Favorites, history, and other personalized features are planned for a later phase.",
      loginButton: "Sign-in planned",
      toolTitles: {
        "schedule-calendar": "Schedule Calendar",
        "thumbnail-editor": "Thumbnail Editor",
        "sns-split-image-maker": "SNS Split Image Maker",
        tools: "Tools"
      }
    },
    themeToggle: {
      groupLabel: "Theme toggle",
      toggleAria: "Switch between light and dark mode",
      title: "Theme",
      light: "Light",
      dark: "Dark"
    }
  }
} as const satisfies Record<Locale, object>;

export function getToolCopy(toolId: string, locale: Locale): ToolCopy {
  const localizedTools: Readonly<Record<string, ToolCopy>> = toolCopy[locale];
  const fallbackTools: Readonly<Record<string, ToolCopy>> = toolCopy.ja;

  return localizedTools[toolId] ?? fallbackTools[toolId] ?? {
    name: toolId,
    description: ""
  };
}

export function getSuiteCopy(suiteKey: SuiteKey, locale: Locale): SuiteCopy {
  return suiteCopy[locale][suiteKey] ?? suiteCopy.ja[suiteKey];
}

export function getCategoryLabel(category: ToolCategory, locale: Locale): string {
  return categoryLabels[locale][category] ?? categoryLabels.ja[category];
}

export function getStatusLabel(status: ToolStatus, locale: Locale): string {
  return statusLabels[locale][status] ?? statusLabels.ja[status];
}
