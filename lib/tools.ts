import type { SuiteKey } from "@/lib/suite-types";

export type ToolStatus = "available" | "planned";

export type ToolCategory =
  | "schedule"
  | "stream"
  | "analytics"
  | "community"
  | "design"
  | "management"
  | "other";

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  status: ToolStatus;
  suite: SuiteKey;
  href: string;
  sidebar: boolean;
  icon: string;
};

export const categoryLabels: Record<ToolCategory, string> = {
  schedule: "スケジュール",
  stream: "配信管理",
  analytics: "分析・レポート",
  community: "コミュニケーション",
  design: "画像・デザイン",
  management: "タスク管理",
  other: "その他"
};

export const statusLabels: Record<ToolStatus, string> = {
  available: "利用可能",
  planned: "準備中"
};

export const tools: ToolDefinition[] = [
  {
    id: "schedule-calendar",
    name: "Schedule Calendar",
    description: "配信スケジュールの作成・管理ができるカレンダーツールです。",
    category: "schedule",
    status: "available",
    suite: "stream-workflow",
    href: "/tools/schedule-calendar",
    sidebar: true,
    icon: "SC"
  },
  {
    id: "stream-manager",
    name: "Stream Manager",
    description: "配信前後の管理を扱う候補です。公開版ではまだ利用できません。",
    category: "stream",
    status: "planned",
    suite: "stream-workflow",
    href: "/tools",
    sidebar: false,
    icon: "SM"
  },
  {
    id: "analytics-dashboard",
    name: "Analytics Dashboard",
    description: "配信データの確認を扱う候補です。公開版ではまだ利用できません。",
    category: "analytics",
    status: "planned",
    suite: "stream-workflow",
    href: "/tools",
    sidebar: false,
    icon: "AD"
  },
  {
    id: "fan-community",
    name: "Fan Community",
    description: "交流管理を扱う候補です。公開版ではまだ利用できません。",
    category: "community",
    status: "planned",
    suite: "fan-brand",
    href: "/tools",
    sidebar: false,
    icon: "FC"
  },
  {
    id: "thumbnail-editor",
    name: "Thumbnail Editor",
    description: "配信告知や切り抜き用の16:9サムネイルを手動で作成・書き出しできます。",
    category: "design",
    status: "available",
    suite: "fan-brand",
    href: "/tools/thumbnail-editor",
    sidebar: true,
    icon: "TE"
  },
  {
    id: "content-planner",
    name: "Content Planner",
    description: "企画メモや配信準備を扱う候補です。公開版ではまだ利用できません。",
    category: "stream",
    status: "planned",
    suite: "stream-workflow",
    href: "/tools",
    sidebar: false,
    icon: "CP"
  },
  {
    id: "task-tracker",
    name: "Task Tracker",
    description: "制作タスク管理を扱う候補です。公開版ではまだ利用できません。",
    category: "management",
    status: "planned",
    suite: "growth-selfcare",
    href: "/tools",
    sidebar: false,
    icon: "TT"
  },
  {
    id: "asset-library",
    name: "Asset Library",
    description: "素材整理を扱う候補です。公開版ではまだ利用できません。",
    category: "design",
    status: "planned",
    suite: "business-collab",
    href: "/tools",
    sidebar: false,
    icon: "AL"
  },
  {
    id: "coming-soon",
    name: "Coming Soon",
    description: "追加ツールの候補枠です。公開版ではまだ利用できません。",
    category: "other",
    status: "planned",
    suite: "growth-selfcare",
    href: "/tools",
    sidebar: false,
    icon: "..."
  }
];

export const availableTools = tools.filter((tool) => tool.status === "available");
export const plannedTools = tools.filter((tool) => tool.status === "planned");
export const sidebarTools = tools.filter((tool) => tool.sidebar && tool.status === "available");
export const activeCategories = Array.from(new Set(tools.map((tool) => tool.category)));
