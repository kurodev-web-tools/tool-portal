import type { Metadata } from "next";
import Link from "next/link";
import { PortalLegalFooter } from "@/components/portal/PortalLegalFooter";

export const metadata: Metadata = {
  title: "Kuro Live Comment Translator",
  description:
    "YouTubeライブコメントを、利用者が明示的に開始したセッション内だけで読み取り、翻訳する配信者向けツールです。",
  alternates: {
    canonical: "/tools/comment-translator/about"
  }
};

export const dynamic = "force-static";

export default function CommentTranslatorPublicInformationPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-sm font-black text-foreground transition hover:text-primary-strong">
            Kuro Stream Kit
          </Link>
          <p className="text-xs font-bold text-muted">公式アプリ情報</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <article className="space-y-6">
          <header className="panel overflow-hidden border-primary/30 bg-surface p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-widest text-primary-strong">Public application information</p>
            <h1 className="mt-3 break-words text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Kuro Live Comment Translator
            </h1>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-muted">
              YouTubeライブコメントを翻訳する配信者向けツールです。利用者が明示的にStartを押した後だけ、
              自分のライブ配信とライブコメントを読み取り、翻訳結果を表示します。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/tools/comment-translator"
                className="inline-flex min-h-11 items-center justify-center rounded-base border border-primary bg-primary px-5 py-2.5 text-sm font-black text-white transition hover:bg-primary-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                翻訳ツールを開く
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-base border border-border bg-surface px-5 py-2.5 text-sm font-black text-foreground transition hover:border-primary/60 hover:text-primary-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Kuro Stream Kit ホーム
              </Link>
            </div>
          </header>

          <section aria-labelledby="about-purpose" className="panel p-6 sm:p-8">
            <h2 id="about-purpose" className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
              このツールについて
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
              Kuro Live Comment Translator は、配信中のコメント確認を支援する Kuro Stream Kit の機能です。
              YouTubeの接続状態と配信の準備を確認し、翻訳を始めたいときに利用者自身がStartを押します。
            </p>
            <ol className="mt-5 grid gap-3 text-sm leading-7 text-muted sm:grid-cols-3">
              <li className="rounded-base border border-border bg-surface-muted p-4">
                <span className="block text-xs font-black text-primary-strong">1. 接続</span>
                <span className="mt-2 block">利用者自身のYouTubeアカウントを読み取り専用で接続します。</span>
              </li>
              <li className="rounded-base border border-border bg-surface-muted p-4">
                <span className="block text-xs font-black text-primary-strong">2. 開始</span>
                <span className="mt-2 block">利用者がStartを押したときだけ、対象のライブ配信を確認します。</span>
              </li>
              <li className="rounded-base border border-border bg-surface-muted p-4">
                <span className="block text-xs font-black text-primary-strong">3. 翻訳</span>
                <span className="mt-2 block">取得したライブコメントを翻訳し、セッション画面に表示します。</span>
              </li>
            </ol>
          </section>

          <section aria-labelledby="youtube-data-use" className="panel p-6 sm:p-8">
            <h2 id="youtube-data-use" className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
              YouTubeデータの利用
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
              使用する権限は読み取り専用の <code className="rounded-base bg-surface-muted px-1.5 py-0.5 font-mono text-foreground">youtube.readonly</code>
              です。ライブ配信とライブコメントを確認し、翻訳機能を提供する目的に限って使用します。
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-base border border-primary/30 bg-primary-soft/25 p-5">
                <h3 className="text-base font-black text-foreground">利用者が開始すること</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-muted">
                  <li>Start後に、自分のライブ配信とライブコメントを読み取ります。</li>
                  <li>取得したコメントを、明示的に開始したセッション内で翻訳します。</li>
                  <li>接続状態と利用状況は、必要最小限の情報だけを画面に表示します。</li>
                </ul>
              </div>
              <div className="rounded-base border border-border bg-surface-muted p-5">
                <h3 className="text-base font-black text-foreground">行わないこと</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-muted">
                  <li>接続しただけでは、コメント取得、監視、翻訳、クォータ消費を開始しません。</li>
                  <li>YouTubeへの書き込み、動画の変更、コメントの投稿や削除は行いません。</li>
                  <li>OAuthトークンや非公開の配信識別情報をブラウザ画面へ表示しません。</li>
                </ul>
              </div>
            </div>
          </section>

          <section aria-labelledby="policies" className="panel p-6 sm:p-8">
            <h2 id="policies" className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
              ポリシーとお問い合わせ
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
              Googleユーザーデータを含む情報の取扱いは、公開中のポリシーと利用規約で確認できます。
            </p>
            <nav aria-label="Kuro Live Comment Translator のポリシー" className="mt-5 flex flex-wrap gap-4 text-sm font-black">
              <Link href="/privacy" className="text-primary-strong underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
                プライバシーポリシーを確認する
              </Link>
              <Link href="/terms" className="text-primary-strong underline decoration-primary/40 underline-offset-4 hover:decoration-primary">
                利用規約を確認する
              </Link>
            </nav>
          </section>
        </article>
      </main>

      <PortalLegalFooter />
    </div>
  );
}
