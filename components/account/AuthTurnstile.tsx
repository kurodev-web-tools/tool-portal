"use client";

import Script from "next/script";

export function AuthTurnstile({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  if (!turnstileSiteKey) {
    return null;
  }

  return (
    <div className="grid gap-2">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div
        className="cf-turnstile min-h-[65px]"
        data-sitekey={turnstileSiteKey}
        data-size="flexible"
        data-theme="auto"
        data-response-field-name="cf-turnstile-response"
      />
    </div>
  );
}
