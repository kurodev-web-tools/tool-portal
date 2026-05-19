import type {
  AnnouncementStatus,
  CalendarView,
  EventCategory,
  EventRecurrence,
  PostTemplate,
  PostTemplateUsageCategory
} from "@/lib/schedule-calendar";
import type { Locale } from "@/lib/locale";

type OptionCopy<T extends string | number> = {
  value: T;
  label: string;
};

type BuiltInTemplateCopy = Pick<PostTemplate, "name" | "description" | "body" | "hashtags">;

export const scheduleCalendarCopy = {
  ja: {
    toolbar: {
      title: "予定・配信管理",
      description: "予定作成から告知文、サムネ、分割画像までつなげます。",
      today: "今日"
    },
    tabs: {
      schedule: "予定管理",
      post: "投稿補助",
      events: "予定一覧",
      settings: "設定",
      calendar: "カレンダー"
    },
    views: {
      month: "月",
      week: "週",
      day: "日"
    },
    weekStarts: {
      sunday: "日曜",
      monday: "月曜",
      sundayStart: "日曜開始",
      mondayStart: "月曜開始",
      weekdays: ["日", "月", "火", "水", "木", "金", "土"]
    },
    common: {
      countUnit: "件",
      none: "-",
      untitled: "無題の予定",
      unset: "未設定",
      edit: "編集",
      delete: "削除",
      save: "保存",
      reset: "リセット",
      duplicate: "複製",
      close: "閉じる",
      details: "詳細",
      add: "追加",
      new: "新規",
      confirm: "決定",
      loading: "スケジュールカレンダーを読み込んでいます。"
    },
    categories: {
      stream: "配信",
      production: "制作",
      post: "投稿",
      planning: "企画",
      prep: "準備",
      business: "ビジネス"
    },
    recurrence: {
      none: "繰り返しなし",
      daily: "毎日",
      weekly: "毎週"
    },
    announcementStatus: {
      "not-started": "未着手",
      preparing: "準備中",
      "copy-ready": "投稿文準備済み",
      "image-ready": "告知画像作成済み",
      announced: "告知済み",
      streamed: "配信済み"
    },
    templateUsage: {
      "x-post": "X告知",
      "youtube-description": "YouTube概要欄",
      reminder: "直前リマインド",
      "after-note": "終了後フォロー",
      "title-ideas": "タイトル候補",
      custom: "カスタム"
    },
    filters: {
      allCategories: "カテゴリすべて",
      allPlatforms: "媒体すべて",
      allPeriods: "全期間",
      todayOnward: "今日以降",
      withinWeek: "7日以内",
      withinMonth: "30日以内",
      upcoming: "直近順",
      dateAsc: "日付昇順",
      dateDesc: "日付降順",
      allAnnouncements: "告知すべて",
      search: "検索",
      titleSearchPlaceholder: "タイトルを検索",
      category: "カテゴリ",
      platform: "媒体",
      period: "期間",
      sortOrder: "並び順",
      announcementStatus: "告知ステータス"
    },
    empty: {
      events: "予定はまだありません。",
      searchResults: "条件に一致する予定はありません。"
    },
    eventDetail: {
      time: "時間",
      category: "カテゴリ",
      platform: "プラットフォーム",
      recurrence: "繰り返し",
      announcementPrep: "告知準備",
      memo: "メモ",
      emptyMemo: "メモはありません。",
      announcementMemo: "告知準備メモ",
      emptyAnnouncementMemo: "告知準備メモはありません。"
    },
    eventList: {
      title: "予定一覧",
      emptyDayAction: "この日に新しい予定を追加",
      dayEventsTitle: "この日の予定一覧",
      selectedDate: "選択中の日付",
      selectedDateGuide: "予定を選ぶと編集できます。告知文やサムネ導線は投稿補助タブで確認します。",
      createNewEvent: "新しい予定を追加",
      editEvent: "予定の編集",
      newEvent: "新しい予定",
      eventDetail: "予定詳細",
      editSelected: "編集する"
    },
    form: {
      title: "タイトル",
      titlePlaceholder: "配信企画会議",
      titleWarning: "一覧と次ツールで見切れないよう、短めに整えると扱いやすいです。",
      date: "日付",
      startTime: "開始時間",
      endTime: "終了時間",
      category: "カテゴリ",
      platform: "プラットフォーム",
      memo: "メモ・備考",
      memoPlaceholder: "次回配信のセットリストやコラボ企画案を記録する。",
      announcementStatus: "告知ステータス",
      announcementHashtags: "告知ハッシュタグ",
      hashtagPlaceholder: "#VTuber #配信告知",
      hashtagWarning: "投稿文と次ツールで確認しやすい量に整えると扱いやすいです。",
      addSavedSet: "保存済みセットから追加",
      announcementText: "告知文メモ",
      announcementTextPlaceholder: "予定固有の告知文や、テンプレートの {announcementText} に差し込む文面。",
      announcementTextWarning: "投稿前に要点を絞ると、コピーと次ツールへの受け渡しが確認しやすいです。",
      preparationMemo: "準備メモ",
      preparationMemoPlaceholder: "サムネ素材、告知画像、投稿タイミングなど。",
      recurrence: "繰り返し",
      recurrenceCount: "作成回数",
      recurrenceHelp: "毎日 / 毎週のみ対応。例外日やシリーズ一括編集は未対応です。",
      selectTime: "時刻を選択",
      hour: "時",
      minute: "分"
    },
    postAssist: {
      selectedEvent: "対象予定",
      noSelectedEvent: "予定未選択",
      template: "テンプレート",
      templateTags: "テンプレートタグ",
      savedHashtags: "保存済みハッシュタグ",
      clearSelection: "選択解除",
      addHashtagsInSettings: "設定でハッシュタグセットを追加できます。",
      selectedHashtagsHelp: "選択したセットはテンプレートタグ、予定タグと重複排除してプレビューへ追加します。",
      eventTags: "予定タグ",
      previewTitle: "投稿文プレビュー",
      previewWarning: "X投稿や次ツールで確認しやすいよう、コピー前に要点を絞ると扱いやすいです。",
      copy: "告知文をコピー",
      openX: "Xで開く",
      createThumbnail: "サムネを作る",
      createSnsSplit: "分割画像を作る",
      manualCopy: "手動コピー用",
      startGuide: "予定を選ぶと、告知文コピーと Thumbnail Editor / SNS分割画像メーカーへの受け渡しをここで確認できます。"
    },
    handoff: {
      selectedGuide: "Thumbnail Editorには予定テキストを初期値として渡します。SNS分割画像メーカーではメイン画像を選んでから個別PNG/JPEGを書き出します。",
      emptyGuide: "予定を選ぶと、公開前の配信ワークフロー導線として次ツールへ初期テキストを渡せます。",
      emptySelectionError: "予定を選ぶと、サムネ作成や分割画像作成へ初期テキストを渡せます。",
      storageError: "次ツールへ渡す一時データを保存できませんでした。予定内容はこの画面に残っています。"
    },
    settings: {
      title: "設定",
      display: "表示設定",
      displayAndDefaults: "表示・既定値",
      defaults: "既定値",
      data: "データ管理",
      dataSummary: "JSONバックアップ / 復元 / 初期化",
      backupCreate: "バックアップ作成",
      backupRestore: "バックアップ復元",
      backupHelp: "このブラウザに保存された予定、投稿補助テンプレート、ハッシュタグ、設定をJSONで控えます。復元に失敗した場合、既存データは変更しません。",
      importPlaceholder: "復元するバックアップJSONを貼り付け",
      resetAll: "全データ初期化",
      savedHashtags: "保存済みハッシュタグ",
      emptyHashtags: "保存済みハッシュタグはありません。",
      postTemplates: "投稿補助テンプレート",
      postAssistSettings: "投稿補助設定",
      defaultTemplate: "既定テンプレート",
      defaultView: "初期表示ビュー",
      weekStartsOn: "週開始曜日",
      defaultStartTime: "既定開始時刻",
      defaultDuration: "既定予定時間",
      defaultDurationShort: "既定所要時間"
    },
    templateEditor: {
      name: "テンプレ名",
      usageCategory: "用途カテゴリ",
      defaultPlatform: "既定プラットフォーム",
      description: "説明",
      body: "本文",
      bodyWarning: "長文テンプレートはプレビューとコピーの見通しが悪くなります。",
      hashtags: "ハッシュタグ",
      hashtagsWarning: "タグが多いと投稿補助とhandoffが読みにくくなります。",
      hashtagsHelp: "本文とは別に保存し、コピー時に予定側のハッシュタグと結合します。",
      save: "テンプレートを保存",
      hashtagSetName: "セット名",
      hashtagSetNamePlaceholder: "ゲーム配信",
      hashtagSetPlaceholder: "#ゲーム配信 #VTuber",
      hashtagSetHelp: "よく使う組み合わせを保存し、投稿補助プレビューで任意に追加できます。",
      hashtagSetSave: "ハッシュタグセットを保存"
    },
    messages: {
      saveFailure: "保存できませんでした。ブラウザの保存領域を確認してください。",
      importFailure: "JSONをインポートできませんでした。形式を確認してください。既存データは変更していません。",
      restoreEvent: "予定を元に戻しました。",
      invalidEndTime: "終了時間は開始時間より後にしてください。",
      moved: "予定を移動しました。",
      updated: "予定を更新しました。",
      saved: "予定を保存しました。",
      deleted: "予定を削除しました。",
      undo: "元に戻す",
      recurrenceSaved: (count: number) => `${count}件の繰り返し予定を作成しました。`,
      editDiscarded: "編集内容を破棄しました。",
      createCanceled: "新規作成を取り消しました。",
      settingsUpdated: "設定を更新しました。",
      templateSaved: "テンプレートを保存しました。",
      templateEditing: "テンプレートを編集中です。",
      templateDeleted: "テンプレートを削除しました。",
      hashtagSaved: "ハッシュタグセットを保存しました。",
      hashtagEditing: "ハッシュタグセットを編集中です。",
      hashtagDeleted: "ハッシュタグセットを削除しました。",
      backupCreated: "バックアップJSONを作成しました。必要な場所に保管してください。",
      backupRestored: "バックアップJSONを復元しました。",
      resetAll: "全データを初期化しました。",
      copied: "投稿文をコピーしました。",
      storageReadFailure: "保存済みデータを読み込めませんでした。既存データは保持しています。",
      copyFailure: "コピーできませんでした。下の文面を選択して手動でコピーしてください。",
      resetConfirm: "予定、設定、投稿補助テンプレート、保存済みハッシュタグをすべて初期化します。この操作は元に戻せません。"
    },
    defaults: {
      templateName: "新しいテンプレート",
      templateDescription: "カスタムテンプレート",
      templateBody: "【告知】\n{date} {startTime} - {endTime}\n{title}",
      hashtagSetName: "新しいハッシュタグセット"
    }
  },
  en: {
    toolbar: {
      title: "Schedule & stream planning",
      description: "Plan events, announcement copy, thumbnails, and split images in one flow.",
      today: "Today"
    },
    tabs: {
      schedule: "Schedule",
      post: "Post assist",
      events: "Events",
      settings: "Settings",
      calendar: "Calendar"
    },
    views: {
      month: "Month",
      week: "Week",
      day: "Day"
    },
    weekStarts: {
      sunday: "Sun",
      monday: "Mon",
      sundayStart: "Starts Sun",
      mondayStart: "Starts Mon",
      weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    },
    common: {
      countUnit: "items",
      none: "-",
      untitled: "Untitled event",
      unset: "Not set",
      edit: "Edit",
      delete: "Delete",
      save: "Save",
      reset: "Reset",
      duplicate: "Duplicate",
      close: "Close",
      details: "Details",
      add: "Add",
      new: "New",
      confirm: "Apply",
      loading: "Loading Schedule Calendar."
    },
    categories: {
      stream: "Stream",
      production: "Production",
      post: "Post",
      planning: "Planning",
      prep: "Prep",
      business: "Business"
    },
    recurrence: {
      none: "No repeat",
      daily: "Daily",
      weekly: "Weekly"
    },
    announcementStatus: {
      "not-started": "Not started",
      preparing: "Preparing",
      "copy-ready": "Copy ready",
      "image-ready": "Image ready",
      announced: "Announced",
      streamed: "Streamed"
    },
    templateUsage: {
      "x-post": "X announcement",
      "youtube-description": "YouTube description",
      reminder: "Reminder",
      "after-note": "After-note",
      "title-ideas": "Title ideas",
      custom: "Custom"
    },
    filters: {
      allCategories: "All categories",
      allPlatforms: "All platforms",
      allPeriods: "All dates",
      todayOnward: "From today",
      withinWeek: "Next 7 days",
      withinMonth: "Next 30 days",
      upcoming: "Upcoming",
      dateAsc: "Date asc",
      dateDesc: "Date desc",
      allAnnouncements: "All statuses",
      search: "Search",
      titleSearchPlaceholder: "Search title",
      category: "Category",
      platform: "Platform",
      period: "Date range",
      sortOrder: "Sort",
      announcementStatus: "Status"
    },
    empty: {
      events: "No events yet.",
      searchResults: "No events match these filters."
    },
    eventDetail: {
      time: "Time",
      category: "Category",
      platform: "Platform",
      recurrence: "Repeat",
      announcementPrep: "Announcement",
      memo: "Memo",
      emptyMemo: "No memo yet.",
      announcementMemo: "Prep memo",
      emptyAnnouncementMemo: "No prep memo yet."
    },
    eventList: {
      title: "Events",
      emptyDayAction: "Add an event for this day",
      dayEventsTitle: "Events on this day",
      selectedDate: "Selected date",
      selectedDateGuide: "Select an event to edit it. Announcement copy and next-tool handoff stay in Post assist.",
      createNewEvent: "Add event",
      editEvent: "Edit event",
      newEvent: "New event",
      eventDetail: "Event details",
      editSelected: "Edit"
    },
    form: {
      title: "Title",
      titlePlaceholder: "Stream planning meeting",
      titleWarning: "Keep it short enough for lists and next-tool handoff.",
      date: "Date",
      startTime: "Start",
      endTime: "End",
      category: "Category",
      platform: "Platform",
      memo: "Memo",
      memoPlaceholder: "Add set lists, collab notes, or prep details.",
      announcementStatus: "Status",
      announcementHashtags: "Hashtags",
      hashtagPlaceholder: "#VTuber #Stream",
      hashtagWarning: "Keep tags readable for post assist and handoff.",
      addSavedSet: "Add from saved sets",
      announcementText: "Announcement memo",
      announcementTextPlaceholder: "Event-specific copy inserted into {announcementText}.",
      announcementTextWarning: "Trim the key points before copying or handing off.",
      preparationMemo: "Prep memo",
      preparationMemoPlaceholder: "Thumbnail assets, announcement image, posting timing, and notes.",
      recurrence: "Repeat",
      recurrenceCount: "Count",
      recurrenceHelp: "Daily and weekly repeats only. Exceptions and bulk series edits are not supported yet.",
      selectTime: "Select time",
      hour: "Hour",
      minute: "Minute"
    },
    postAssist: {
      selectedEvent: "Target event",
      noSelectedEvent: "No event selected",
      template: "Template",
      templateTags: "Template tags",
      savedHashtags: "Saved hashtags",
      clearSelection: "Clear",
      addHashtagsInSettings: "Add hashtag sets in Settings.",
      selectedHashtagsHelp: "Selected sets are merged with template and event tags, with duplicates removed.",
      eventTags: "Event tags",
      previewTitle: "Post preview",
      previewWarning: "Trim the key points before copying or handing off.",
      copy: "Copy post",
      openX: "Open X",
      createThumbnail: "Create thumbnail",
      createSnsSplit: "Create split images",
      manualCopy: "Manual copy",
      startGuide: "Select an event to review announcement copy and handoff to Thumbnail Editor or SNS Split Image Maker."
    },
    handoff: {
      selectedGuide: "Thumbnail Editor receives the event text as starter copy. In SNS Split Image Maker, choose the main image, then export each PNG/JPEG.",
      emptyGuide: "Select an event to pass starter text to the next tool in the pre-publish workflow.",
      emptySelectionError: "Select an event before sending starter text to thumbnail or split-image workflows.",
      storageError: "Could not save the temporary handoff data. The event details are still available here."
    },
    settings: {
      title: "Settings",
      display: "Display",
      displayAndDefaults: "Display & defaults",
      defaults: "Defaults",
      data: "Data",
      dataSummary: "JSON backup / restore / reset",
      backupCreate: "Create backup",
      backupRestore: "Restore backup",
      backupHelp: "Create a JSON backup of events, post templates, hashtags, and settings saved in this browser. If restore fails, existing data is left unchanged.",
      importPlaceholder: "Paste backup JSON to restore",
      resetAll: "Reset all data",
      savedHashtags: "Saved hashtags",
      emptyHashtags: "No saved hashtags yet.",
      postTemplates: "Post templates",
      postAssistSettings: "Post assist",
      defaultTemplate: "Default template",
      defaultView: "Default view",
      weekStartsOn: "Week starts",
      defaultStartTime: "Default start",
      defaultDuration: "Default duration",
      defaultDurationShort: "Duration"
    },
    templateEditor: {
      name: "Template name",
      usageCategory: "Use",
      defaultPlatform: "Default platform",
      description: "Description",
      body: "Body",
      bodyWarning: "Long templates make preview and copy harder to review.",
      hashtags: "Hashtags",
      hashtagsWarning: "Too many tags make post assist and handoff harder to read.",
      hashtagsHelp: "Saved separately from the body and merged with event hashtags when copied.",
      save: "Save template",
      hashtagSetName: "Set name",
      hashtagSetNamePlaceholder: "Game stream",
      hashtagSetPlaceholder: "#GameStream #VTuber",
      hashtagSetHelp: "Save frequent combinations and add them to post previews when needed.",
      hashtagSetSave: "Save hashtag set"
    },
    messages: {
      saveFailure: "Could not save. Check browser storage availability.",
      importFailure: "Could not import the JSON. Check the format. Existing data was not changed.",
      restoreEvent: "Event restored.",
      invalidEndTime: "End time must be later than start time.",
      moved: "Event moved.",
      updated: "Event updated.",
      saved: "Event saved.",
      deleted: "Event deleted.",
      undo: "Undo",
      recurrenceSaved: (count: number) => `${count} repeated events created.`,
      editDiscarded: "Edits discarded.",
      createCanceled: "New event canceled.",
      settingsUpdated: "Settings updated.",
      templateSaved: "Template saved.",
      templateEditing: "Editing template.",
      templateDeleted: "Template deleted.",
      hashtagSaved: "Hashtag set saved.",
      hashtagEditing: "Editing hashtag set.",
      hashtagDeleted: "Hashtag set deleted.",
      backupCreated: "Backup JSON created. Store it somewhere safe.",
      backupRestored: "Backup JSON restored.",
      resetAll: "All data reset.",
      copied: "Post copied.",
      storageReadFailure: "Could not read saved data. Existing data is kept.",
      copyFailure: "Could not copy. Select the text below and copy it manually.",
      resetConfirm: "Reset all events, settings, post templates, and saved hashtags? This cannot be undone."
    },
    defaults: {
      templateName: "New template",
      templateDescription: "Custom template",
      templateBody: "[Announcement]\n{date} {startTime} - {endTime}\n{title}",
      hashtagSetName: "New hashtag set"
    }
  }
} as const;

