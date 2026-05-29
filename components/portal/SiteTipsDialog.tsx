"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/components/portal/LocaleProvider";
import type { Locale } from "@/lib/locale";

type SiteTipsDialogVariant = "header" | "rail" | "panel";
type SiteTipsTab = "page" | "account";

type TipsCopy = {
  trigger: string;
  close: string;
  title: string;
  pageTab: string;
  accountTab: string;
  fallbackTitle: string;
  fallbackItems: string[];
  accountTitle: string;
  accountItems: string[];
};

type PageTips = {
  title: string;
  items: string[];
};

const defaultTab = "page" satisfies SiteTipsTab;

const hiddenRoutePrefixes = ["/account", "/login", "/signup", "/reset-password"] as const;

const pageTipsByRoute = {
  ja: {
    "/": {
      title: "公開中 3 ツールの流れ",
      items: [
        "Schedule Calendar で予定を整理し、告知文を作ります。",
        "Thumbnail Editor へ handoff してサムネの下書きを作ります。",
        "SNS分割画像メーカーで投稿順に合わせた画像を書き出します。"
      ]
    },
    "/tools": {
      title: "ツール一覧の見方",
      items: [
        "公開中 / 準備中の状態を分けて確認できます。",
        "スイート、カテゴリ、実装状態で必要な候補だけに絞り込めます。",
        "まずは公開中の Schedule -> Thumbnail -> SNS の流れから開くと迷いにくいです。"
      ]
    },
    "/tools/schedule-calendar": {
      title: "Schedule Calendar の使い方",
      items: [
        "予定入力で配信枠とメモを整理します。",
        "告知文を作って、投稿前の文面確認に使えます。",
        "Thumbnail Editor / SNS への handoff は一時 payload として渡します。"
      ]
    },
    "/tools/thumbnail-editor": {
      title: "Thumbnail Editor の使い方",
      items: [
        "プリセットを選び、用途に近い構成から始めます。",
        "立ち絵 / 画像差し替えとテキスト調整で下書きを作ります。",
        "書き出し前に見え方を確認し、必要なら下書きとしてこのブラウザに残します。"
      ]
    },
    "/tools/sns-split-image-maker": {
      title: "SNS分割画像メーカーの使い方",
      items: [
        "分割数を選び、X に並べたい見せ方へ調整します。",
        "順番を確認して、投稿順どおりの画像にします。",
        "書き出しで個別 PNG / JPEG を保存します。"
      ]
    }
  },
  en: {
    "/": {
      title: "Flow for the 3 public tools",
      items: [
        "Use Schedule Calendar to organize plans and announcement copy.",
        "Hand off to Thumbnail Editor to draft the thumbnail.",
        "Export posting-order images with SNS Split Image Maker."
      ]
    },
    "/tools": {
      title: "Reading the tools index",
      items: [
        "Available and planned tools are separated by status.",
        "Filter by suite, category, or status when you only need a narrower set.",
        "Start with the available Schedule -> Thumbnail -> SNS flow when you want the shortest path."
      ]
    },
    "/tools/schedule-calendar": {
      title: "Using Schedule Calendar",
      items: [
        "Enter stream plans and keep notes in one place.",
        "Prepare announcement copy before posting.",
        "Send a temporary handoff payload to Thumbnail Editor or SNS Split Image Maker."
      ]
    },
    "/tools/thumbnail-editor": {
      title: "Using Thumbnail Editor",
      items: [
        "Pick a preset close to your use case.",
        "Swap standee / image assets and adjust text to make a draft.",
        "Check the result before export, and keep a browser-local draft when needed."
      ]
    },
    "/tools/sns-split-image-maker": {
      title: "Using SNS Split Image Maker",
      items: [
        "Choose the split count and tune the layout for X.",
        "Check the order before posting.",
        "Export individual PNG / JPEG files."
      ]
    }
  }
} as const satisfies Record<Locale, Record<string, PageTips>>;

const tipsCopy = {
  ja: {
    trigger: "Tips",
    close: "閉じる",
    title: "使い方のヒント",
    pageTab: "このページ",
    accountTab: "アカウント",
    fallbackTitle: "このページのヒント",
    fallbackItems: ["公開中のツールから順に使うと、配信準備を小さく進められます。"],
    accountTitle: "アカウントで保存する範囲",
    accountItems: [
      "ログインすると表示言語とテーマを別ブラウザやスマホでも引き継げるようになります。",
      "下書き、予定本文、画像、handoff payload は自動アップロードされないため、このブラウザ内の作業として残ります。",
      "今後、ツールごとの軽い設定だけを保存対象にする予定です。"
    ]
  },
  en: {
    trigger: "Tips",
    close: "Close",
    title: "Usage tips",
    pageTab: "This page",
    accountTab: "Account",
    fallbackTitle: "Page tips",
    fallbackItems: ["Start with the public tools to move stream prep forward in small steps."],
    accountTitle: "What account settings save",
    accountItems: [
      "When you log in, language and theme can carry across browsers and phones.",
      "Drafts, schedule text, images, and handoff payloads are not uploaded automatically and stay as browser-local work.",
      "Later, only lightweight per-tool settings are planned for account storage."
    ]
  }
} as const satisfies Record<Locale, TipsCopy>;

