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
    href: "/tools/schedule-calendar",
    sidebar: true,
    icon: "SC"
  },
  {
    id: "stream-manager",
    name: "Stream Manager",
    description: "配信設定やコメント管理をまとめて行える管理ツールです。",
    category: "stream",
    status: "planned",
    href: "/tools/stream-manager",
    sidebar: false,
    icon: "SM"
  },
  {
    id: "analytics-dashboard",
    name: "Analytics Dashboard",
    description: "配信のパフォーマンスを可視化し、成長をサポートします。",
    category: "analytics",
    status: "planned",
    href: "/tools/analytics-dashboard",
    sidebar: false,
    icon: "AD"
  },
  {
    id: "fan-community",
    name: "Fan Community",
    description: "ファンとの交流を深めるためのコミュニティ管理ツールです。",
    category: "community",
    status: "planned",
    href: "/tools/fan-community",
    sidebar: false,
    icon: "FC"
  },
  {
    id: "thumbnail-maker",
    name: "Thumbnail Maker",
    description: "サムネイルを簡単に作成できる画像デザインツールです。",
    category: "design",
    status: "planned",
    href: "/tools/thumbnail-maker",
    sidebar: false,
    icon: "TM"
  },
  {
    id: "content-planner",
    name: "Content Planner",
    description: "動画や配信の企画・ネタ出しをサポートするツールです。",
    category: "stream",
    status: "planned",
    href: "/tools/content-planner",
    sidebar: false,
    icon: "CP"
  },
  {
    id: "task-tracker",
    name: "Task Tracker",
    description: "やることリストやタスクを管理して制作活動を効率化します。",
    category: "management",
    status: "planned",
    href: "/tools/task-tracker",
    sidebar: false,
    icon: "TT"
  },
  {
    id: "asset-library",
    name: "Asset Library",
    description: "素材や画像、BGMなどを整理・管理できるライブラリです。",
    category: "design",
    status: "planned",
    href: "/tools/asset-library",
    sidebar: false,
    icon: "AL"
  },
  {
    id: "coming-soon",
    name: "Coming Soon",
    description: "新しいツールを開発中です。どうぞお楽しみに。",
    category: "other",
    status: "planned",
    href: "/tools",
    sidebar: false,
    icon: "..."
  }
];

export const availableTools = tools.filter((tool) => tool.status === "available");
export const plannedTools = tools.filter((tool) => tool.status === "planned");
export const sidebarTools = tools.filter((tool) => tool.sidebar && tool.status === "available");
export const activeCategories = Array.from(new Set(tools.map((tool) => tool.category)));