export type ScheduleCalendarCopy = (typeof scheduleCalendarCopy)[Locale];

const builtInPostTemplateCopy: Record<Locale, Partial<Record<string, BuiltInTemplateCopy>>> = {
  ja: {},
  en: {
    "stream-notice": {
      name: "Stream announcement",
      description: "A short announcement for the stream day.",
      body: "[Stream schedule]\n{date} {startTime} - {endTime} / {platform}\n{title}\n\nDrop by if you can.",
      hashtags: "#VTuber #Stream"
    },
    reminder: {
      name: "Reminder",
      description: "A quick reminder before the stream starts.",
      body: "{title} starts soon at {startTime}.\nSee you on {platform}.",
      hashtags: "#VTuber"
    },
    "after-note": {
      name: "After-stream note",
      description: "Follow-up copy after a stream or post.",
      body: "Thanks for joining {title}.\nI will keep the next schedule organized here too.",
      hashtags: "#VTuber"
    },
    "youtube-description": {
      name: "YouTube description memo",
      description: "A date and note block to paste into a YouTube description.",
      body: "Scheduled stream: {date} {startTime} - {endTime}\nTitle: {title}\nCategory: {category}\n\n{memo}",
      hashtags: ""
    }
  }
};

export function getScheduleCalendarCopy(locale: Locale): ScheduleCalendarCopy {
  return scheduleCalendarCopy[locale] ?? scheduleCalendarCopy.ja;
}

