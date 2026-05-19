import type { Locale } from "@/lib/locale";
import type {
  ThumbnailPreset,
  ThumbnailPresetCategory,
  ThumbnailPresetFilter,
  ThumbnailPresetId,
  ThumbnailPresetVariantId,
  ThumbnailQualityGuardItem,
  ThumbnailQualityGuardSummary
} from "@/lib/thumbnail-editor";

type ThumbnailPresetCopy = {
  name: string;
  description: string;
};

export const thumbnailEditorCopy = {
  ja: {
    header: {
      category: "画像・デザイン",
      title: "Thumbnail Editor",
      preset: "プリセット",
      canvasSize: "キャンバスサイズ",
      outputRatio: "出力比率",
      newDraft: "新規",
      saveDraft: "下書き",
      sendToSns: "SNS分割へ",
      export: "出力",
      newDraftAria: "新規キャンバスを作成",
      saveDraftAria: "下書きを保存",
      sendToSnsAria: "SNS分割画像メーカーで使う",
      exportAria: "サムネイルを書き出し",
      openOptions: (value: string) => `${value} の選択肢を開く`
    },
    canvas: {
      defaultGuide: "プリセットを選んで、文字と立ち絵を差し替えてから書き出す",
      handoffGuide: "予定テキストはプリセット変更後も見出し、時刻、サブ、ラベルへ引き継ぎます。",
      showPanel: "パネル表示",
      hidePanel: "パネル非表示",
      undo: "元に戻す",
      redo: "やり直す",
      guide: "ガイド",
      showGuide: "中央ガイドを表示",
      hideGuide: "中央ガイドを非表示",
      zoomOut: "縮小",
      zoomReset: "100%に戻す",
      zoomIn: "拡大",
      zoomFit: "合わせる",
      zoomOutAria: "キャンバスを縮小",
      zoomResetAria: "表示倍率を100%に戻す",
      zoomInAria: "キャンバスを拡大",
      zoomFitAria: "キャンバスを画面に合わせる",
      fullPreview: "全体",
      fullPreviewAria: "サムネイル全体を確認",
      canvasAria: "サムネイル編集キャンバス",
      panMode: "表示移動中",
      previewTitle: "全体確認",
      previewClose: "閉じる",
      previewNote: "確認専用です。編集に戻るには閉じるを押してください。",
      selectLayerEmpty: "編集するレイヤーを選択してください。"
    },
    mobilePanels: {
      canvas: "キャンバス",
      materials: "素材",
      layers: "レイヤー",
      text: "編集",
      export: "書き出し"
    },
    quickAdd: {
      text: "T テキスト",
      rect: "▭ 矩形",
      circle: "○ 円",
      image: "▧ 画像",
      material: "◇ 素材",
      textAria: "テキストレイヤーを追加",
      rectAria: "矩形レイヤーを追加",
      circleAria: "円レイヤーを追加",
      imageAria: "画像レイヤーを追加",
      materialAria: "素材ライブラリを開く"
    },
    tools: {
      edit: "編集",
      pan: "表示移動",
      select: "選択",
      text: "テキスト",
      shape: "図形",
      image: "画像",
      material: "素材",
      zoom: "ズーム"
    },
    panels: {
      presets: {
        title: "プリセット一覧",
        normalGuide: "検索、カテゴリ、用途ラベルで絞り込みできます。",
        handoffGuide: "予定から作る時は、通常告知、プライバシー告知、ホワイトボードをまず比べると選びやすいです。",
        handoffNotice: "予定タイトル、日付、時刻、告知文はプリセット適用後も同名レイヤーへ入ります。迷ったら通常告知、内容を伏せたい時はプライバシー告知、流れを整理したい時はホワイトボードを選んでください。",
        search: "検索",
        searchPlaceholder: "プリセット名・カテゴリ・用途・説明",
        clear: "条件クリア",
        category: "カテゴリ",
        usage: "用途ラベル",
        all: "すべて",
        favorites: "お気に入り",
        recent: "最近使った",
        usePreset: "このプリセットを使用",
        empty: "条件に一致するプリセットがありません。",
        countUnit: "種"
      },
      materials: {
        title: "登録済み素材",
        guide: "素材はプリセットに後から足す飾りです。選ぶとレイヤーへ追加されます。",
        search: "素材名・説明・推奨配置で検索",
        all: "すべて",
        itemUnit: "点",
        allPrefix: "全",
        empty: "条件に合う素材はありません。"
      },
      userMaterials: {
        title: "ユーザー素材",
        guide: "追加した画像はこのブラウザに保存され、下書きには参照だけを残します。",
        limitGuide: "最大24件 / 1点8MB / 合計48MB。",
        recoveryGuide: "要再追加の素材は置換で復旧できます。不要な素材は削除してください。",
        upload: "画像を追加",
        needsReadd: "要再追加",
        place: "配置",
        replace: "置換",
        delete: "削除",
        empty: "追加済みのユーザー素材はありません。"
      },
      layers: {
        title: "レイヤー一覧",
        guide: "上が前面 / 選択して編集",
        weeklyGroupPrefix: "週間予定レイヤー"
      },
      property: {
        textTitle: "テキスト設定",
        shapeTitle: "図形設定",
        imageTitle: "画像設定",
        textGuide: "選択中の文字を差し替えて、必要なら縁取りや影を調整します。",
        imageGuide: "立ち絵画像を追加・差し替えて、配置だけを整えます。",
        layerName: "レイヤー名",
        textFallback: "テキスト",
        shapeFallback: "図形",
        imageFallback: "画像"
      },
      quality: {
        title: "サムネ品質",
        note: "確認のみ"
      }
    },
    export: {
      title: "保存 / 書き出し",
      guide: "文字と立ち絵を確認して書き出す",
      saveDraft: "下書き保存",
      sendToSns: "SNS分割画像へ進む",
      export: "書き出し",
      preflight: "書き出し前の確認",
      assetNoticeTitle: "内蔵素材について",
      assetNotice: "内蔵プリセットの背景・装飾素材には、当方で生成・加工した抽象素材を含みます。特定の人物、作家、既存作品、キャラクター素材を読み込ませて改変したものではありません。",
      storageNote: "下書きはこのブラウザに保存されます。PNG/JPEG は表示中キャンバスを1枚で出力し、SNS分割画像メーカーへ進む時だけ一時画像を保存します。"
    },
    presetDialog: {
      eyebrow: "プリセット適用の確認",
      fromTo: (current: string, target: string) => `${current} から ${target} へ変更`,
      body: "プリセット適用で現在のレイヤー構成は置き換わります。画像、図形、自由追加レイヤーの高度なマージは今回行いません。",
      handoff: "Schedule Calendar 由来の予定テキストを優先し、新しいプリセットの見出し、時刻、サブ、ラベルへ入れ直します。細かい予定を見せすぎたくない時はプライバシー告知、流れを説明したい時はホワイトボードが使いやすいです。",
      current: "現在",
      targetDefault: "新プリセット初期値",
      unset: "未設定",
      cancel: "キャンセル",
      applyPlain: "プリセットをそのまま適用",
      applyHandoff: "予定テキストで適用",
      applyCarryover: "主要テキストを引き継いで適用"
    },
    toasts: {
      handoffApplied: "Schedule Calendarの予定を反映しました。用途に合わせてプリセットを選べます。",
      restored: "前回の下書きを復元しました。",
      brokenDraft: "破損した下書きを初期化しました。必要に応じて保存し直してください。",
      applyHandoff: "予定テキストを新しいプリセットへ自然に入れ直しました。",
      applyCarryover: "プリセットへ主要テキストを引き継ぎました。",
      applyPlain: "プリセットを適用しました。",
      resizeHandoff: (label: string) => `${label} に予定テキストを引き継ぎました。`,
      resizeCarryover: (label: string) => `${label} に主要テキストを引き継ぎました。`,
      saveDraft: "下書きを保存しました。",
      newDraft: "新規キャンバスを作成しました。",
      exportDone: (format: string) => `${format}を書き出しました。`,
      sendToSnsError: "SNS分割画像メーカーへの受け渡しに失敗しました。時間を置いてもう一度試してください。"
    }
  },
  en: {
    header: {
      category: "Image & Design",
      title: "Thumbnail Editor",
      preset: "Preset",
      canvasSize: "Canvas size",
      outputRatio: "Output ratio",
      newDraft: "New",
      saveDraft: "Draft",
      sendToSns: "To SNS split",
      export: "Export",
      newDraftAria: "Create new canvas",
      saveDraftAria: "Save draft",
      sendToSnsAria: "Use in SNS Split Image Maker",
      exportAria: "Export thumbnail",
      openOptions: (value: string) => `Open ${value} options`
    },
    canvas: {
      defaultGuide: "Choose a preset, replace text and standee images, then export.",
      handoffGuide: "Schedule text carries into headline, time, sub, and label layers after preset changes.",
      showPanel: "Show panel",
      hidePanel: "Hide panel",
      undo: "Undo",
      redo: "Redo",
      guide: "Guide",
      showGuide: "Show center guide",
      hideGuide: "Hide center guide",
      zoomOut: "Zoom out",
      zoomReset: "Reset to 100%",
      zoomIn: "Zoom in",
      zoomFit: "Fit",
      zoomOutAria: "Zoom canvas out",
      zoomResetAria: "Reset zoom to 100%",
      zoomInAria: "Zoom canvas in",
      zoomFitAria: "Fit canvas to view",
      fullPreview: "Full view",
      fullPreviewAria: "Open full thumbnail preview",
      canvasAria: "Thumbnail editing canvas",
      panMode: "Pan mode",
      previewTitle: "Full preview",
      previewClose: "Close",
      previewNote: "Preview only. Close this view to return to editing.",
      selectLayerEmpty: "Select a layer to edit."
    },
    mobilePanels: {
      canvas: "Canvas",
      materials: "Assets",
      layers: "Layers",
      text: "Edit",
      export: "Export"
    },
    quickAdd: {
      text: "T Text",
      rect: "▭ Rect",
      circle: "○ Circle",
      image: "▧ Image",
      material: "◇ Asset",
      textAria: "Add text layer",
      rectAria: "Add rectangle layer",
      circleAria: "Add circle layer",
      imageAria: "Add image layer",
      materialAria: "Open asset library"
    },
    tools: {
      edit: "Edit",
      pan: "Pan",
      select: "Select",
      text: "Text",
      shape: "Shape",
      image: "Image",
      material: "Asset",
      zoom: "Zoom"
    },
    panels: {
      presets: {
        title: "Presets",
        normalGuide: "Filter by search, category, or use label.",
        handoffGuide: "For schedule-based images, compare Stream Announcement, Privacy Notice, and Whiteboard first.",
        handoffNotice: "Schedule title, date, time, and announcement copy carry into matching layers after applying a preset. Use Stream Announcement for normal posts, Privacy Notice to hide details, or Whiteboard to explain the flow.",
        search: "Search",
        searchPlaceholder: "Preset name, category, use, or description",
        clear: "Clear filters",
        category: "Category",
        usage: "Use label",
        all: "All",
        favorites: "Favorites",
        recent: "Recent",
        usePreset: "Use this preset",
        empty: "No presets match these filters.",
        countUnit: "presets"
      },
      materials: {
        title: "Built-in assets",
        guide: "Add these decorative assets to the current preset as layers.",
        search: "Search asset name, note, or placement",
        all: "All",
        itemUnit: "items",
        allPrefix: "All ",
        empty: "No assets match these filters."
      },
      userMaterials: {
        title: "User assets",
        guide: "Added images are saved in this browser; drafts keep references only.",
        limitGuide: "Up to 24 items / 8MB each / 48MB total.",
        recoveryGuide: "Replace missing assets to recover them, or delete assets you no longer need.",
        upload: "Add image",
        needsReadd: "Needs re-add",
        place: "Place",
        replace: "Replace",
        delete: "Delete",
        empty: "No user assets added yet."
      },
      layers: {
        title: "Layers",
        guide: "Top is front / select to edit",
        weeklyGroupPrefix: "Weekly schedule layers"
      },
      property: {
        textTitle: "Text settings",
        shapeTitle: "Shape settings",
        imageTitle: "Image settings",
        textGuide: "Replace the selected text, then adjust outline or shadow if needed.",
        imageGuide: "Add or replace a standee image, then tune placement only.",
        layerName: "Layer name",
        textFallback: "Text",
        shapeFallback: "Shape",
        imageFallback: "Image"
      },
      quality: {
        title: "Thumbnail quality",
        note: "Check only"
      }
    },
    export: {
      title: "Save / Export",
      guide: "Check text and standee images before export.",
      saveDraft: "Save draft",
      sendToSns: "Continue to SNS Split Image Maker",
      export: "Export",
      preflight: "Pre-export check",
      assetNoticeTitle: "About built-in assets",
      assetNotice: "Built-in preset backgrounds and decorations include abstract assets generated or edited by us. They are not made by modifying a specific person, artist, existing work, or character asset.",
      storageNote: "Drafts are saved in this browser. PNG/JPEG exports the current canvas as one image; a temporary image is saved only when continuing to SNS Split Image Maker."
    },
    presetDialog: {
      eyebrow: "Confirm preset change",
      fromTo: (current: string, target: string) => `Change from ${current} to ${target}`,
      body: "Applying a preset replaces the current layer structure. Advanced merging for images, shapes, and custom layers is not included in this pass.",
      handoff: "Schedule Calendar text is prioritized and inserted into headline, time, sub, and label layers in the new preset. Use Privacy Notice when you want to hide details, or Whiteboard when you want to explain the flow.",
      current: "Current",
      targetDefault: "New preset default",
      unset: "Not set",
      cancel: "Cancel",
      applyPlain: "Apply preset as-is",
      applyHandoff: "Apply with schedule text",
      applyCarryover: "Apply with main text"
    },
    toasts: {
      handoffApplied: "Schedule Calendar text was applied. Choose a preset that fits the use case.",
      restored: "Previous draft restored.",
      brokenDraft: "Broken draft reset. Save again if needed.",
      applyHandoff: "Schedule text was fitted into the new preset.",
      applyCarryover: "Main text carried into the preset.",
      applyPlain: "Preset applied.",
      resizeHandoff: (label: string) => `Schedule text carried into ${label}.`,
      resizeCarryover: (label: string) => `Main text carried into ${label}.`,
      saveDraft: "Draft saved.",
      newDraft: "New canvas created.",
      exportDone: (format: string) => `${format} exported.`,
      sendToSnsError: "Could not hand off to SNS Split Image Maker. Try again later."
    }
  }
} as const;

