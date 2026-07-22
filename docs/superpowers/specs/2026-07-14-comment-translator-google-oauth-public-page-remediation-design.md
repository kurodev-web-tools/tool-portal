# Comment Translator Google OAuth Public Page Remediation Design

## Goal

Google OAuth verification reviewers and end users can confirm, without signing in, the product purpose, privacy policy, YouTube read-only data use, and the complete connection-removal path.

## Current Evidence

- The submitted homepage is `/tools/comment-translator/about/`.
- The deployed page already exposes visible privacy-policy links without login.
- Google Cloud still shows the 2026-07-13 homepage finding, so the review state has not yet incorporated the deployed evidence.
- The in-app disconnect action invalidates the server-only credential reference but does not revoke the Google-side grant.

## Approved Design

1. Keep the existing visual system and static, login-independent route.
2. Add a privacy-policy link beside the primary hero actions so it is visible before reviewers scroll.
3. Add a dedicated removal section that distinguishes:
   - Kuro Stream Kit disconnect at `/account/integrations`;
   - Google Account access removal through Google's official third-party connection guidance.
4. Update the privacy policy with the same distinction and a current update date.
5. Strengthen the deterministic contract so the privacy link, disconnect guidance, Google revoke guidance, and static/no-auth boundary cannot regress.
6. Add a sanitized operator packet containing demo steps, scope rationale, evidence labels, and a Trust & Safety reply draft.

## Boundaries

- Do not mutate or resubmit Google Auth Platform.
- Do not send email or run an OAuth, Start, provider, translation, or live flow.
- Do not expose tokens, credentials, account identifiers, provider metadata, browser storage, or raw responses.
- Do not change Cloudflare, Worker bindings, environment variables, deployment, public release declaration, billing, Creator/Paid, admin, Supabase, Stripe, or OBS behavior.
- Keep `public_release_capable=no` and `google_auth_verification_status=submitted-pending`.

## Verification

- RED/GREEN contract for the new public copy and privacy-policy copy.
- TypeScript, lint, production build, and diff checks when the existing dependency runtime is available without installing packages.
- Local production render at `390 / 820 / 1024 / 1280 / 1366px`, checking visible links, headings, overflow, forms/password inputs, and console errors.
