export type CommentTranslationStatus = "translated" | "skipped" | "error";
export type CommentCacheStatus = "hit" | "miss" | "none";
export type CommentTranslatorConnectionStateId = "connected" | "syncing" | "offline";
export type CommentTranslatorDockStatus = "ready" | "standby" | "blocked";
export type CommentTranslatorSourceLanguageId = "en" | "ko" | "zh" | "ja";
export type CommentTranslatorTargetLanguageId = "ja" | "en";
export type CommentTranslatorDisplayMode = "both" | "original" | "translated";
export type CommentTranslatorSurfaceMode = "obs-browser-dock" | "narrow-viewport";
export type CommentTranslatorStatusFilter = "all" | "translated" | "skipped" | "error";
export type CommentTranslatorQuotaScenarioId = "normal" | "warning" | "empty" | "error";
export type CommentTranslatorStreamId = "saturday-setup" | "karaoke-preview" | "archive-check";
export type CommentTranslatorCommentSource = "fixture" | "manual";
export type CommentTranslatorManualResultMode = "translated" | "skipped" | "error";
export type CommentTranslatorOperatorFlowStepId =
  | "credential-status"
  | "target-readiness"
  | "intake-bridge"
  | "explicit-approval";

export type CommentTranslatorPlatform = {
  id: "youtube";
  name: "YouTube";
  mode: "read-only-dock";
  statusLabel: string;
  channelName: string;
  streamTitle: string;
};

export type CommentTranslatorSettings = {
  sourceLanguage: CommentTranslatorSourceLanguageId;
  targetLanguage: CommentTranslatorTargetLanguageId;
  targetLanguageLabel: string;
  displayMode: CommentTranslatorDisplayMode;
  surfaceMode: CommentTranslatorSurfaceMode;
};

export type CommentTranslatorQuotaPreview = {
  id: CommentTranslatorQuotaScenarioId;
  label: string;
  tone: "normal" | "warning" | "empty" | "error";
  usedUnits: number;
  limitUnits: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  translatedCount: number;
  skippedCount: number;
  errorCount: number;
  statusLabel: string;
  helper: string;
};

export type CommentTranslatorSkipReason = {
  id: string;
  label: string;
  count: number;
};

export type CommentTranslatorComment = {
  id: string;
  timestamp: string;
  authorName: string;
  source?: CommentTranslatorCommentSource;
  sourceLabel?: string;
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText?: string;
  status: CommentTranslationStatus;
  cacheStatus: CommentCacheStatus;
  skipReason?: string;
  errorMessage?: string;
  badge?: string;
  unitCost: number;
};

export type CommentTranslatorManualSample = {
  id: string;
  text: string;
};

export type CommentTranslatorOperatorFlowStep = {
  id: CommentTranslatorOperatorFlowStepId;
  source: "ui-local-status-only";
};

export type CommentTranslatorConnectionState = {
  id: CommentTranslatorConnectionStateId;
  platformId: "youtube";
  label: string;
  statusLabel: string;
  dockStatus: CommentTranslatorDockStatus;
  dockStatusLabel: string;
  channelName: string;
  helper: string;
};

export type CommentTranslatorStreamOption = {
  id: CommentTranslatorStreamId;
  title: string;
  channelName: string;
  scheduledLabel: string;
  dockStatus: CommentTranslatorDockStatus;
  dockStatusLabel: string;
  viewerMode: "broadcaster-read-only";
};

export type CommentTranslatorLanguageOption<TId extends string> = {
  id: TId;
  label: string;
  shortLabel: string;
};

export type CommentTranslatorControlOption<TId extends string> = {
  id: TId;
  label: string;
  helper: string;
};