const thumbnailPresetVariantCopy: Record<
  Locale,
  Partial<Record<ThumbnailPresetVariantId, { label: string; intendedUse: string; disabledSuffix: string }>>
> = {
  ja: {
    "landscape-16-9": { label: "横長 16:9", intendedUse: "YouTube配信サムネ / 通常告知", disabledSuffix: "" },
    "portrait-9-16": { label: "縦長 9:16", intendedUse: "Shorts / 縦長告知の設計候補", disabledSuffix: "。公開前版ではまだ選択できません。" },
    "square-1-1": { label: "正方形 1:1", intendedUse: "SNS投稿 / 正方形告知の設計候補", disabledSuffix: "。公開前版ではまだ選択できません。" }
  },
  en: {
    "landscape-16-9": { label: "Landscape 16:9", intendedUse: "YouTube stream thumbnail / standard announcement", disabledSuffix: "" },
    "portrait-9-16": { label: "Portrait 9:16", intendedUse: "Candidate layout for Shorts / vertical announcements", disabledSuffix: ". Not selectable in this preview." },
    "square-1-1": { label: "Square 1:1", intendedUse: "Candidate layout for SNS posts / square announcements", disabledSuffix: ". Not selectable in this preview." }
  }
};

const thumbnailPresetCopy: Record<Locale, Partial<Record<ThumbnailPresetId, ThumbnailPresetCopy>>> = {
  ja: {
    stream_announce: { name: "配信告知", description: "開始時刻と見出しを大きく見せる告知向け。" },
    first_stream: { name: "初配信", description: "初回配信や自己紹介に使いやすい明るい歓迎向け。" },
    anniversary_stream: { name: "記念配信", description: "周年や登録者記念を上品に見せる premium milestone 向け。" },
    endurance_stream: { name: "耐久配信", description: "長時間企画や達成目標を強く見せる challenge / progress 向け。" },
    project_stream: { name: "企画配信", description: "特別企画や視聴者参加型の内容を明るく整理して見せる variety show 向け。" },
    cover_song_notice: { name: "歌ってみた告知", description: "cover MV や歌ってみた公開を premiere 感のある構成で見せる release 告知向け。" },
    event_notice: { name: "イベント告知", description: "日付、参加情報、key visual 枠を整理して見せる event flyer 向け。" },
    privacy_notice: { name: "プライバシー告知", description: "予定テキストを活かしつつ、細かい内容を出しすぎない事前告知向け。" },
    whiteboard_plan: { name: "ホワイトボード", description: "企画内容や配信の流れを、白板風に軽く整理して見せる告知向け。" },
    karaoke: { name: "歌枠", description: "音楽配信に合う強いコントラスト。" },
    chatting: { name: "雑談", description: "トーク配信・近況報告に使いやすい余白設計。" },
    clip: { name: "切り抜き", description: "短い強調語と勢いを出す切り抜き向け。" },
    game_live: { name: "ゲーム実況", description: "ゲームタイトルと配信時刻を分けて見せる実況向け。" },
    collaboration: { name: "コラボ", description: "参加者名や企画名を載せやすいコラボ配信用。" },
    announcement: { name: "お知らせ", description: "配信以外の案内や大事なお知らせを読みやすく整理。" },
    weekly_schedule: { name: "週間予定", description: "今週の予定や配信枠を一覧風に見せる横長画像。" },
    x_announcement: { name: "X告知画像", description: "X投稿に添える短文告知画像。本文の1行目を活かしやすい。" }
  },
  en: {
    stream_announce: { name: "Stream Announcement", description: "A large start time and headline for stream announcements." },
    first_stream: { name: "First Stream", description: "A bright welcome layout for first streams and introductions." },
    anniversary_stream: { name: "Anniversary Stream", description: "A polished milestone layout for anniversaries and subscriber goals." },
    endurance_stream: { name: "Endurance Stream", description: "A challenge layout that emphasizes long streams and goal progress." },
    project_stream: { name: "Project Stream", description: "A clear variety-show layout for special plans and viewer participation." },
    cover_song_notice: { name: "Cover Song Notice", description: "A release-style layout for cover MV or song upload announcements." },
    event_notice: { name: "Event Notice", description: "An event flyer layout for dates, participation notes, and key visuals." },
    privacy_notice: { name: "Privacy Notice", description: "A pre-announcement layout that keeps schedule details from showing too much." },
    whiteboard_plan: { name: "Whiteboard Plan", description: "A whiteboard-style layout for lightly organizing a stream plan or flow." },
    karaoke: { name: "Karaoke", description: "Strong contrast for music streams." },
    chatting: { name: "Chatting", description: "A relaxed layout for talk streams and updates." },
    clip: { name: "Clip", description: "A punchy layout for short highlight or clip announcements." },
    game_live: { name: "Game Stream", description: "A game-stream layout that separates title and stream time clearly." },
    collaboration: { name: "Collab", description: "A collab layout with room for participants and the project name." },
    announcement: { name: "Notice", description: "A readable layout for important non-stream announcements." },
    weekly_schedule: { name: "Weekly Schedule", description: "A wide schedule image for this week's streams and activities." },
    x_announcement: { name: "X Post Image", description: "A short announcement image for X posts that can use the first body line." }
  }
};

