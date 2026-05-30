"use client";

import Link from "next/link";
import { AuthTurnstile } from "@/components/account/AuthTurnstile";
import { useLocale } from "@/components/portal/LocaleProvider";

type AuthFormAction = (formData: FormData) => void | Promise<void>;

type AuthFlowMode = "login" | "signup" | "reset" | "update-password";
type PasswordFlow = "recovery" | "signed-in";

const authFlowCopy = {
  ja: {
    login: {
      eyebrow: "Account",
      title: "ログイン",
      lead: "メールアドレスとパスワードでログインすると、表示言語とテーマを別ブラウザやスマホでも引き継げます。",
      submit: "ログイン",
      secondary: "アカウントを作成",
      secondaryHref: "/signup",
      helper: "パスワードを忘れた場合",
      helperHref: "/reset-password",
      emailLabel: "メールアドレス",
      passwordLabel: "パスワード"
    },
    signup: {
      eyebrow: "Account",
      title: "アカウント作成",
      lead: "初期公開版では、表示言語とテーマを別ブラウザやスマホでも引き継げるアカウントを作成できます。",
      submit: "登録する",
      secondary: "すでにアカウントがある場合",
      secondaryHref: "/login",
      helper: "登録後、確認メールからログインを完了します。下書き、予定本文、画像、handoff payload は自動アップロードしません。",
      helperHref: null,
      emailLabel: "メールアドレス",
      passwordLabel: "パスワード"
    },
    reset: {
      eyebrow: "Password reset",
      title: "パスワード再設定",
      lead: "登録済みのメールアドレスに、パスワード再設定用のリンクを送信します。",
      submit: "再設定メールを送る",
      secondary: "ログインに戻る",
      secondaryHref: "/login",
      helper: "メール内のリンクを開くと、新しいパスワードを設定できます。",
      helperHref: null,
      emailLabel: "メールアドレス",
      passwordLabel: null
    },
    "update-password": {
      eyebrow: "Security",
      title: "新しいパスワード",
      lead: "メールの再設定リンクから戻った後、新しいパスワードを設定します。",
      signedInLead: "現在のパスワードを確認してから、新しいパスワードへ変更します。",
      submit: "パスワードを更新",
      secondary: "アカウント設定へ戻る",
      secondaryHref: "/account",
      helper: "8文字以上で入力してください。",
      helperHref: null,
      emailLabel: null,
      currentPasswordLabel: "現在のパスワード",
      passwordLabel: "新しいパスワード",
      passwordConfirmLabel: "新しいパスワード（確認）"
    },
    emailPlaceholder: "you@example.com",
    currentPasswordPlaceholder: "現在のパスワード",
    passwordPlaceholder: "8文字以上",
    messages: {
      "credentials-required": "メールアドレスとパスワードを入力してください。",
      "email-required": "メールアドレスを入力してください。",
      "password-required": "新しいパスワードを入力してください。",
      "current-password-required": "現在のパスワードを入力してください。",
      "password-too-short": "パスワードは8文字以上で入力してください。",
      "password-mismatch": "確認用パスワードが一致しません。",
      "login-error": "ログインできませんでした。メールアドレスとパスワードを確認してください。",
      "signup-error": "アカウントを作成できませんでした。",
      "signup-check-email": "確認メールを送信しました。メール内のリンクから登録を完了してください。",
      "reset-email-sent": "再設定メールを送信しました。",
      "reset-error": "再設定メールを送信できませんでした。",
      "password-updated": "パスワードを更新しました。",
      "password-update-error": "パスワードを更新できませんでした。",
      "sign-in-required": "続行するにはログインしてください。",
      "signed-in": "ログインしました。",
      "signed-out": "ログアウトしました。",
      "confirm-link-invalid": "確認リンクが不正です。",
      "confirm-error": "確認に失敗しました。",
      "recovery-pending": "パスワード再設定を完了してください。",
      "supabase-env-missing": "アカウント機能の公開設定が未完了です。"
    }
  },
  en: {
    login: {
      eyebrow: "Account",
      title: "Log in",
      lead: "Log in with email and password to carry language and theme across browsers and phones.",
      submit: "Log in",
      secondary: "Create account",
      secondaryHref: "/signup",
      helper: "Forgot your password?",
      helperHref: "/reset-password",
      emailLabel: "Email",
      passwordLabel: "Password"
    },
    signup: {
      eyebrow: "Account",
      title: "Create account",
      lead: "The first public account flow carries language and theme across browsers and phones.",
      submit: "Sign up",
      secondary: "Already have an account?",
      secondaryHref: "/login",
      helper: "After signup, complete registration from the confirmation email. Drafts, schedule text, images, and handoff payloads are not uploaded automatically.",
      helperHref: null,
      emailLabel: "Email",
      passwordLabel: "Password"
    },
    reset: {
      eyebrow: "Password reset",
      title: "Reset password",
      lead: "Send a password reset link to your registered email address.",
      submit: "Send reset email",
      secondary: "Back to login",
      secondaryHref: "/login",
      helper: "Open the email link to set a new password.",
      helperHref: null,
      emailLabel: "Email",
      passwordLabel: null
    },
    "update-password": {
      eyebrow: "Security",
      title: "New password",
      lead: "Set a new password after returning from the reset email.",
      signedInLead: "Confirm your current password before changing to a new one.",
      submit: "Update password",
      secondary: "Back to account",
      secondaryHref: "/account",
      helper: "Use at least 8 characters.",
      helperHref: null,
      emailLabel: null,
      currentPasswordLabel: "Current password",
      passwordLabel: "New password",
      passwordConfirmLabel: "Confirm new password"
    },
    emailPlaceholder: "you@example.com",
    currentPasswordPlaceholder: "Current password",
    passwordPlaceholder: "At least 8 characters",
    messages: {
      "credentials-required": "Enter your email and password.",
      "email-required": "Enter your email address.",
      "password-required": "Enter a new password.",
      "current-password-required": "Enter your current password.",
      "password-too-short": "Use at least 8 characters.",
      "password-mismatch": "Password confirmation does not match.",
      "login-error": "Could not log in. Check your email and password.",
      "signup-error": "Could not create the account.",
      "signup-check-email": "Confirmation email sent. Complete registration from the email link.",
      "reset-email-sent": "Password reset email sent.",
      "reset-error": "Could not send the reset email.",
      "password-updated": "Password updated.",
      "password-update-error": "Could not update the password.",
      "sign-in-required": "Log in to continue.",
      "signed-in": "Signed in.",
      "signed-out": "Signed out.",
      "confirm-link-invalid": "The confirmation link is invalid.",
      "confirm-error": "Could not confirm the link.",
      "recovery-pending": "Complete the password reset before continuing.",
      "supabase-env-missing": "Account publishing settings are not ready."
    }
  }
} as const;