export const commentTranslatorUiCopy = {
  ja: {
    header: {
      subtitle: "YouTube優先 / 明示開始セッション",
      readOnlyDock: "読み取り専用Dock",
      target: "表示先",
      feedTitle: "YouTubeチャット公開版プレビュー"
    },
    sections: {
      setup: "セットアップ / 接続",
      manualInput: "手入力 / 貼り付け",
      display: "表示設定",
      comments: "ライブコメント",
      quota: "キャッシュ / クォータ確認",
      skipped: "スキップ理由",
      credentialStatus: "YouTube認証ステータス",
      operatorSession: "セッション操作",
      operatorFlow: "オペレーター確認フロー",
      safety: "公開版の利用条件"
    },
    controls: {
      connection: "YouTube接続状態",
      stream: "配信選択",
      sourceLanguage: "翻訳元言語",
      targetLanguage: "翻訳先言語",
      singleComment: "単一コメント",
      multilinePaste: "複数行貼り付け",
      manualResult: "手入力プレビュー結果",
      commentText: "コメント本文",
      surface: "表示面",
      currentPair: "現在の組み合わせ",
      mockState: "利用状態",
      searchPlaceholder: "コメントを検索"
    },
    stats: {
      shown: "表示中",
      total: "合計",
      translated: "翻訳済み",
      skipped: "スキップ",
      quota: "クォータ",
      cacheHit: "キャッシュhit",
      cacheMiss: "キャッシュmiss",
      errorRows: "エラー行",
      used: "使用中",
      hits: "hits",
      fixtureMisses: "preview miss",
      recoverable: "復帰可能な状態",
      manualRows: "手入力行",
      manualSession: "手入力セッション"
    },
    manualInput: {
      helper: "この画面の手入力はプレビュー用です。実APIやAI翻訳はStart承認前に実行しません。",
      singlePlaceholder: "1件だけ追加するコメント",
      pastePlaceholder: "貼り付けたコメントを1行ずつ追加",
      sourceBadge: "手入力",
      sampleLabel: "sample"
    },
    actions: {
      addManualComments: "コメントを追加",
      insertSample: "サンプル挿入",
      clearDraft: "下書きをクリア",
      clearManualSession: "手入力セッションをクリア",
      refreshCredentialStatus: "認証ステータスを確認",
      startSession: "Start",
      stopSession: "Stop",
      refreshSession: "状態更新"
    },
    manualResults: {
      translated: { label: "翻訳済みプレビュー", helper: "決定的なプレビュー翻訳を付ける" },
      skipped: { label: "スキッププレビュー", helper: "スキップ理由つきで追加" },
      error: { label: "エラープレビュー", helper: "復帰可能なエラー行として追加" }
    },
    fields: {
      mode: "モード",
      dock: "Dock",
      credentialReference: "Credential reference",
      scope: "Scope",
      expires: "Expires",
      reason: "Reason",
      sessionState: "状態",
      elapsed: "経過",
      dailyUsed: "本日の使用",
      dailyRemaining: "本日の残り",
      sessionRemaining: "セッション残り",
      stopReason: "停止理由",
      nextAction: "次の操作",
      providerConnection: "接続",
      perMinuteCap: "分あたり上限"
    },
    credentialStatus: {
      pending: "確認中",
      unchecked: "未確認",
      refreshFailed: "認証ステータスを確認できませんでした",
      safeBoundary: "画面にはopaqueなcredentialReferenceIdとsanitized metadataだけを表示し、機密の接続値や配信ターゲット値は表示しません。",
      states: {
        available: "利用可能",
        "reconnect-required": "再接続が必要",
        unavailable: "未利用",
        "credential-resolution-disabled": "解決を停止中"
      }
    },
    operatorSession: {
      helper: "Start後にだけserver-owned sessionが進みます。このパネルはsanitized session / usage metadataだけを表示します。",
      pending: "処理中",
      actionFailed: "セッション状態を更新できませんでした",
      startBlockedTitle: "YouTube接続が未準備のためStartできません",
      startBlockedBody:
        "Start が使えない場合は、アカウント連携でYouTubeの接続または再接続を完了してから、認証ステータスを再確認してください。",
      openIntegrations: "YouTube連携を開く",
      reconnectGuidance: "アカウント連携でYouTubeを再接続してから、認証ステータスを再確認してください。",
      safeBoundary: "機密の接続値、アカウント内部値、配信ターゲット値は表示・保存しません。",
      perMinuteCapHelper: "Free枠は30翻訳メッセージ/分です。",
      states: {
        "not-started": "未開始",
        active: "実行中",
        stopped: "停止中"
      },
      nextActions: {
        "press-start": "Startできます",
        "send-heartbeat-or-stop": "状態更新またはStop",
        "session-stopped": "必要なら再Start",
        "reconnect-or-sign-in": "再接続またはサインイン",
        "wait-for-limit-reset": "上限リセット待ち"
      },
      stopReasons: {
        "user-stop": "ユーザー停止",
        "stream-ended": "配信終了",
        "stream-unavailable": "配信を利用できません",
        "browser-disconnect": "ブラウザ切断",
        "missing-heartbeat": "heartbeat未到達",
        "auth-failed": "認証失敗",
        "token-refresh-failed": "接続更新失敗",
        "reconnect-required": "再接続が必要",
        "daily-time-limit": "日次上限",
        "session-time-limit": "セッション上限",
        "translated-message-cap": "分あたり翻訳上限",
        "provider-quota-stop": "provider quota停止",
        "global-budget-stop": "共通予算停止",
        "ai-budget-stop": "AI予算停止",
        "translation-provider-limit": "翻訳provider制限",
        "session-limit": "同時セッション上限",
        "terminal-provider-error": "provider終端エラー"
      }
    },
    operatorFlow: {
      ready: "UI確認OK",
      standby: "確認待ち",
      blocked: "認証確認待ち",
      noLiveExecution: "この画面からlive/provider commandは実行しません。",
      summaryReady: "runtime smoke済み境界の状態を、UI上の安全な確認手順として表示しています。",
      summaryStandby: "配信選択または接続状態を確認してから、operator-local commandの準備に進みます。",
      summaryBlocked: "まず認証ステータスを確認し、利用可能なsanitized metadataだけを画面で確認します。",
      commandBoundary: "実行が必要な場合は、同じスレッドでpreflight、sanitized output review、明示承認を揃えてからCLIで実行します。",
      stepState: {
        done: "確認済み",
        waiting: "待機",
        gated: "承認待ち"
      },
      steps: {
        "credential-status": {
          label: "認証ステータス",
          helper: "opaque referenceとsanitized metadataのみを確認"
        },
        "target-readiness": {
          label: "配信ターゲット",
          helper: "UIではready/standbyだけを表示し、target値は出さない"
        },
        "intake-bridge": {
          label: "intake bridge",
          helper: "Task 6のserver-only bridgeはUIから直接呼ばない"
        },
        "explicit-approval": {
          label: "実行承認",
          helper: "live/provider実行は別CLIと同スレッド承認が必要"
        }
      }
    },
    connections: {
      connected: "接続確認済み",
      syncing: "接続確認中",
      offline: "未接続"
    },
    connectionStatus: {
      connected: "開始前",
      syncing: "同期中",
      offline: "オフライン"
    },
    connectionDockStatus: {
      connected: "Start後に取得開始",
      syncing: "接続だけでは監視しません",
      offline: "Dock停止中"
    },
    streams: {
      "saturday-setup": { label: "Start対象の配信", helper: "ready状態のみ表示" },
      "karaoke-preview": { label: "開始前の配信", helper: "standby状態のみ表示" },
      "archive-check": { label: "終了済みの配信", helper: "target値は表示しません" }
    },
    dockStatus: {
      ready: "準備完了",
      standby: "待機中",
      blocked: "確認のみ"
    },
    languages: {
      en: "英語",
      ko: "韓国語",
      zh: "中国語",
      ja: "日本語"
    },
    displayModes: {
      both: { label: "両方", helper: "原文と翻訳文" },
      original: { label: "原文", helper: "翻訳元コメントのみ" },
      translated: { label: "翻訳文", helper: "翻訳文を優先表示" }
    },
    surfaces: {
      "obs-browser-dock": { label: "OBS Browser Dock", helper: "配信者向けの密な表示" },
      "narrow-viewport": { label: "狭い画面", helper: "1カラム確認用" }
    },
    filters: {
      all: "すべて",
      translated: "翻訳済み",
      skipped: "スキップ",
      error: "エラー"
    },
    skipReasonLabels: {
      "same-language": "同一言語",
      "too-short": "短すぎる",
      "spam-filter": "スパム判定"
    },
    skipReasonText: {
      "Same language": "同一言語",
      "Too short": "短すぎる",
      "Spam filter": "スパム判定"
    },
    quotaScenarios: {
      normal: { label: "Free枠プレビュー", status: "正常", helper: "30分/日、30分/セッション、30翻訳/分の初期Free枠に合わせた表示です" },
      warning: { label: "上限接近", status: "警告", helper: "Free枠またはサービス共通予算に近づくと停止理由を表示します" },
      empty: { label: "開始前", status: "行なし", helper: "Start前はYouTube取得、AI翻訳、クォータ消費を開始しません" },
      error: { label: "診断制限", status: "cache警告", helper: "raw text loggingは標準で無効、診断は短期間かつsanitizedに限定します" }
    },
    statusBadges: {
      cached: "cached",
      translated: "翻訳済み",
      skipped: "スキップ",
      error: "エラー"
    },
    commentMeta: {
      cache: "cache",
      skipped: "スキップ",
      error: "エラー",
      noTranslatedText: "翻訳文はありません"
    },
    empty: {
      title: "一致するコメントはありません",
      body: "検索語やステータスタブを変えるとプレビュー行を表示できます。"
    },
    safety: [
      "YouTube API取得とAI翻訳は、ログインユーザーがStartしたセッション内だけで実行します。",
      "YouTube接続だけでは、バックグラウンド監視、ポーリング、翻訳、クォータ消費は開始しません。",
      "初期Free枠は30分/日、30分/セッション、1 active session、30翻訳メッセージ/分です。",
      "機密の接続値、配信ターゲット値、認可関連の内部値は画面やブラウザ保存領域に出しません。",
      "raw text loggingは標準で無効です。診断は短期間かつsanitizedに限定します。",
      "有料プランは準備中で、Stripe連携と上限緩和は後続タスクで扱います。"
    ]
  },
  en: {
    header: {
      subtitle: "YouTube first / explicit sessions",
      readOnlyDock: "Read-only Dock",
      target: "Target",
      feedTitle: "YouTube chat public preview"
    },
    sections: {
      setup: "Setup / Connection",
      manualInput: "Manual / Paste Input",
      display: "Display Settings",
      comments: "Live Comments",
      quota: "Cache / Quota Preview",
      skipped: "Skipped Reasons",
      credentialStatus: "YouTube Credential Status",
      operatorSession: "Session Controls",
      operatorFlow: "Operator Flow",
      safety: "Public Release Terms"
    },
    controls: {
      connection: "YouTube connection state",
      stream: "Stream selection",
      sourceLanguage: "Source language",
      targetLanguage: "Target language",
      singleComment: "Single comment",
      multilinePaste: "Multiline paste",
      manualResult: "Manual preview result",
      commentText: "Comment text",
      surface: "Surface",
      currentPair: "Current pair",
      mockState: "Usage state",
      searchPlaceholder: "Search comments"
    },
    stats: {
      shown: "shown",
      total: "total",
      translated: "translated",
      skipped: "skipped",
      quota: "Quota",
      cacheHit: "Cache hit",
      cacheMiss: "Cache miss",
      errorRows: "Error rows",
      used: "used",
      hits: "hits",
      fixtureMisses: "Preview misses",
      recoverable: "Recoverable state",
      manualRows: "manual rows",
      manualSession: "manual session"
    },
    manualInput: {
      helper: "Manual input is preview-only here. Real APIs and AI translation do not run before approved Start execution.",
      singlePlaceholder: "Add one comment",
      pastePlaceholder: "Paste one comment per line",
      sourceBadge: "manual",
      sampleLabel: "sample"
    },
    actions: {
      addManualComments: "Add comments",
      insertSample: "Insert samples",
      clearDraft: "Clear draft",
      clearManualSession: "Clear manual session",
      refreshCredentialStatus: "Check credential status",
      startSession: "Start",
      stopSession: "Stop",
      refreshSession: "Refresh status"
    },
    manualResults: {
      translated: { label: "Translated preview", helper: "Attach deterministic preview translation" },
      skipped: { label: "Skipped preview", helper: "Add with a skip reason" },
      error: { label: "Error preview", helper: "Add as a recoverable error row" }
    },
    fields: {
      mode: "Mode",
      dock: "Dock",
      credentialReference: "Credential reference",
      scope: "Scope",
      expires: "Expires",
      reason: "Reason",
      sessionState: "State",
      elapsed: "Elapsed",
      dailyUsed: "Daily used",
      dailyRemaining: "Daily remaining",
      sessionRemaining: "Session remaining",
      stopReason: "Stop reason",
      nextAction: "Next action",
      providerConnection: "Connection",
      perMinuteCap: "Per-minute cap"
    },
    credentialStatus: {
      pending: "Checking",
      unchecked: "Unchecked",
      refreshFailed: "Could not check credential status",
      safeBoundary: "The client displays only an opaque credentialReferenceId and sanitized metadata. Sensitive connection values and stream target values are not shown.",
      states: {
        available: "Available",
        "reconnect-required": "Reconnect required",
        unavailable: "Unavailable",
        "credential-resolution-disabled": "Resolution disabled"
      }
    },
    operatorSession: {
      helper: "Only a server-owned session advances after Start. This panel displays sanitized session and usage metadata only.",
      pending: "Working",
      actionFailed: "Could not update session state",
      startBlockedTitle: "Start is unavailable because YouTube is not ready",
      startBlockedBody:
        "If Start is unavailable, connect or reconnect YouTube from account integrations, then check credential status again.",
      openIntegrations: "Open YouTube integrations",
      reconnectGuidance: "Reconnect YouTube from account integrations, then check credential status again.",
      safeBoundary: "Sensitive connection values, internal account values, and stream target values are not displayed or stored.",
      perMinuteCapHelper: "Free plan allows 30 translated messages/min.",
      states: {
        "not-started": "Not started",
        active: "Active",
        stopped: "Stopped"
      },
      nextActions: {
        "press-start": "Ready to Start",
        "send-heartbeat-or-stop": "Refresh status or Stop",
        "session-stopped": "Start again if needed",
        "reconnect-or-sign-in": "Reconnect or sign in",
        "wait-for-limit-reset": "Wait for limit reset"
      },
      stopReasons: {
        "user-stop": "User stop",
        "stream-ended": "Stream ended",
        "stream-unavailable": "Stream unavailable",
        "browser-disconnect": "Browser disconnected",
        "missing-heartbeat": "Missing heartbeat",
        "auth-failed": "Auth failed",
        "token-refresh-failed": "Connection refresh failed",
        "reconnect-required": "Reconnect required",
        "daily-time-limit": "Daily time limit",
        "session-time-limit": "Session time limit",
        "translated-message-cap": "Translated-message cap",
        "provider-quota-stop": "Provider quota stop",
        "global-budget-stop": "Global budget stop",
        "ai-budget-stop": "AI budget stop",
        "translation-provider-limit": "Translation provider limit",
        "session-limit": "Session limit",
        "terminal-provider-error": "Terminal provider error"
      }
    },
    operatorFlow: {
      ready: "UI review ready",
      standby: "Waiting for review",
      blocked: "Credential review needed",
      noLiveExecution: "This screen does not run live provider commands.",
      summaryReady: "Runtime smoke boundaries are shown as a safe operator checklist in this UI.",
      summaryStandby: "Check the selected stream or connection state before preparing operator-local commands.",
      summaryBlocked: "Check credential status first and review only sanitized metadata on screen.",
      commandBoundary: "If execution is needed, run CLI commands only after same-thread preflight, sanitized output review, and explicit approval.",
      stepState: {
        done: "Checked",
        waiting: "Waiting",
        gated: "Approval gated"
      },
      steps: {
        "credential-status": {
          label: "Credential status",
          helper: "Review only opaque reference and sanitized metadata"
        },
        "target-readiness": {
          label: "Stream target",
          helper: "The UI shows ready/standby only and never target values"
        },
        "intake-bridge": {
          label: "Intake bridge",
          helper: "Task 6 server-only bridge is not called from the UI"
        },
        "explicit-approval": {
          label: "Execution approval",
          helper: "Live/provider execution needs separate CLI approval in this thread"
        }
      }
    },
    connections: {
      connected: "Connection checked",
      syncing: "Checking connection",
      offline: "Disconnected"
    },
    connectionStatus: {
      connected: "Before start",
      syncing: "Syncing",
      offline: "Offline"
    },
    connectionDockStatus: {
      connected: "Reads only after Start",
      syncing: "Connection alone does not monitor",
      offline: "Dock paused"
    },
    streams: {
      "saturday-setup": { label: "Start target stream", helper: "Ready state only" },
      "karaoke-preview": { label: "Pre-start stream", helper: "Standby state only" },
      "archive-check": { label: "Ended stream", helper: "Target values are not shown" }
    },
    dockStatus: {
      ready: "Ready",
      standby: "Standby",
      blocked: "Read review only"
    },
    languages: {
      en: "English",
      ko: "Korean",
      zh: "Chinese",
      ja: "Japanese"
    },
    displayModes: {
      both: { label: "Both", helper: "Original and translated" },
      original: { label: "Original", helper: "Source comments only" },
      translated: { label: "Translated", helper: "Translated rows first" }
    },
    surfaces: {
      "obs-browser-dock": { label: "OBS Browser Dock", helper: "Dense broadcaster view" },
      "narrow-viewport": { label: "Narrow Viewport", helper: "Single-column review" }
    },
    filters: {
      all: "All",
      translated: "Translated",
      skipped: "Skipped",
      error: "Error"
    },
    skipReasonLabels: {
      "same-language": "Same language",
      "too-short": "Too short",
      "spam-filter": "Spam filter"
    },
    skipReasonText: {
      "Same language": "Same language",
      "Too short": "Too short",
      "Spam filter": "Spam filter"
    },
    quotaScenarios: {
      normal: { label: "Free limit preview", status: "Healthy", helper: "Shows the initial Free limits: 30 min/day, 30 min/session, and 30 translated messages/min" },
      warning: { label: "Near limit", status: "Warning", helper: "The session shows a stop reason before crossing Free limits or shared service budget" },
      empty: { label: "Before start", status: "No rows", helper: "Before Start, YouTube reads, AI translation, and quota use do not begin" },
      error: { label: "Diagnostic limited", status: "Cache warning", helper: "Raw text logging is off by default; diagnostics stay short-lived and sanitized" }
    },
    statusBadges: {
      cached: "cached",
      translated: "translated",
      skipped: "skipped",
      error: "error"
    },
    commentMeta: {
      cache: "cache",
      skipped: "skipped",
      error: "error",
      noTranslatedText: "No translated text for"
    },
    empty: {
      title: "No matching comments",
      body: "Adjust the search or status tab to show preview rows."
    },
    safety: [
      "YouTube API reads and AI translation run only inside a session explicitly started by the signed-in user.",
      "Connecting YouTube alone does not start background monitoring, polling, translation, or quota use.",
      "Initial Free limits are 30 min/day, 30 min/session, 1 active session, and 30 translated messages/min.",
      "Sensitive connection values, stream target values, and internal authorization details are not shown or stored in the browser.",
      "Raw text logging is off by default. Diagnostics stay short-lived and sanitized.",
      "Paid plans are planned; Stripe integration and higher limits are handled in later tasks."
    ]
  }
} as const;