function normalizePathname(pathname: string) {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
}

function isTipsSupportedRoute(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);

  if (hiddenRoutePrefixes.some((prefix) => normalizedPathname === prefix || normalizedPathname.startsWith(`${prefix}/`))) {
    return false;
  }

  return normalizedPathname === "/" || normalizedPathname === "/tools" || normalizedPathname.startsWith("/tools/");
}

function getPageTips(pathname: string, locale: Locale): PageTips {
  const normalizedPathname = normalizePathname(pathname);
  const localizedTips = pageTipsByRoute[locale];
  const orderedRoutes = ["/tools/schedule-calendar", "/tools/thumbnail-editor", "/tools/sns-split-image-maker", "/tools", "/"] as const;
  const matchedRoute = orderedRoutes.find((route) => (route === "/" || route === "/tools" ? normalizedPathname === route : normalizedPathname.startsWith(route)));
  return matchedRoute ? localizedTips[matchedRoute] : { title: tipsCopy[locale].fallbackTitle, items: tipsCopy[locale].fallbackItems };
}

function getTriggerClassName(variant: SiteTipsDialogVariant) {
  if (variant === "rail") {
    return "grid h-10 w-10 place-items-center rounded-base border border-border bg-surface text-xs font-black text-primary-strong transition hover:bg-surface-muted";
  }

  if (variant === "panel") {
    return "inline-flex w-full items-center justify-center gap-1.5 rounded-base border border-border bg-surface px-3 py-2 text-xs font-bold text-primary-strong transition hover:bg-surface-muted";
  }

  return "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-base border border-border bg-surface px-2.5 text-xs font-bold text-primary-strong transition hover:bg-surface-muted sm:px-3";
}

export function SiteTipsDialog({
  pathname,
  variant = "header"
}: {
  pathname: string;
  variant?: SiteTipsDialogVariant;
}) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SiteTipsTab>(defaultTab);
  const [mounted, setMounted] = useState(false);
  const copy = tipsCopy[locale];
  const pageTips = useMemo(() => getPageTips(pathname, locale), [locale, pathname]);
  const showTipsButton = isTipsSupportedRoute(pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    setOpen(false);
    setActiveTab(defaultTab);
  }, [pathname]);

  if (!showTipsButton) {
    return null;
  }

  const items = activeTab === "page" ? pageTips.items : copy.accountItems;
  const title = activeTab === "page" ? pageTips.title : copy.accountTitle;
  const backdropCloseLabel = locale === "ja" ? "ヒントを閉じる" : "Close tips";
  const dialog = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label={backdropCloseLabel} onClick={() => setOpen(false)} />
      <section
        className="relative z-10 max-h-[calc(100vh-3rem)] w-full max-w-lg overflow-y-auto rounded-base border border-border bg-surface p-4 shadow-2xl sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-tips-dialog-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary-strong">{copy.trigger}</p>
            <h2 id="site-tips-dialog-title" className="mt-1 text-lg font-black text-foreground">
              {copy.title}
            </h2>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-base border border-border text-lg text-muted transition hover:bg-surface-muted"
            aria-label={copy.close}
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-base bg-surface-muted p-1" role="tablist" aria-label={copy.title}>
          <button
            type="button"
            className={[
              "rounded-base px-3 py-2 text-sm font-bold transition",
              activeTab === "page" ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
            ].join(" ")}
            role="tab"
            aria-selected={activeTab === "page"}
            onClick={() => setActiveTab("page")}
          >
            {copy.pageTab}
          </button>
          <button
            type="button"
            className={[
              "rounded-base px-3 py-2 text-sm font-bold transition",
              activeTab === "account" ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
            ].join(" ")}
            role="tab"
            aria-selected={activeTab === "account"}
            onClick={() => setActiveTab("account")}
          >
            {copy.accountTab}
          </button>
        </div>
        <div className="mt-4 rounded-base border border-border bg-background/60 p-4">
          <h3 className="text-sm font-black text-foreground">{title}</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
            {items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className={getTriggerClassName(variant)}
        onClick={() => {
          setActiveTab(defaultTab);
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={copy.title}
      >
        <span aria-hidden="true">?</span>
        {variant === "rail" ? <span className="sr-only">{copy.trigger}</span> : <span>{copy.trigger}</span>}
      </button>
      {open && mounted ? createPortal(dialog, document.body) : null}
    </>
  );
}
