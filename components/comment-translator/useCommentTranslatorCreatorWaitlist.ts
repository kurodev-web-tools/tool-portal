"use client";

import { useState, useTransition } from "react";
import { getCommentTranslatorCreatorWaitlistAction, registerCommentTranslatorCreatorWaitlistAction } from "@/app/tools/comment-translator/actions";
import { initialCreatorWaitlistState, type CreatorWaitlistState } from "./comment-translator-dock-model";

export function useCommentTranslatorCreatorWaitlist(runtimeMode: "live" | "dev-fixture") {
  const [state, setState] = useState<CreatorWaitlistState>(initialCreatorWaitlistState);
  const [isPending, startTransition] = useTransition();
  function refresh() {
    if (runtimeMode === "dev-fixture") return;
    startTransition(async () => {
      try { setState(await getCommentTranslatorCreatorWaitlistAction()); }
      catch { setState(initialCreatorWaitlistState); }
    });
  }
  function register() {
    if (runtimeMode === "dev-fixture") return;
    startTransition(async () => {
      try {
        const result = await registerCommentTranslatorCreatorWaitlistAction();
        if (result.status === "registered" || result.status === "already-registered") {
          setState({ status: "registered", actionState: "disabled", loginHref: null, registration: result.registration, unavailableReason: null, clientReadableDetail: "sanitized-waitlist-state-only", publicLaunchAllowed: false });
          return;
        }
        setState(result);
      } catch { setState(initialCreatorWaitlistState); }
    });
  }
  return { state, isPending, refresh, register };
}