export const commentTranslatorConnectionStates: CommentTranslatorConnectionState[] = [
  {
    id: "connected",
    platformId: "youtube",
    label: "Connection checked",
    statusLabel: "Before start",
    dockStatus: "ready",
    dockStatusLabel: "Reads only after Start",
    channelName: "Server-only target",
    helper: "Ready state only"
  },
  {
    id: "syncing",
    platformId: "youtube",
    label: "Checking connection",
    statusLabel: "Syncing",
    dockStatus: "standby",
    dockStatusLabel: "Connection alone does not monitor",
    channelName: "Server-only target",
    helper: "Target metadata stays server-only"
  },
  {
    id: "offline",
    platformId: "youtube",
    label: "Disconnected",
    statusLabel: "Offline",
    dockStatus: "blocked",
    dockStatusLabel: "Dock paused",
    channelName: "Server-only target",
    helper: "No provider or AI usage starts"
  }
];

export const commentTranslatorStreamOptions: CommentTranslatorStreamOption[] = [
  {
    id: "saturday-setup",
    title: "Start target stream",
    channelName: "Server-only target",
    scheduledLabel: "Ready state only",
    dockStatus: "ready",
    dockStatusLabel: "Ready",
    viewerMode: "broadcaster-read-only"
  },
  {
    id: "karaoke-preview",
    title: "Pre-start stream",
    channelName: "Server-only target",
    scheduledLabel: "Standby state only",
    dockStatus: "standby",
    dockStatusLabel: "Standby",
    viewerMode: "broadcaster-read-only"
  },
  {
    id: "archive-check",
    title: "Ended stream",
    channelName: "Server-only target",
    scheduledLabel: "Target values are not shown",
    dockStatus: "blocked",
    dockStatusLabel: "Read review only",
    viewerMode: "broadcaster-read-only"
  }
];