const categoryLabels = {
  ja: {
    告知画像: "告知画像",
    配信ジャンル: "配信ジャンル",
    スケジュール: "スケジュール"
  },
  en: {
    告知画像: "Announcement Image",
    配信ジャンル: "Stream Genre",
    スケジュール: "Schedule"
  }
} as const satisfies Record<Locale, Record<ThumbnailPresetCategory, string>>;

const usageLabels = {
  ja: {},
  en: {
    通常告知: "Standard announcement",
    "初回 / 自己紹介": "First stream / intro",
    "記念 / milestone": "Milestone",
    "耐久 / 目標": "Endurance / goal",
    "企画 / 視聴者参加": "Project / viewer participation",
    "動画公開 / cover": "Video release / cover",
    "イベント / 参加情報": "Event / participation",
    "予定 / 非公開情報配慮": "Schedule / privacy",
    "予定 / 説明整理": "Schedule / explanation",
    音楽配信: "Singing stream",
    トーク: "Talk",
    動画告知: "Video notice",
    "実況・参加型": "Gameplay / participation",
    "2人以上": "Two or more",
    重要告知: "Important notice",
    週まとめ: "Weekly roundup",
    投稿添付: "Post attachment"
  }
} as const satisfies Record<Locale, Partial<Record<string, string>>>;

