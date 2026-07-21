"use client";

import { useLocale } from "@/components/portal/LocaleProvider";
import type { Locale } from "@/lib/locale";

const ja = {
  dateLocale: "ja-JP",
  status: { idea: "アイデア", preparing: "準備中", live: "配信中", completed: "完了" },
  category: { "talking-point": "トークポイント", question: "質問", announcement: "お知らせ", reminder: "注意・確認", other: "その他" },
  segment: { opening: "オープニング", main: "本編", intermission: "中休み", closing: "クロージング", anytime: "いつでも" },
  tone: { neutral: "ニュートラル", casual: "カジュアル", energetic: "元気", calm: "落ち着き", serious: "真剣" },
  deleteDialog: { eyebrow: "削除の確認", title: "この内容を削除しますか？", confirm: "削除する", cancel: "キャンセル" },
  app: {
    title: "配信カンペボード",
    description: "配信ごとの話題と注意事項を、まずプラン単位で整理します。",
    newPlan: "新しい配信プラン",
    navigationLabel: "配信カンペボード内ナビゲーション",
    tabs: { plans: "配信プラン", cards: "カンペ編集", live: "配信中", data: "データ管理" },
    sectionTitles: { plans: "配信プラン一覧", cards: "配信プラン編集", live: "配信中ワークスペース", data: "データ管理" },
    sectionDescriptions: {
      plans: "日時順と手動表示順から、次の配信を自動で並べます。",
      cards: "配信プランを選び、カンペカードの内容と順番を整えます。",
      live: "現在の配信で読むカンペを、大きく見やすく表示します。",
      data: "ブラウザ内の配信プランとカンペをJSONでバックアップ・復元します。"
    },
    checkingSavedData: "保存データを確認中",
    planCount: (count: number) => `${count}件のプラン`,
    cardCount: (count: number) => `${count}枚のカンペ`,
    restoredSavedPlans: "ブラウザに保存した配信プランを復元しました。",
    invalidInput: "入力内容を確認してください。",
    updateFailed: "対象の配信プランを更新できませんでした。",
    planUpdated: "配信プランを更新しました。",
    planCreated: "配信プランを作成しました。",
    deletePlanConfirm: (title: string) => `「${title}」を削除しますか？この操作は元に戻せません。`,
    planDeleted: "配信プランを削除しました。",
    planDuplicated: "配信プランを複製しました。",
    orderUpdated: "表示順を更新しました。",
    currentSwitched: "現在の配信を切り替えました。",
    planCompleted: "配信プランを完了にしました。",
    ideaPrepared: "アイデアを準備中へ移しました。"
  },
  planEditor: {
    eyebrow: "配信プラン", createTitle: "新しい配信プラン", editTitle: "配信プランを編集", close: "閉じる",
    title: "タイトル", required: "必須", scheduledAt: "予定日時（任意）", scheduledAtPlaceholder: "日付と時刻を選択", status: "状態", manualOrder: "手動表示順",
    notes: "配信全体メモ", cancel: "キャンセル", create: "配信プランを作成", save: "変更を保存",
    titleError: "タイトルを入力してください。", orderError: "手動表示順は0以上の整数で入力してください。", dateError: "予定日時を確認してください。"
  },
  planList: {
    unscheduled: "日付未定", openLive: "配信中を開く", openLiveLabel: (title: string) => `${title}の配信中ボードを開く`,
    edit: "編集", editLabel: (title: string) => `${title}を編集`, scheduledAt: "予定日時", manualOrder: "手動表示順", prompts: "カンペ",
    cardCount: (count: number) => `${count}枚`, actionsLabel: (title: string) => `${title}の操作`, editCards: "カンペ編集", duplicate: "複製",
    moveUp: "上へ", moveDown: "下へ", prepare: "準備中へ", makeCurrent: "現在の配信にする", complete: "完了", delete: "削除",
    groups: {
      current: { title: "現在の配信", description: "同時に1件だけ。切り替えると以前の配信は準備中へ戻ります。", empty: "現在の配信はありません。" },
      upcoming: { title: "今後の配信", description: "予定日時の近い順。同じ日時と日付未定は手動表示順で並びます。", empty: "準備中の配信プランはありません。" },
      ideas: { title: "日付未定のアイデア", description: "日時が決まる前の企画を置いておけます。", empty: "日付未定のアイデアはありません。" },
      completed: { title: "完了済み", description: "終わった配信プラン。複製して次の構成に再利用できます。", empty: "完了済みの配信プランはありません。" }
    },
    derived: { current: "現在", next: "次回", afterNext: "次々回" }
  },
  planSelector: { label: "編集する配信プラン", empty: "配信プランがありません" },
  cardEditor: {
    eyebrow: "カンペカード", createTitle: "カンペを追加", editTitle: "カンペを編集", close: "閉じる", body: "本文", required: "必須",
    category: "カテゴリ", segment: "配信セグメント", tone: "トーン", safetyNotes: "注意事項", safetyPlaceholder: "固有名詞や避けたい表現など",
    cancel: "キャンセル", create: "追加する", save: "更新する", bodyError: "本文を入力してください。"
  },
  cardList: {
    safety: "注意:", actionsLabel: (body: string) => `${body}の操作`, edit: "編集", moveUp: "上へ", moveDown: "下へ",
    moveDestination: "移動先", moveDestinationLabel: (body: string) => `${body}の移動先`, moveToAnotherPlan: "別の配信プランへ", delete: "削除",
    empty: "この配信プランにはカンペがありません。「カンペを追加」から準備できます。", listLabel: "カンペカード一覧"
  },
  cardWorkspace: {
    updated: "カンペを更新しました。", added: "カンペを追加しました。", deleteConfirm: "このカンペを削除しますか？この操作は元に戻せません。",
    deleted: "カンペを削除しました。", moved: "カンペを別の配信プランへ移動しました。", add: "カンペを追加",
    createPlanTitle: "先に配信プランを作成してください", createPlanDescription: "カンペは配信プランごとに保存されます。", plans: "配信プランへ",
    eyebrow: "配信プラン編集", description: "カンペを手動で並べ、別の配信プランへ移動できます。", cardCount: (count: number) => `${count}枚`,
    listTitle: "カンペカード", listDescription: "上から読む順です。先頭と末尾では並べ替え操作が無効になります。", orderUpdated: "カンペの表示順を更新しました。"
  },
  liveBoard: {
    boardLabel: "カテゴリ別カンペボード", listLabel: "カテゴリ別カンペ一覧", cardCount: (count: number) => `${count}枚`,
    openDetailLabel: (category: string, index: number) => `${category} ${index}枚目の詳細を開く`, openFull: "全文を開く"
  },
  liveDetail: {
    title: "カンペ詳細", safetyNotes: "注意メモ", controlsLabel: "カテゴリ内のカンペ操作", previous: "前のカンペ", copy: "本文をコピー", next: "次のカンペ",
    promptPosition: (category: string, current: number, total: number) => `${category}の${current}枚目、全${total}枚`, back: "一覧に戻る", close: "閉じる"
  },
  liveWorkspace: {
    copied: "カンペ本文をコピーしました。", clipboardUnavailable: "このブラウザではコピー機能を利用できません。本文を選択してコピーしてください。",
    copyFailed: "コピーできませんでした。ブラウザの権限設定を確認してください。", live: "配信中", noCurrentTitle: "現在の配信はありません",
    noCurrentDescription: "配信プランを「現在の配信」に切り替えると、ここでカンペをカテゴリ別に表示できます。", plans: "配信プランへ",
    current: "現在の配信", noCardsDescription: "この配信プランにはカンペがありません。カンペ編集で最初の1枚を追加してください。",
    editThisPlan: "このプランのカンペを編集", description: "カテゴリからカンペを選び、全文と同じカテゴリ内の前後を確認できます。", backToEdit: "カンペ編集へ戻る"
  },
  data: {
    failures: {
      invalidJson: "JSONの形式を確認してください。現在のデータは置き換えていません。", invalidData: "復元データの内容が正しくありません。現在のデータは置き換えていません。",
      unsupportedVersion: "このバックアップは未対応のバージョンです。現在のデータは置き換えていません。", unavailable: "ブラウザ保存を利用できません。現在のデータは置き換えていません。",
      writeFailed: "保存に失敗しました。直前までのデータを維持しています。ブラウザの空き容量を確認してください。"
    },
    backupFailed: "現在のデータをバックアップできませんでした。データ内容を確認してください。", backupCreated: "JSONバックアップを作成しました。", restored: "JSONバックアップを復元しました。",
    backupTitle: "JSONバックアップ", backupDescription: "配信プランとカンペカードをJSONファイルとして保存します。", backupPrivacy: "アカウントや外部サービスの情報は含みません。", createBackup: "JSONバックアップを作成",
    restoreTitle: "JSONから復元", restoreDescription: "バックアップJSONを貼り付けて復元します。", restoreValidation: "形式とバージョンを検証します。", restoreReplacement: "ブラウザへの保存後に、現在のデータを置き換えます。",
    restoreLabel: "バックアップJSON", restore: "JSONから復元"
  }
};