export const commentTranslatorSourceLanguageOptions: CommentTranslatorLanguageOption<CommentTranslatorSourceLanguageId>[] = [
  { id: "en", label: "English", shortLabel: "EN" },
  { id: "ko", label: "Korean", shortLabel: "KO" },
  { id: "zh", label: "Chinese", shortLabel: "CN" },
  { id: "ja", label: "Japanese", shortLabel: "JA" }
];

export const commentTranslatorTargetLanguageOptions: CommentTranslatorLanguageOption<CommentTranslatorTargetLanguageId>[] = [
  { id: "ja", label: "Japanese", shortLabel: "JA" },
  { id: "en", label: "English", shortLabel: "EN" }
];

export const commentTranslatorDisplayModeOptions: CommentTranslatorControlOption<CommentTranslatorDisplayMode>[] = [
  { id: "both", label: "Both", helper: "Original and translated" },
  { id: "original", label: "Original", helper: "Source comments only" },
  { id: "translated", label: "Translated", helper: "Translated rows first" }
];

export const commentTranslatorSurfaceOptions: CommentTranslatorControlOption<CommentTranslatorSurfaceMode>[] = [
  { id: "obs-browser-dock", label: "OBS Browser Dock", helper: "Dense broadcaster view" },
  { id: "narrow-viewport", label: "Narrow Viewport", helper: "Single-column review" }
];