export function getCalendarViewOptions(copy: ScheduleCalendarCopy): Array<OptionCopy<CalendarView>> {
  return [
    { value: "month", label: copy.views.month },
    { value: "week", label: copy.views.week },
    { value: "day", label: copy.views.day }
  ];
}

export function getWeekStartOptions(copy: ScheduleCalendarCopy): Array<OptionCopy<0 | 1>> {
  return [
    { value: 0, label: copy.weekStarts.sunday },
    { value: 1, label: copy.weekStarts.monday }
  ];
}

export function getDefaultDurationOptions(minutes: readonly number[], locale: Locale): Array<OptionCopy<number>> {
  return minutes.map((value) => ({ value, label: locale === "en" ? `${value} min` : `${value}分` }));
}

export function getLocalizedCategoryOptions(copy: ScheduleCalendarCopy): Array<OptionCopy<EventCategory>> {
  return (Object.keys(copy.categories) as EventCategory[]).map((value) => ({ value, label: copy.categories[value] }));
}

export function getEventCategoryFilterOptions(copy: ScheduleCalendarCopy): Array<OptionCopy<EventCategory | "all">> {
  return [
    { value: "all", label: copy.filters.allCategories },
    ...getLocalizedCategoryOptions(copy)
  ];
}

export function getAnnouncementStatusOptions(copy: ScheduleCalendarCopy): Array<OptionCopy<AnnouncementStatus>> {
  return (Object.keys(copy.announcementStatus) as AnnouncementStatus[]).map((value) => ({ value, label: copy.announcementStatus[value] }));
}