const qualityGuardMessageCopy: Record<Locale, Partial<Record<string, string>>> = {
  ja: {},
  en: {
    "selected-layer-safe-area": "Check safe area",
    "overall-safe-area": "Check safe area",
    "selected-text-size": "Text may be small",
    "overall-text-size": "Text may be small",
    "selected-text-contrast": "Add outline or shadow",
    "overall-text-contrast": "Add outline or shadow",
    "selected-text-readability": "Check line breaks",
    "overall-text-readability": "Check line breaks",
    "selected-text-opacity": "Check text opacity",
    "overall-text-opacity": "Check text opacity",
    "selected-image-unresolved": "Re-add missing image",
    "overall-image-unresolved": "Re-add missing image",
    "selected-image-crop": "Check crop",
    "overall-image-crop": "Check crop",
    "overall-hidden-layers": "Hidden layers exist",
    "overall-locked-layers": "Locked layers exist",
    "thumbnail-quality-ok": "Quality check OK"
  }
};

export function getThumbnailEditorCopy(locale: Locale) {
  return thumbnailEditorCopy[locale] ?? thumbnailEditorCopy.ja;
}

export function getThumbnailPresetName(presetId: string, locale: Locale, fallback = presetId): string {
  return thumbnailPresetCopy[locale][presetId as ThumbnailPresetId]?.name ?? fallback;
}