export const commentTranslatorStatusFilters: CommentTranslatorControlOption<CommentTranslatorStatusFilter>[] = [
  { id: "all", label: "All", helper: "Every preview row" },
  { id: "translated", label: "Translated", helper: "Completed rows" },
  { id: "skipped", label: "Skipped", helper: "Skipped states" },
  { id: "error", label: "Error", helper: "Recoverable failures" }
];

export const commentTranslatorPlatform: CommentTranslatorPlatform = {
  id: "youtube",
  name: "YouTube",
  mode: "read-only-dock",
  statusLabel: "Before start",
  channelName: "Server-only target",
  streamTitle: "Start target stream"
};

export const commentTranslatorSettings: CommentTranslatorSettings = {
  sourceLanguage: "en",
  targetLanguage: "ja",
  targetLanguageLabel: "日本語",
  displayMode: "both",
  surfaceMode: "obs-browser-dock"
};

export const commentTranslatorQuotaScenarios: CommentTranslatorQuotaPreview[] = [
  {
    id: "normal",
    label: "Free limit preview",
    tone: "normal",
    usedUnits: 12,
    limitUnits: 30,
    cacheHits: 218,
    cacheMisses: 61,
    cacheHitRate: 78,
    translatedCount: 11,
    skippedCount: 3,
    errorCount: 1,
    statusLabel: "Healthy",
    helper: "Shows the initial Free limit preview"
  },
  {
    id: "warning",
    label: "Near limit",
    tone: "warning",
    usedUnits: 27,
    limitUnits: 30,
    cacheHits: 232,
    cacheMisses: 102,
    cacheHitRate: 69,
    translatedCount: 16,
    skippedCount: 4,
    errorCount: 1,
    statusLabel: "Warning",
    helper: "Usage is close to the Free or shared service budget limit"
  },
  {
    id: "empty",
    label: "Before start",
    tone: "empty",
    usedUnits: 0,
    limitUnits: 30,
    cacheHits: 0,
    cacheMisses: 0,
    cacheHitRate: 0,
    translatedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    statusLabel: "No rows",
    helper: "No provider or AI usage starts before an explicit Start"
  },
  {
    id: "error",
    label: "Diagnostic limited",
    tone: "error",
    usedUnits: 12,
    limitUnits: 30,
    cacheHits: 218,
    cacheMisses: 61,
    cacheHitRate: 78,
    translatedCount: 11,
    skippedCount: 3,
    errorCount: 2,
    statusLabel: "Cache warning",
    helper: "Diagnostics stay short-lived and sanitized"
  }
];

