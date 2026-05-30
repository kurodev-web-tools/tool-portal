export type CommentTranslationStatus = "translated" | "skipped" | "error";
export type CommentCacheStatus = "hit" | "miss" | "none";

export type CommentTranslatorPlatform = {
  id: "youtube";
  name: "YouTube";
  mode: "read-only-dock";
  statusLabel: string;
  channelName: string;
  streamTitle: string;
};

export type CommentTranslatorSettings = {
  sourceLanguage: "auto";
  targetLanguage: "ja";
  targetLanguageLabel: string;
  displayMode: "broadcaster-only";
};

export type CommentTranslatorQuotaPreview = {
  usedUnits: number;
  limitUnits: number;
  cacheHits: number;
  cacheHitRate: number;
  translatedCount: number;
  skippedCount: number;
  errorCount: number;
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
  displayMode: "broadcaster-only"
};

export const commentTranslatorQuotaPreview: CommentTranslatorQuotaPreview = {
  usedUnits: 1240,
  limitUnits: 2000,
  cacheHits: 218,
  cacheHitRate: 78,
  translatedCount: 11,
  skippedCount: 3,
  errorCount: 1
};

export const commentTranslatorSkipReasons: CommentTranslatorSkipReason[] = [
  { id: "same-language", label: "Same language", count: 2 },
  { id: "too-short", label: "Too short", count: 1 },
  { id: "spam-filter", label: "Spam filter", count: 1 }
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

export class MockTranslationProvider {
  readonly name = "MockTranslationProvider";

  getSnapshot() {
    return {
      platform: commentTranslatorPlatform,
      settings: commentTranslatorSettings,
      quota: commentTranslatorQuotaPreview,
      skipReasons: commentTranslatorSkipReasons,
      comments: commentTranslatorComments
    };
  }
}

export const mockTranslationProvider = new MockTranslationProvider();
