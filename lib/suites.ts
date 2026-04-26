import { availableTools, tools, type ToolStatus } from "@/lib/tools";
import type { SuiteKey } from "@/lib/suite-types";
export type { SuiteKey } from "@/lib/suite-types";

export type SuiteDefinition = {
  key: SuiteKey;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  toolCount: number;
  status: ToolStatus;
};

export const suites: SuiteDefinition[] = [
  {
    key: "stream-workflow",
    name: "配信ワークフロー",
    description: "企画から配信後の振り返りまで、日々の配信活動を支えるツール群",
    icon: "▶",
    tags: ["配信計画", "配信アシスタント", "データ分析", "+ その他"],
    toolCount: 8,
    status: "available"
  },
  {
    key: "fan-brand",
    name: "ファン＆ブランド",
    description: "ファンとの交流や世界観づくりを支え、活動の魅力を育てるツール群",
    icon: "♥",
    tags: ["ファンレポート", "交流管理", "ブランディング", "+ その他"],
    toolCount: 6,
    status: "planned"
  },
  {
    key: "business-collab",
    name: "ビジネス＆コラボ",
    description: "収益化やバックオフィス、コラボ進行を整理するためのツール群",
    icon: "▣",
    tags: ["収益管理", "コラボ管理", "契約・ドキュメント", "+ その他"],
    toolCount: 5,
    status: "planned"
  },
  {
    key: "growth-selfcare",
    name: "成長＆セルフケア",
    description: "学習、活動継続、セルフマネジメントを支えるツール群",
    icon: "✦",
    tags: ["学習トラッカー", "目標管理", "習慣管理", "+ その他"],
    toolCount: 5,
    status: "planned"
  }
];

export const suiteCount = suites.length;
export const availableSuiteCount = suites.filter((suite) => suite.status === "available").length;
export const plannedSuiteCount = suites.length - availableSuiteCount;
export const totalSuiteToolCount = suites.reduce((total, suite) => total + suite.toolCount, 0);
export const implementedToolCount = availableTools.length;
export const plannedToolCount = tools.length - availableTools.length;