export const commentTranslatorQuotaPreview = commentTranslatorQuotaScenarios[0];

export const commentTranslatorSkipReasons: CommentTranslatorSkipReason[] = [
  { id: "same-language", label: "Same language", count: 2 },
  { id: "too-short", label: "Too short", count: 1 },
  { id: "spam-filter", label: "Spam filter", count: 1 }
];

export const commentTranslatorManualSamples: CommentTranslatorManualSample[] = [
  { id: "sample-hello", text: "Hello from the manual preview!" },
  { id: "sample-zh", text: "今天的直播很开心!" },
  { id: "sample-ja", text: "日本語コメントはスキップ確認にも使えます" }
];

export const commentTranslatorOperatorFlowSteps: CommentTranslatorOperatorFlowStep[] = [
  { id: "credential-status", source: "ui-local-status-only" },
  { id: "target-readiness", source: "ui-local-status-only" },
  { id: "intake-bridge", source: "ui-local-status-only" },
  { id: "explicit-approval", source: "ui-local-status-only" }
];

export const commentTranslatorComments: CommentTranslatorComment[] = [
  {
    id: "c-001",
    timestamp: "12:34:50",
    authorName: "StreamLover88",
    sourceLanguage: "EN",
    targetLanguage: "JA",
    originalText: "This stream is awesome!",
    translatedText: "この配信、最高です！",
    status: "translated",
    cacheStatus: "hit",
    badge: "first chat",
    unitCost: 1
  },
  {
    id: "c-002",
    timestamp: "12:35:02",
    authorName: "KuroFan",
    sourceLanguage: "EN",
    targetLanguage: "JA",
    originalText: "Love your content! Keep it up!",
    translatedText: "いつも楽しい配信をありがとう！応援しています！",
    status: "translated",
    cacheStatus: "miss",
    badge: "support",
    unitCost: 1
  },
  {
    id: "c-003",
    timestamp: "12:35:07",
    authorName: "Mika",
    sourceLanguage: "JA",
    targetLanguage: "JA",
    originalText: "がんばってください！",
    status: "skipped",
    cacheStatus: "none",
    skipReason: "Same language",
    unitCost: 0
  },
  {
    id: "c-004",
    timestamp: "12:35:12",
    authorName: "Lantern_88",
    sourceLanguage: "CN",
    targetLanguage: "JA",
    originalText: "今天的直播很开心!",
    translatedText: "今日の配信はとても楽しいです！",
    status: "translated",
    cacheStatus: "hit",
    unitCost: 1
  },
  {
    id: "c-005",
    timestamp: "12:35:18",
    authorName: "KimchiLover",
    sourceLanguage: "KO",
    targetLanguage: "JA",
    originalText: "오늘 방송도 너무 재밌어요!",
    translatedText: "今日の配信もとても面白いです！",
    status: "translated",
    cacheStatus: "hit",
    unitCost: 1
  },
  {
    id: "c-006",
    timestamp: "12:35:21",
    authorName: "user_zzzz",
    sourceLanguage: "EN",
    targetLanguage: "JA",
    originalText: "hi",
    status: "skipped",
    cacheStatus: "none",
    skipReason: "Too short",
    unitCost: 0
  },
  {
    id: "c-007",
    timestamp: "12:35:24",
    authorName: "Xx_SPAM_xX",
    sourceLanguage: "EN",
    targetLanguage: "JA",
    originalText: "Check out my channel!!! sub 4 sub!!!",
    status: "skipped",
    cacheStatus: "none",
    skipReason: "Spam filter",
    unitCost: 0
  },
  {
    id: "c-008",
    timestamp: "12:35:27",
    authorName: "StreamRookie",
    sourceLanguage: "EN",
    targetLanguage: "JA",
    originalText: "Why is the boss so strong?!",
    status: "error",
    cacheStatus: "none",
    errorMessage: "Translation failed in preview state",
    unitCost: 0
  }
];

