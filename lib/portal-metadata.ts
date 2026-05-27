import type { Locale } from "@/lib/locale";

export const portalMetadata = {
  ja: {
    root: {
      title: "Kuro Stream Kit",
      description: "VTuber向けの活動支援ツールポータル。公開版ではSchedule Calendar、Thumbnail Editor、SNS分割画像メーカーを提供しています。"
    },
    home: {
      title: "Home",
      description: "Kuro Stream Kitの公開最小セットへの入口。Schedule Calendar、Thumbnail Editor、SNS分割画像メーカーへ移動できます。"
    },
    tools: {
      title: "Tools",
      description: "Kuro Stream Kitのツール一覧。公開版で利用できるSchedule Calendar、Thumbnail Editor、SNS分割画像メーカーと準備中の候補を確認できます。"
    },
    account: {
      title: "Account",
      description: "Kuro Stream Kitのアカウント設定と共通preferencesの確認ページ。"
    }
  },
  en: {
    root: {
      title: "Kuro Stream Kit",
      description: "A support tool portal for VTubers. The public version includes Schedule Calendar, Thumbnail Editor, and SNS Split Image Maker."
    },
    home: {
      title: "Home",
      description: "The entry point for the public minimum set in Kuro Stream Kit, with links to Schedule Calendar, Thumbnail Editor, and SNS Split Image Maker."
    },
    tools: {
      title: "Tools",
      description: "The Kuro Stream Kit tool index, showing the currently available tools and planned candidates."
    },
    account: {
      title: "Account",
      description: "Account settings and shared preferences shell for Kuro Stream Kit."
    }
  }
} as const satisfies Record<Locale, Record<"root" | "home" | "tools" | "account", { title: string; description: string }>>;
