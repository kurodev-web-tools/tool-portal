# Comment Translator Google OAuth Review Response Packet

Status: review complete. `google_auth_verification_status=approved`. `unverified_app_warning_status=not-observed-after-fresh-reconnect`. `oauth_reconnect_verification_status=pass`. `public_release_capable=no`.

## Purpose

This packet prepares sanitized evidence for the Kuro Live Comment Translator Google OAuth verification follow-up. It does not change or resubmit Google Auth Platform, send an email, run OAuth, call YouTube, start translation, or change public access.

## Verification Outcome

Google OAuth verification is approved for the requested read-only YouTube scope. After the operator revoked the previous app access and performed a fresh reconnect, the unverified-app warning was not observed and the OAuth connection completed successfully.

Record the result only as `google_auth_verification_status=approved`, `unverified_app_warning_status=not-observed-after-fresh-reconnect`, and `oauth_reconnect_verification_status=pass`. Do not record project identifiers, email addresses, private account metadata, or screenshot contents.

## Public Review URLs

| Review surface | Public URL | Expected label |
| --- | --- | --- |
| App homepage | `https://streamer-tools.kuro-lab.com/tools/comment-translator/about/` | `public-without-login` |
| Privacy policy | `https://streamer-tools.kuro-lab.com/privacy/` | `public-without-login` |
| Terms | `https://streamer-tools.kuro-lab.com/terms/` | `public-without-login` |

The app homepage identifies `Kuro Live Comment Translator`, describes its livestream-comment translation purpose, links visibly to `/privacy/`, and explains the YouTube access-removal path.

## Scope Rationale

- Requested scope: `youtube.readonly`.
- Purpose: read the signed-in creator's YouTube livestream and live comments only after the user explicitly presses Start, then display translated comments during that session.
- Connection-only behavior: connecting YouTube does not start monitoring, polling, translation, or quota use.
- Write boundary: the app does not upload, modify, post, or delete YouTube videos or comments.
- Browser boundary: OAuth token values and private provider identifiers are not displayed or stored in browser-facing evidence.

## User Access Removal

1. Sign in to Kuro Stream Kit and open `/account/integrations`.
2. Select YouTube `切断`. This invalidates the server-only credential reference and does not run provider revoke.
3. Open Google's official third-party connection management guidance: `https://support.google.com/accounts/answer/13533235?hl=ja`.
4. In the Google Account third-party connections surface, select Kuro Live Comment Translator and remove its access.
5. Contact `feedback@kuro-lab.com` for a request concerning previously shared data retained by Kuro Stream Kit.

## Reviewer Demo Evidence Checklist

Record only pass/fail/status/count labels. Do not record user identity, tokens, consent payloads, browser storage, provider metadata, or raw responses.

| Step | Reviewer-visible result | Evidence label |
| --- | --- | --- |
| Open the app homepage signed out | Product name, purpose, privacy link, and removal guidance are visible | `homepage_public_status=pass` |
| Open the privacy policy signed out | Data use and removal guidance are visible | `privacy_public_status=pass` |
| Review requested scope copy | `youtube.readonly` and read-only purpose are explicit | `minimal_scope_copy_status=pass` |
| Review connection behavior | Connection alone does not start data access | `connection_no_autostart_copy_status=pass` |
| Review Start behavior | Start is the first provider-affecting action described | `start_only_copy_status=pass` |
| Review removal guidance | App disconnect and Google-side revoke are both described | `access_removal_copy_status=pass` |

An authenticated OAuth consent demonstration remains separate and should be performed only if Google requests it and the operator explicitly approves that live flow.

## Trust & Safety返信文下書き

送信条件: Google Trust & Safetyから該当メールを受信した後、公開URLを再確認し、メール受信後にのみ送信する。現時点では送信しない。

```text
Google Trust & Safety チームご担当者様

ご連絡ありがとうございます。

Kuro Live Comment Translator の公開ホームページを確認・更新しました。ホームページはログインせずに閲覧でき、プライバシーポリシーへの明確なリンク、YouTubeデータの利用目的、要求する読み取り専用スコープ、YouTube連携の解除方法、およびGoogleアカウント側でアクセス権を取り消す方法を掲載しています。

アプリホームページ:
https://streamer-tools.kuro-lab.com/tools/comment-translator/about/

プライバシーポリシー:
https://streamer-tools.kuro-lab.com/privacy/

利用規約:
https://streamer-tools.kuro-lab.com/terms/

要求する youtube.readonly は、利用者が明示的にStartを押したセッション内で、自分のYouTubeライブ配信とライブコメントを読み取り、翻訳結果を表示するために使用します。YouTubeを接続しただけでは、監視、ポーリング、翻訳、またはクォータ消費を開始しません。YouTubeへの書き込み、投稿、変更、削除は行いません。

再確認をお願いいたします。
```

## Non-Actions

- Google Auth Platform mutation or resubmission: not run.
- Trust & Safety email send: not run.
- OAuth, reconnect, disconnect, Start, provider, translation, or live execution: not run.
- Cloudflare, Worker binding, environment variable, deploy/upload, public release declaration, Supabase, Stripe, billing, Creator/Paid, admin, or OBS change: not run.
- Final public release remains independently approval-gated by the final release declaration and later final production smoke. `public_release_capable=no`.