export function findCommentTranslatorOption<TOption extends { id: string }>(
  options: TOption[],
  id: string,
  fallback = options[0]
) {
  return options.find((option) => option.id === id) ?? fallback;
}

export function splitManualCommentInput({
  singleComment,
  multilinePaste
}: {
  singleComment: string;
  multilinePaste: string;
}) {
  return [singleComment, ...multilinePaste.split(/\r?\n/)]
    .map((text) => text.trim())
    .filter(Boolean);
}

export function createManualCommentRows({
  texts,
  resultMode,
  targetLanguage,
  targetLanguageLabel,
  startIndex
}: {
  texts: string[];
  resultMode: CommentTranslatorManualResultMode;
  targetLanguage: CommentTranslatorTargetLanguageId;
  targetLanguageLabel: string;
  startIndex: number;
}): CommentTranslatorComment[] {
  const targetLanguageCode = targetLanguage.toLocaleUpperCase();

  return texts.map((text, index) => {
    const rowNumber = startIndex + index;
    const baseComment: CommentTranslatorComment = {
      id: `manual-${String(rowNumber).padStart(3, "0")}`,
      timestamp: `manual ${String(rowNumber).padStart(2, "0")}`,
      authorName: "Manual input",
      source: "manual",
      sourceLabel: "Manual input",
      sourceLanguage: "MANUAL",
      targetLanguage: targetLanguageCode,
      originalText: text,
      badge: "manual",
      unitCost: 0,
      status: resultMode,
      cacheStatus: "none"
    };

    if (resultMode === "translated") {
      return {
        ...baseComment,
        translatedText: `[Mock ${targetLanguageCode} / ${targetLanguageLabel}] preview translation ${String(rowNumber).padStart(2, "0")}`,
        cacheStatus: "miss",
        unitCost: 1
      };
    }

    if (resultMode === "skipped") {
      return {
        ...baseComment,
        skipReason: text.length <= 2 ? "Too short" : "Same language"
      };
    }

    return {
      ...baseComment,
      errorMessage: `Manual preview error for ${targetLanguageLabel}`
    };
  });
}

