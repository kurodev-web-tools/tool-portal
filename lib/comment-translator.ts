export type CommentTranslationStatus = "translated" | "skipped" | "error";
export type CommentCacheStatus = "hit" | "miss" | "none";
export type CommentTranslatorConnectionStateId = "connected" | "syncing" | "offline";
export type CommentTranslatorDockStatus = "ready" | "standby" | "blocked";
export type CommentTranslatorSourceLanguageId = "auto" | "en" | "es" | "ko" | "ja";
export type CommentTranslatorTargetLanguageId = "ja" | "en" | "ko" | "es";
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
      subtitle: "YouTube優先 / OBS Browser Dock",
      readOnlyDock: "読み取り専用Dock",
      target: "表示先",
      feedTitle: "YouTubeチャットfixture"
    },
    sections: {
      setup: "セットアップ / 接続",
      manualInput: "手入力 / 貼り付け",
      display: "表示設定",
      comments: "ライブコメント",
      quota: "キャッシュ / クォータ確認",
      skipped: "スキップ理由",
      credentialStatus: "YouTube認証ステータス",
      operatorFlow: "オペレーター確認フロー",
      safety: "読み取り専用の安全性"
    },
    controls: {
      connection: "YouTube mock接続",
      stream: "配信選択",
      sourceLanguage: "翻訳元言語",
      targetLanguage: "翻訳先言語",
      singleComment: "単一コメント",
      multilinePaste: "複数行貼り付け",
      manualResult: "手入力mock結果",
      commentText: "コメント本文",
      surface: "表示面",
      currentPair: "現在の組み合わせ",
      mockState: "mock状態",
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
      fixtureMisses: "fixture miss",
      recoverable: "復帰可能な状態",
      manualRows: "手入力行",
      manualSession: "手入力セッション"
    },
    manualInput: {
      helper: "実APIなしで、入力したコメントをfixture feedに追加します。",
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
      refreshCredentialStatus: "認証ステータスを確認"
    },
    manualResults: {
      translated: { label: "翻訳済みmock", helper: "決定的なmock翻訳を付ける" },
      skipped: { label: "スキップmock", helper: "スキップ理由つきで追加" },
      error: { label: "エラーmock", helper: "復帰可能なエラー行として追加" }
    },
    fields: {
      mode: "モード",
      channel: "チャンネル",
      dock: "Dock",
      credentialReference: "Credential reference",
      providerChannel: "Provider channel",
      scope: "Scope",
      expires: "Expires",
      reason: "Reason"
    },
    credentialStatus: {
      pending: "確認中",
      unchecked: "未確認",
      refreshFailed: "認証ステータスを確認できませんでした",
      safeBoundary: "画面にはopaqueなcredentialReferenceIdとsanitized metadataだけを表示します。",
      states: {
        available: "利用可能",
        "reconnect-required": "再接続が必要",
        unavailable: "未利用",
        "credential-resolution-disabled": "解決を停止中"
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
      connected: "接続中mock",
      syncing: "同期中fixture",
      offline: "未接続fixture"
    },
    connectionStatus: {
      connected: "ライブmock",
      syncing: "同期中",
      offline: "オフラインmock"
    },
    connectionDockStatus: {
      connected: "Broadcaster Dock準備完了",
      syncing: "Dock待機中",
      offline: "Dock停止中"
    },
    streams: {
      "saturday-setup": { label: "土曜配信セットアップ", helper: "配信中" },
      "karaoke-preview": { label: "歌枠リハーサル確認", helper: "20分後に開始" },
      "archive-check": { label: "アーカイブコメント確認", helper: "終了済みfixture" }
    },
    dockStatus: {
      ready: "準備完了",
      standby: "待機中",
      blocked: "確認のみ"
    },
    languages: {
      auto: "自動判定",
      en: "英語",
      es: "スペイン語",
      ko: "韓国語",
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
      normal: { label: "通常のcache mix", status: "正常", helper: "fixture feedにhitとmissの行が表示されます" },
      warning: { label: "クォータ警告", status: "警告", helper: "preview上限に近づいている状態です" },
      empty: { label: "空のセッション", status: "行なし", helper: "fixture cacheにコメントが届いていません" },
      error: { label: "cache利用不可", status: "cache警告", helper: "cache統計が使えない間もfixture表示は継続します" }
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
      body: "検索語やステータスタブを変えるとfixture行を表示できます。"
    },
    safety: [
      "視聴者向けoverlayは含めていません。",
      "返信生成と自動投稿は含めていません。",
      "すべてUI確認用のfixture値です。"
    ]
  },
  en: {
    header: {
      subtitle: "YouTube first / OBS Browser Dock",
      readOnlyDock: "Read-only Dock",
      target: "Target",
      feedTitle: "YouTube chat fixture"
    },
    sections: {
      setup: "Setup / Connection",
      manualInput: "Manual / Paste Input",
      display: "Display Settings",
      comments: "Live Comments",
      quota: "Cache / Quota Preview",
      skipped: "Skipped Reasons",
      credentialStatus: "YouTube Credential Status",
      operatorFlow: "Operator Flow",
      safety: "Read-only Safety"
    },
    controls: {
      connection: "YouTube mock connection",
      stream: "Stream selection",
      sourceLanguage: "Source language",
      targetLanguage: "Target language",
      singleComment: "Single comment",
      multilinePaste: "Multiline paste",
      manualResult: "Manual mock result",
      commentText: "Comment text",
      surface: "Surface",
      currentPair: "Current pair",
      mockState: "Mock state",
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
      fixtureMisses: "Fixture misses",
      recoverable: "Recoverable state",
      manualRows: "manual rows",
      manualSession: "manual session"
    },
    manualInput: {
      helper: "Add comments you typed or pasted to the fixture feed without using a real API.",
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
      refreshCredentialStatus: "Check credential status"
    },
    manualResults: {
      translated: { label: "Translated mock", helper: "Attach deterministic mock translation" },
      skipped: { label: "Skipped mock", helper: "Add with a skip reason" },
      error: { label: "Error mock", helper: "Add as a recoverable error row" }
    },
    fields: {
      mode: "Mode",
      channel: "Channel",
      dock: "Dock",
      credentialReference: "Credential reference",
      providerChannel: "Provider channel",
      scope: "Scope",
      expires: "Expires",
      reason: "Reason"
    },
    credentialStatus: {
      pending: "Checking",
      unchecked: "Unchecked",
      refreshFailed: "Could not check credential status",
      safeBoundary: "The client displays only an opaque credentialReferenceId and sanitized metadata.",
      states: {
        available: "Available",
        "reconnect-required": "Reconnect required",
        unavailable: "Unavailable",
        "credential-resolution-disabled": "Resolution disabled"
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
      connected: "Connected mock",
      syncing: "Syncing fixture",
      offline: "Disconnected fixture"
    },
    connectionStatus: {
      connected: "Live mock",
      syncing: "Syncing",
      offline: "Offline mock"
    },
    connectionDockStatus: {
      connected: "Broadcaster dock ready",
      syncing: "Dock waiting",
      offline: "Dock paused"
    },
    streams: {
      "saturday-setup": { label: "Saturday stream setup", helper: "Live now" },
      "karaoke-preview": { label: "Karaoke practice preview", helper: "Starts in 20 min" },
      "archive-check": { label: "Archive chat review", helper: "Ended fixture" }
    },
    dockStatus: {
      ready: "Ready",
      standby: "Standby",
      blocked: "Read review only"
    },
    languages: {
      auto: "Auto detect",
      en: "English",
      es: "Spanish",
      ko: "Korean",
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
      normal: { label: "Normal cache mix", status: "Healthy", helper: "Hit and miss rows are visible in the fixture feed" },
      warning: { label: "Quota warning", status: "Warning", helper: "Usage is close to the preview limit" },
      empty: { label: "Empty session", status: "No rows", helper: "No comments have reached the fixture cache" },
      error: { label: "Cache unavailable", status: "Cache warning", helper: "Preview keeps reading fixtures while cache stats are unavailable" }
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
      body: "Adjust the search or status tab to show fixture rows."
    },
    safety: [
      "Viewer-facing overlay is absent.",
      "Reply generation and auto-posting are absent.",
      "All values are fixture-only for UI review."
    ]
  }
} as const;

