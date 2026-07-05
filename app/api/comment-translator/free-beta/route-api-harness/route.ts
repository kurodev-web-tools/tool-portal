import { NextResponse, type NextRequest } from "next/server";
import {
  type YouTubeOAuthCredentialStatusCallerAuthorization,
  authorizeYouTubeOAuthCredentialStatusCaller
} from "@/lib/comment-translator-youtube-credential-status-boundary";
import { readCommentTranslatorPrivateLaunchAccess } from "@/lib/comment-translator-private-launch-access-gate";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getCommentTranslatorCreatorWaitlistAction,
  getCommentTranslatorRealCommentsFeedAction,
  requestCommentTranslatorDataDeletionAction
} from "@/app/tools/comment-translator/actions";

export const dynamic = "force-dynamic";

const approvalLabel = "approved-fb-l3-allowed-tester-route-api-smoke";
const approvalHeader = "x-comment-translator-harness-approval";
const harnessEnabledEnv = "COMMENT_TRANSLATOR_FREE_BETA_ROUTE_API_HARNESS_ENABLED";

type HarnessActionName =
  | "getCommentTranslatorRealCommentsFeedAction"
  | "requestCommentTranslatorDataDeletionAction"
  | "getCommentTranslatorCreatorWaitlistAction";

type HarnessActionResult = {
  action: HarnessActionName;
  pass: boolean;
  status: string;
  count: number;
  unavailableReason: string | null;
};

const defaultHarnessActions: readonly HarnessActionName[] = [
  "getCommentTranslatorRealCommentsFeedAction",
  "requestCommentTranslatorDataDeletionAction",
  "getCommentTranslatorCreatorWaitlistAction"
];

export async function POST(request: NextRequest) {
  if (process.env[harnessEnabledEnv] !== approvalLabel) {
    return NextResponse.json(
      {
        status: "blocked-harness-disabled",
        results: []
      },
      { status: 404 }
    );
  }

  if (request.headers.get(approvalHeader) !== approvalLabel) {
    return NextResponse.json(
      {
        status: "blocked-missing-approval-header",
        results: []
      },
      { status: 403 }
    );
  }

  const callerAuthorization = await readHarnessCallerAuthorization();
  const launchAccess = readCommentTranslatorPrivateLaunchAccess({ callerAuthorization });
  if (launchAccess.status === "blocked") {
    return NextResponse.json(
      {
        status: "blocked-private-launch-gated",
        results: []
      },
      { status: 403 }
    );
  }

  const actions = await readRequestedActions(request);
  const results = await Promise.all(actions.map((action) => runHarnessAction(action)));

  return NextResponse.json({
    status: results.every((result) => result.pass) ? "passed" : "failed",
    count: results.length,
    results
  });
}

async function runHarnessAction(action: HarnessActionName): Promise<HarnessActionResult> {
  try {
    if (action === "getCommentTranslatorRealCommentsFeedAction") {
      return await runFeedAction();
    }

    if (action === "requestCommentTranslatorDataDeletionAction") {
      return await runDataDeletionAction();
    }

    return await runCreatorWaitlistAction();
  } catch {
    return {
      action,
      pass: false,
      status: "error",
      count: 0,
      unavailableReason: "action-threw"
    };
  }
}

async function runFeedAction(): Promise<HarnessActionResult> {
  const feed = await getCommentTranslatorRealCommentsFeedAction();

  return {
    action: "getCommentTranslatorRealCommentsFeedAction",
    pass: true,
    status: feed.status,
    count: feed.rows.length,
    unavailableReason: feed.unavailableReason
  };
}

async function runDataDeletionAction(): Promise<HarnessActionResult> {
  const deletion = await requestCommentTranslatorDataDeletionAction();

  return {
    action: "requestCommentTranslatorDataDeletionAction",
    pass: true,
    status: deletion.status,
    count: deletion.status === "available" ? 1 : 0,
    unavailableReason: deletion.unavailableReason
  };
}

async function runCreatorWaitlistAction(): Promise<HarnessActionResult> {
  const waitlist = await getCommentTranslatorCreatorWaitlistAction();

  return {
    action: "getCommentTranslatorCreatorWaitlistAction",
    pass: true,
    status: waitlist.status,
    count: waitlist.registration ? 1 : 0,
    unavailableReason: waitlist.unavailableReason
  };
}

async function readRequestedActions(request: NextRequest): Promise<readonly HarnessActionName[]> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return defaultHarnessActions;
  }

  try {
    const body = (await request.json()) as { actions?: unknown };
    if (!Array.isArray(body.actions)) {
      return defaultHarnessActions;
    }

    const actions = uniqueHarnessActions(body.actions.filter(isHarnessActionName));
    return actions.length > 0 ? actions : defaultHarnessActions;
  } catch {
    return defaultHarnessActions;
  }
}

function isHarnessActionName(value: unknown): value is HarnessActionName {
  return typeof value === "string" && defaultHarnessActions.includes(value as HarnessActionName);
}

function uniqueHarnessActions(actions: readonly HarnessActionName[]): readonly HarnessActionName[] {
  const uniqueActions: HarnessActionName[] = [];

  for (const action of actions) {
    if (!uniqueActions.includes(action)) {
      uniqueActions.push(action);
    }
  }

  return uniqueActions;
}

async function readHarnessCallerAuthorization(): Promise<YouTubeOAuthCredentialStatusCallerAuthorization> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return authorizeYouTubeOAuthCredentialStatusCaller({
      callerUserId: null,
      authUnavailable: true
    });
  }

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    return authorizeYouTubeOAuthCredentialStatusCaller({
      callerUserId: error ? null : user?.id ?? null,
      authUnavailable: Boolean(error)
    });
  } catch {
    return authorizeYouTubeOAuthCredentialStatusCaller({
      callerUserId: null,
      authUnavailable: true
    });
  }
}