export function filterCommentTranslatorComments(
  comments: CommentTranslatorComment[],
  {
    statusFilter,
    searchQuery
  }: {
    statusFilter: CommentTranslatorStatusFilter;
    searchQuery: string;
  }
) {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

  return comments.filter((comment) => {
    const statusMatches = statusFilter === "all" || comment.status === statusFilter;
    if (!statusMatches) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      comment.authorName,
      comment.sourceLanguage,
      comment.targetLanguage,
      comment.originalText,
      comment.translatedText ?? "",
      comment.skipReason ?? "",
      comment.errorMessage ?? "",
      comment.badge ?? "",
      comment.source ?? "",
      comment.sourceLabel ?? ""
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  });
}

export class MockTranslationProvider {
  readonly name = "MockTranslationProvider";

  getSnapshot() {
    return {
      platform: commentTranslatorPlatform,
      settings: commentTranslatorSettings,
      quota: commentTranslatorQuotaPreview,
      connectionStates: commentTranslatorConnectionStates,
      streams: commentTranslatorStreamOptions,
      sourceLanguages: commentTranslatorSourceLanguageOptions,
      targetLanguages: commentTranslatorTargetLanguageOptions,
      displayModes: commentTranslatorDisplayModeOptions,
      surfaceOptions: commentTranslatorSurfaceOptions,
      statusFilters: commentTranslatorStatusFilters,
      quotaScenarios: commentTranslatorQuotaScenarios,
      skipReasons: commentTranslatorSkipReasons,
      manualSamples: commentTranslatorManualSamples,
      comments: commentTranslatorComments
    };
  }
}

export const mockTranslationProvider = new MockTranslationProvider();