export const commentTranslatorConnectionStates: CommentTranslatorConnectionState[] = [
  {
    id: "connected",
    platformId: "youtube",
    label: "Connected mock",
    statusLabel: "Live mock",
    dockStatus: "ready",
    dockStatusLabel: "Broadcaster dock ready",
    channelName: "Kuro Channel",
    helper: "Fixture feed is active"
  },
  {
    id: "syncing",
    platformId: "youtube",
    label: "Syncing fixture",
    statusLabel: "Syncing",
    dockStatus: "standby",
    dockStatusLabel: "Dock waiting",
    channelName: "Kuro Channel",
    helper: "Stream metadata is refreshing"
  },
  {
    id: "offline",
    platformId: "youtube",
    label: "Disconnected fixture",
    statusLabel: "Offline mock",
    dockStatus: "blocked",
    dockStatusLabel: "Dock paused",
    channelName: "Kuro Channel",
    helper: "No live fixture is selected"
  }
];

export const commentTranslatorStreamOptions: CommentTranslatorStreamOption[] = [
  {
    id: "saturday-setup",
    title: "Saturday stream setup",
    channelName: "Kuro Channel",
    scheduledLabel: "Live now",
    dockStatus: "ready",
    dockStatusLabel: "Ready",
    viewerMode: "broadcaster-read-only"
  },
  {
    id: "karaoke-preview",
    title: "Karaoke practice preview",
    channelName: "Kuro Channel",
    scheduledLabel: "Starts in 20 min",
    dockStatus: "standby",
    dockStatusLabel: "Standby",
    viewerMode: "broadcaster-read-only"
  },
  {
    id: "archive-check",
    title: "Archive chat review",
    channelName: "Kuro Channel",
    scheduledLabel: "Ended fixture",
    dockStatus: "blocked",
    dockStatusLabel: "Read review only",
    viewerMode: "broadcaster-read-only"
  }
];