export function getThumbnailPresetDescription(preset: ThumbnailPreset, locale: Locale): string {
  return thumbnailPresetCopy[locale][preset.id as ThumbnailPresetId]?.description ?? preset.description;
}

export function getThumbnailPresetCategoryLabel(category: ThumbnailPresetCategory, locale: Locale): string {
  return categoryLabels[locale][category] ?? categoryLabels.ja[category];
}

export function getThumbnailPresetUsageLabel(usageLabel: string, locale: Locale): string {
  const localizedUsageLabels: Partial<Record<string, string>> = usageLabels[locale];
  return localizedUsageLabels[usageLabel] ?? usageLabel;
}

export function getThumbnailPresetVariantLabel(variantId: ThumbnailPresetVariantId, locale: Locale, fallback: string): string {
  return thumbnailPresetVariantCopy[locale][variantId]?.label ?? fallback;
}

export function getThumbnailPresetVariantDescription(
  variantId: ThumbnailPresetVariantId,
  locale: Locale,
  fallback: string,
  isDisabled: boolean
): string {
  const variantCopy = thumbnailPresetVariantCopy[locale][variantId];
  if (!variantCopy) {
    return fallback;
  }

  return isDisabled ? `${variantCopy.intendedUse}${variantCopy.disabledSuffix}` : variantCopy.intendedUse;
}