export function AuthFlowShell({
  mode,
  passwordFlow = "recovery",
  action,
  authMessage,
  nextPath = "/account",
  turnstileSiteKey
}: {
  mode: AuthFlowMode;
  passwordFlow?: PasswordFlow;
  action: AuthFormAction;
  authMessage: string | null;
  nextPath?: string;
  turnstileSiteKey?: string;
}) {
  const { locale } = useLocale();
  const copy = authFlowCopy[locale];
  const modeCopy = copy[mode];
  const message = authMessage ? copy.messages[authMessage as keyof typeof copy.messages] : null;
  const showEmail = mode === "login" || mode === "signup" || mode === "reset";
  const showCurrentPassword = mode === "update-password" && passwordFlow === "signed-in";
  const showPassword = mode === "login" || mode === "signup" || mode === "update-password";
  const showPasswordConfirm = mode === "update-password";
  const showTurnstile = mode === "login" || mode === "signup" || mode === "reset";
  const currentPasswordLabel = "currentPasswordLabel" in modeCopy ? modeCopy.currentPasswordLabel : "";
  const passwordConfirmLabel = "passwordConfirmLabel" in modeCopy ? modeCopy.passwordConfirmLabel : "";
  const leadText = mode === "update-password" && passwordFlow === "signed-in" && "signedInLead" in modeCopy ? modeCopy.signedInLead : modeCopy.lead;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <section className="border-b border-border pb-6">
        <p className="text-xs font-black uppercase tracking-widest text-primary-strong">{modeCopy.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">{modeCopy.title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">{leadText}</p>
      </section>

      <section className="panel p-4 shadow-none sm:p-6">
        {message ? <p className="mb-4 rounded-base border border-primary/30 bg-primary-soft/45 px-3 py-2 text-sm font-bold leading-6 text-primary-strong">{message}</p> : null}
        <form action={action} className="grid gap-4">
          <input name="next" type="hidden" value={nextPath} />
          {showEmail ? (
            <label className="grid gap-2 text-sm font-bold text-foreground">
              <span>{modeCopy.emailLabel}</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder={copy.emailPlaceholder}
                className="min-w-0 rounded-base border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
              />
            </label>
          ) : null}
          {showCurrentPassword ? (
            <label className="grid gap-2 text-sm font-bold text-foreground">
              <span>{currentPasswordLabel}</span>
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                pattern="[\x21-\x7E]*"
                placeholder={copy.currentPasswordPlaceholder}
                className="min-w-0 rounded-base border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
              />
            </label>
          ) : null}
          {showPassword ? (
            <label className="grid gap-2 text-sm font-bold text-foreground">
              <span>{modeCopy.passwordLabel}</span>
              <input
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                pattern="[\x21-\x7E]*"
                placeholder={copy.passwordPlaceholder}
                className="min-w-0 rounded-base border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
              />
            </label>
          ) : null}
          {showPasswordConfirm ? (
            <label className="grid gap-2 text-sm font-bold text-foreground">
              <span>{passwordConfirmLabel}</span>
              <input
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                pattern="[\x21-\x7E]*"
                placeholder={copy.passwordPlaceholder}
                className="min-w-0 rounded-base border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
              />
            </label>
          ) : null}
          {showTurnstile ? <AuthTurnstile turnstileSiteKey={turnstileSiteKey} /> : null}
          <button className="rounded-base bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary-strong">
            {modeCopy.submit}
          </button>
        </form>
        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 text-sm font-bold sm:flex-row sm:items-center sm:justify-between">
          <Link href={modeCopy.secondaryHref} className="text-primary-strong hover:underline">
            {modeCopy.secondary}
          </Link>
          {modeCopy.helperHref ? (
            <Link href={modeCopy.helperHref} className="text-muted hover:text-foreground hover:underline">
              {modeCopy.helper}
            </Link>
          ) : (
            <p className="text-muted">{modeCopy.helper}</p>
          )}
        </div>
      </section>
    </div>
  );
}