export const commentTranslatorSourceLanguageOptions: CommentTranslatorLanguageOption<CommentTranslatorSourceLanguageId>[] = [
  { id: "auto", label: "Auto detect", shortLabel: "AUTO" },
  { id: "en", label: "English", shortLabel: "EN" },
  { id: "es", label: "Spanish", shortLabel: "ES" },
  { id: "ko", label: "Korean", shortLabel: "KO" },
  { id: "ja", label: "Japanese", shortLabel: "JA" }
];

export const commentTranslatorTargetLanguageOptions: CommentTranslatorLanguageOption<CommentTranslatorTargetLanguageId>[] = [
  { id: "ja", label: "Japanese", shortLabel: "JA" },
  { id: "en", label: "English", shortLabel: "EN" },
  { id: "ko", label: "Korean", shortLabel: "KO" },
  { id: "es", label: "Spanish", shortLabel: "ES" }
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
  { id: "all", label: "All", helper: "Every fixture row" },
  { id: "translated", label: "Translated", helper: "Completed rows" },
  { id: "skipped", label: "Skipped", helper: "Skipped states" },
  { id: "error", label: "Error", helper: "Recoverable failures" }
];

export const commentTranslatorPlatform: CommentTranslatorPlatform = {
  id: "youtube",
  name: "YouTube",
  mode: "read-only-dock",
  statusLabel: "Connected mock",
  channelName: "Kuro Channel",
  streamTitle: "Saturday stream setup"
};

export const commentTranslatorSettings: CommentTranslatorSettings = {
  sourceLanguage: "auto",
  targetLanguage: "ja",
  targetLanguageLabel: "日本語",
  displayMode: "both",
  surfaceMode: "obs-browser-dock"
};

export const commentTranslatorQuotaScenarios: CommentTranslatorQuotaPreview[] = [
  {
    id: "normal",
    label: "Normal cache mix",
    tone: "normal",
    usedUnits: 1240,
    limitUnits: 2000,
    cacheHits: 218,
    cacheMisses: 61,
    cacheHitRate: 78,
    translatedCount: 11,
    skippedCount: 3,
    errorCount: 1,
    statusLabel: "Healthy",
    helper: "Hit and miss rows are visible in the fixture feed"
  },
  {
    id: "warning",
    label: "Quota warning",
    tone: "warning",
    usedUnits: 1840,
    limitUnits: 2000,
    cacheHits: 232,
    cacheMisses: 102,
    cacheHitRate: 69,
    translatedCount: 16,
    skippedCount: 4,
    errorCount: 1,
    statusLabel: "Warning",
    helper: "Usage is close to the preview limit"
  },
  {
    id: "empty",
    label: "Empty session",
    tone: "empty",
    usedUnits: 0,
    limitUnits: 2000,
    cacheHits: 0,
    cacheMisses: 0,
    cacheHitRate: 0,
    translatedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    statusLabel: "No rows",
    helper: "No comments have reached the fixture cache"
  },
  {
    id: "error",
    label: "Cache unavailable",
    tone: "error",
    usedUnits: 1240,
    limitUnits: 2000,
    cacheHits: 218,
    cacheMisses: 61,
    cacheHitRate: 78,
    translatedCount: 11,
    skippedCount: 3,
    errorCount: 2,
    statusLabel: "Cache warning",
    helper: "Preview keeps reading fixtures while cache stats are unavailable"
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
  { id: "sample-es", text: "Gracias por el stream de hoy!" },
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
    authorName: "Mariposa_88",
    sourceLanguage: "ES",
    targetLanguage: "JA",
    originalText: "Saludos desde Espana! Me encanta tu directo!",
    translatedText: "スペインからこんにちは！あなたの配信が大好きです！",
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
    errorMessage: "Translation failed in mock state",
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
      errorMessage: `Manual mock error for ${targetLanguageLabel}`
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
