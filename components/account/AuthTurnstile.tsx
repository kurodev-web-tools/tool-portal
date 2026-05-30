"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

const turnstileScriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const turnstileResponseFieldName = "cf-turnstile-response";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      responseFieldName: string;
      size: "flexible";
      theme: "auto";
    }
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function AuthTurnstile({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isScriptReady, setIsScriptReady] = useState(false);

  useEffect(() => {
    if (window.turnstile) {
      setIsScriptReady(true);
    }
  }, []);

  useEffect(() => {
    if (!turnstileSiteKey || !isScriptReady || !window.turnstile || !containerRef.current || widgetIdRef.current) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: turnstileSiteKey,
      responseFieldName: turnstileResponseFieldName,
      size: "flexible",
      theme: "auto"
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [isScriptReady, turnstileSiteKey]);

  if (!turnstileSiteKey) {
    return null;
  }

  return (
    <div className="grid gap-2">
      <Script src={turnstileScriptUrl} strategy="afterInteractive" onLoad={() => setIsScriptReady(true)} />
      <div ref={containerRef} className="cf-turnstile min-h-[65px]" />
    </div>
  );
}