export function getAnnouncementStatusFilterOptions(copy: ScheduleCalendarCopy): Array<OptionCopy<AnnouncementStatus | "all">> {
  return [
    { value: "all", label: copy.filters.allAnnouncements },
    ...getAnnouncementStatusOptions(copy)
  ];
}

export function getRecurrenceOptions(copy: ScheduleCalendarCopy): Array<OptionCopy<EventRecurrence>> {
  return (Object.keys(copy.recurrence) as EventRecurrence[]).map((value) => ({ value, label: copy.recurrence[value] }));
}

export function getPostTemplateUsageOptions(copy: ScheduleCalendarCopy): Array<OptionCopy<PostTemplateUsageCategory>> {
  return (Object.keys(copy.templateUsage) as PostTemplateUsageCategory[]).map((value) => ({ value, label: copy.templateUsage[value] }));
}

export function getEventPeriodOptions(copy: ScheduleCalendarCopy): Array<OptionCopy<"all" | "today" | "week" | "month">> {
  return [
    { value: "all", label: copy.filters.allPeriods },
    { value: "today", label: copy.filters.todayOnward },
    { value: "week", label: copy.filters.withinWeek },
    { value: "month", label: copy.filters.withinMonth }
  ];
}

export function getEventSortOptions(copy: ScheduleCalendarCopy): Array<OptionCopy<"upcoming" | "dateAsc" | "dateDesc">> {
  return [
    { value: "upcoming", label: copy.filters.upcoming },
    { value: "dateAsc", label: copy.filters.dateAsc },
    { value: "dateDesc", label: copy.filters.dateDesc }
  ];
}

export function getLocalizedPostTemplates(templates: PostTemplate[], locale: Locale): PostTemplate[] {
  const localizedTemplates = builtInPostTemplateCopy[locale];

  return templates.map((template) => ({
    ...template,
    ...(localizedTemplates[template.id] ?? {})
  }));
}