type PromptBoardCopy = typeof ja;

const en: PromptBoardCopy = {
  dateLocale: "en-US",
  status: { idea: "Idea", preparing: "Preparing", live: "Live", completed: "Completed" },
  category: { "talking-point": "Talking point", question: "Question", announcement: "Announcement", reminder: "Reminder", other: "Other" },
  segment: { opening: "Opening", main: "Main", intermission: "Intermission", closing: "Closing", anytime: "Anytime" },
  tone: { neutral: "Neutral", casual: "Casual", energetic: "Energetic", calm: "Calm", serious: "Serious" },
  deleteDialog: { eyebrow: "Confirm deletion", title: "Delete this item?", confirm: "Delete", cancel: "Cancel" },
  app: {
    title: "Live Prompt Board", description: "Organize topics and reminders for each stream, starting with a stream plan.", newPlan: "New stream plan",
    navigationLabel: "Live Prompt Board navigation", tabs: { plans: "Stream plans", cards: "Edit prompts", live: "Live mode", data: "Data" },
    sectionTitles: { plans: "Stream plans", cards: "Edit stream prompts", live: "Live workspace", data: "Data management" },
    sectionDescriptions: { plans: "Upcoming streams are sorted by schedule and manual order.", cards: "Choose a stream plan, then organize prompt content and order.", live: "Show prompts for the current stream in a large, readable view.", data: "Back up and restore browser-local stream plans and prompts as JSON." },
    checkingSavedData: "Checking saved data", planCount: (count) => `${count} ${count === 1 ? "plan" : "plans"}`, cardCount: (count) => `${count} ${count === 1 ? "prompt" : "prompts"}`,
    restoredSavedPlans: "Restored stream plans saved in this browser.", invalidInput: "Check the entered information.", updateFailed: "Could not update the selected stream plan.",
    planUpdated: "Stream plan updated.", planCreated: "Stream plan created.", deletePlanConfirm: (title) => `Delete “${title}”? This action cannot be undone.`, planDeleted: "Stream plan deleted.",
    planDuplicated: "Stream plan duplicated.", orderUpdated: "Display order updated.", currentSwitched: "Current stream changed.", planCompleted: "Stream plan completed.", ideaPrepared: "Idea moved to Preparing."
  },
  planEditor: {
    eyebrow: "Stream plan", createTitle: "New stream plan", editTitle: "Edit stream plan", close: "Close", title: "Title", required: "Required", scheduledAt: "Scheduled date (optional)", scheduledAtPlaceholder: "Choose date and time", status: "Status", manualOrder: "Manual order", notes: "Stream notes", cancel: "Cancel", create: "Create stream plan", save: "Save changes",
    titleError: "Enter a title.", orderError: "Manual order must be a whole number of 0 or greater.", dateError: "Check the scheduled date."
  },
  planList: {
    unscheduled: "Not scheduled", openLive: "Open live mode", openLiveLabel: (title) => `Open live mode for ${title}`, edit: "Edit", editLabel: (title) => `Edit ${title}`, scheduledAt: "Scheduled", manualOrder: "Manual order", prompts: "Prompts", cardCount: (count) => `${count}`, actionsLabel: (title) => `Actions for ${title}`, editCards: "Edit prompts", duplicate: "Duplicate", moveUp: "Move up", moveDown: "Move down", prepare: "Move to Preparing", makeCurrent: "Make current", complete: "Complete", delete: "Delete",
    groups: {
      current: { title: "Current stream", description: "Only one can be current. Switching moves the previous stream back to Preparing.", empty: "There is no current stream." },
      upcoming: { title: "Upcoming streams", description: "Sorted by scheduled date. Matching and unscheduled dates use manual order.", empty: "There are no stream plans in Preparing." },
      ideas: { title: "Unscheduled ideas", description: "Keep stream ideas here before their dates are decided.", empty: "There are no unscheduled ideas." },
      completed: { title: "Completed", description: "Finished stream plans can be duplicated and reused for a future outline.", empty: "There are no completed stream plans." }
    },
    derived: { current: "Current", next: "Next", afterNext: "After next" }
  },
  planSelector: { label: "Stream plan to edit", empty: "No stream plans" },
  cardEditor: { eyebrow: "Prompt card", createTitle: "Add prompt", editTitle: "Edit prompt", close: "Close", body: "Prompt", required: "Required", category: "Category", segment: "Stream segment", tone: "Tone", safetyNotes: "Notes and cautions", safetyPlaceholder: "Names, terms to avoid, or other reminders", cancel: "Cancel", create: "Add", save: "Update", bodyError: "Enter prompt text." },
  cardList: { safety: "Caution:", actionsLabel: (body) => `Actions for ${body}`, edit: "Edit", moveUp: "Move up", moveDown: "Move down", moveDestination: "Move to", moveDestinationLabel: (body) => `Move destination for ${body}`, moveToAnotherPlan: "Another stream plan", delete: "Delete", empty: "This stream plan has no prompts. Use “Add prompt” to create the first one.", listLabel: "Prompt cards" },
  cardWorkspace: { updated: "Prompt updated.", added: "Prompt added.", deleteConfirm: "Delete this prompt? This action cannot be undone.", deleted: "Prompt deleted.", moved: "Prompt moved to another stream plan.", add: "Add prompt", createPlanTitle: "Create a stream plan first", createPlanDescription: "Prompts are saved within each stream plan.", plans: "Go to stream plans", eyebrow: "Edit stream plan", description: "Manually order prompts or move them to another stream plan.", cardCount: (count) => `${count}`, listTitle: "Prompt cards", listDescription: "Read from top to bottom. Reorder controls are disabled at the first and last positions.", orderUpdated: "Prompt order updated." },
  liveBoard: { boardLabel: "Prompt board by category", listLabel: "Prompt list by category", cardCount: (count) => `${count}`, openDetailLabel: (category, index) => `Open details for ${category} prompt ${index}`, openFull: "Open full text" },
  liveDetail: { title: "Prompt details", safetyNotes: "Caution notes", controlsLabel: "Prompt navigation within category", previous: "Previous prompt", copy: "Copy text", next: "Next prompt", promptPosition: (category, current, total) => `${category}, prompt ${current} of ${total}`, back: "Back to list", close: "Close" },
  liveWorkspace: { copied: "Prompt text copied.", clipboardUnavailable: "Copy is unavailable in this browser. Select the text and copy it manually.", copyFailed: "Could not copy. Check the browser permission settings.", live: "Live", noCurrentTitle: "There is no current stream", noCurrentDescription: "Set a stream plan as Current to show its prompts here by category.", plans: "Go to stream plans", current: "Current stream", noCardsDescription: "This stream plan has no prompts. Add the first one in Edit prompts.", editThisPlan: "Edit prompts for this plan", description: "Choose a prompt by category, then review its full text and adjacent prompts.", backToEdit: "Back to prompt editing" },
  data: {
    failures: { invalidJson: "Check the JSON format. Your current data was not replaced.", invalidData: "The restored data is invalid. Your current data was not replaced.", unsupportedVersion: "This backup version is not supported. Your current data was not replaced.", unavailable: "Browser storage is unavailable. Your current data was not replaced.", writeFailed: "Saving failed. Your previous data is still available. Check your browser storage space." },
    backupFailed: "Could not back up the current data. Check the data and try again.", backupCreated: "JSON backup created.", restored: "JSON backup restored.", backupTitle: "JSON backup", backupDescription: "Save stream plans and prompt cards as a JSON file.", backupPrivacy: "Account and external-service information is not included.", createBackup: "Create JSON backup", restoreTitle: "Restore from JSON", restoreDescription: "Paste a backup JSON to restore it.", restoreValidation: "The format and version are validated.", restoreReplacement: "Current data is replaced only after it is saved in the browser.", restoreLabel: "Backup JSON", restore: "Restore from JSON"
  }
};

export const viewerEngagementPromptBoardCopy: Readonly<Record<Locale, PromptBoardCopy>> = { ja, en };

export function useViewerEngagementPromptBoardCopy(): PromptBoardCopy {
  const { locale } = useLocale();
  return viewerEngagementPromptBoardCopy[locale];
}
