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

const suiteSeeds: Array<Omit<SuiteDefinition, "toolCount">> = [
  {
    key: "stream-workflow",
    name: "配信ワークフロー",
    description: "予定管理、カンペ準備、コメント翻訳確認、サムネ作成、SNS投稿画像づくりまで、配信準備と配信中の確認を支えるツール群",
    icon: "▶",
    tags: ["Schedule Calendar", "配信カンペボード", "Comment Translator", "Thumbnail Editor", "SNS分割画像"],
    status: "available"
  },
  {
    key: "fan-brand",
    name: "ファン＆ブランド",
    description: "ファン交流、プロフィール整備、ブランド素材づくりを通じて活動の見せ方を整えるツール群",
    icon: "♥",
    tags: ["ファン交流", "プロフィール整備", "ブランド素材", "+ その他"],
    status: "planned"
  },
  {
    key: "business-collab",
    name: "ビジネス＆コラボ",
    description: "収益化やバックオフィス、コラボ進行を整理するためのツール群",
    icon: "▣",
    tags: ["収益管理", "コラボ管理", "契約・ドキュメント", "+ その他"],
    status: "planned"
  },
  {
    key: "growth-selfcare",
    name: "成長＆セルフケア",
    description: "学習、活動継続、セルフマネジメントを支えるツール群",
    icon: "✦",
    tags: ["学習トラッカー", "目標管理", "習慣管理", "+ その他"],
    status: "planned"
  }
];

export const suites: SuiteDefinition[] = suiteSeeds.map((suite) => ({
  ...suite,
  toolCount: tools.filter((tool) => tool.suite === suite.key && tool.status === suite.status).length
}));

export const suiteLabels = Object.fromEntries(
  suites.map((suite) => [suite.key, suite.name])
) as Record<SuiteKey, string>;

export const suiteCount = suites.length;
export const availableSuiteCount = suites.filter((suite) => suite.status === "available").length;
export const plannedSuiteCount = suites.length - availableSuiteCount;
export const totalSuiteToolCount = suites.reduce((total, suite) => total + suite.toolCount, 0);
export const implementedToolCount = availableTools.length;
export const plannedToolCount = tools.length - availableTools.length;