export function filterLocalizedThumbnailPresets(
  presets: ThumbnailPreset[],
  filter: ThumbnailPresetFilter,
  locale: Locale
): ThumbnailPreset[] {
  const query = filter.query.trim().toLowerCase();

  return presets.filter((preset) => {
    if (filter.category !== "all" && preset.category !== filter.category) {
      return false;
    }
    if (filter.usageLabel !== "all" && preset.usageLabel !== filter.usageLabel) {
      return false;
    }
    if (!query) {
      return true;
    }

    return [
      preset.name,
      preset.category,
      preset.usageLabel,
      preset.description,
      getThumbnailPresetName(preset.id, locale, preset.name),
      getThumbnailPresetCategoryLabel(preset.category, locale),
      getThumbnailPresetUsageLabel(preset.usageLabel, locale),
      getThumbnailPresetDescription(preset, locale)
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

export function getLocalizedThumbnailQualityGuardItems(
  items: ThumbnailQualityGuardItem[],
  locale: Locale
): ThumbnailQualityGuardItem[] {
  return items.map((item) => ({
    ...item,
    message: qualityGuardMessageCopy[locale][item.id] ?? item.message
  }));
}

export function getLocalizedThumbnailQualityGuardSummary(
  summary: ThumbnailQualityGuardSummary,
  localizedItems: ThumbnailQualityGuardItem[],
  locale: Locale
): ThumbnailQualityGuardSummary {
  if (locale === "ja") {
    return summary;
  }

  const activeItems = localizedItems.filter((item) => item.tone !== "ok");
  if (activeItems.length === 0) {
    return { tone: "ok", label: "Quality check OK", messages: ["Ready to export"] };
  }

  return {
    tone: activeItems.some((item) => item.tone === "warning") ? "warning" : "hint",
    label: `${activeItems.length} checks`,
    messages: activeItems.slice(0, 2).map((item) => item.message)
  };
}
