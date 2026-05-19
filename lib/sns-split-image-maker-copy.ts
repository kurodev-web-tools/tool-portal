import type { Locale } from "@/lib/locale";
import type { SnsSplitJoinType, SnsSplitMode, SnsSplitPreset } from "@/lib/sns-split-image-maker";

type SnsSplitPresetCard = {
  id: SnsSplitPreset;
  title: string;
  status: string;
  description: string;
  details: string[];
  available: boolean;
};

export const snsSplitImageMakerCopy = {
  ja: {
    header: {
      category: "画像・デザイン",
      title: "SNS分割画像メーカー",
      description: "投稿構成に合わせてプリセットを選択します。2分割 / 3分割 / 4分割の編集と書き出しに対応しています。",
      openStoredDraft: "前回の作業を開く",
      changePreset: "プリセットを変更",
      help: "? 使い方",
      saveDraft: "下書き保存",
      saveImages: "画像を保存"
    },
    common: {
      available: "利用可能",
      openEditor: "編集画面を開く",
      unavailable: "まだ編集できません",
      save: "保存",
      preview: "プレビュー",
      edit: "編集"
    },
    controls: {
      addMode: "追加方式",
      joinType: "連結タイプ",
      finalRatio: "最終比率",
      outputOrder: "出力順",
      showSeam: "枠線を表示",
      showGrid: "グリッドを表示"
    },
    preview: {
      title: "プレビュー",
      description: "編集、投稿順、完成形を切り替えて確認します。",
      edit: "編集",
      grid: "投稿順",
      post: "完成形",
      postButton: (index: number) => `投稿${index}`,
      empty: "メイン画像を選ぶと、投稿順プレビューとPNG/JPEG保存が有効になります。",
      editGuide: (index: number) => `投稿${index}を編集中です。投稿別調整はドラッグまたはスライダーで行います。中心線に近づくと吸着します。`,
      gridGuide: "投稿順プレビューです。split_1から保存順に確認できます。",
      finalGuide: "完成形プレビューです。メイン分割を1枚の画像として確認し、気になる投稿を選んで調整できます。",
      guideNote: "枠線は目安です。実際の投稿画像には含まれません。境界を動かすときは枠線を表示したまま確認してください。"
    },
    handoff: {
      thumbnailReceived: "Thumbnail Editorから画像を受け取りました。",
      thumbnailMissing: "Thumbnail Editorからの画像が見つからなかったため、メイン画像は未選択のまま開始しました。",
      scheduleReceived: "Schedule Calendarから告知文メモを受け取りました。",
      thumbnailNext: "受け取った画像をメイン画像として確認し、必要なら追加画像を入れてから保存します。",
      thumbnailMissingNext: "メイン画像を選び直してから、受け取った告知文メモを投稿文へ使えます。",
      scheduleNext: "メイン画像は未選択です。画像を選んでから、告知文メモを投稿文へ使えます。",
      copy: "告知文コピー"
    },
    input: {
      title: "入力エリア",
      mainImage: "分割用メイン画像（1枚）",
      selectImage: "画像を選択",
      dragDrop: "またはドラッグ&ドロップ",
      removeImage: "画像を外す",
      recommendation: "推奨: 16:9（例: 1920x1080）。解像度違いは自動で拡大縮小します。",
      additionalSlots: "追加画像スロット",
      cropNote: "異なる比率の画像は中央基準でトリミングされます。",
      localNote: "画像処理と復元用保存はブラウザ内で完結し、外部へ送信しません。"
    },
    settings: {
      title: "分割・合成設定",
      selectedPost: (index: number) => `投稿${index}の中央メイン調整`,
      postX: "投稿別 X",
      postY: "投稿別 Y",
      postScale: "投稿別 拡大率",
      resetPost: (index: number) => `投稿${index}リセット`,
      base: "基本分割調整",
      open: "開く",
      splitY: "メイン分割 縦位置（splitY）",
      splitX: "メイン分割 横位置（splitX）",
      seamFix: "シーム補正",
      seamWidth: "境界線の太さ",
      offsetX: "Xオフセット",
      offsetY: "Yオフセット",
      scale: "全体スケール",
      color: "色",
      resetAll: "全体リセット"
    },
    export: {
      title: "エクスポート設定",
      format: "出力形式",
      quality: "画質",
      filePattern: "ファイル名の形式",
      deferredNote: "PNG/JPEGはどちらか1形式を選び、ZIPや複数形式の一括出力は後続候補です。",
      singleFormat: "選択中の形式で個別ファイル保存します。",
      status: (baseReady: boolean, slotReady: number, requiredSlots: number) => `メイン画像: ${baseReady ? "選択済み" : "未選択"} / 追加画像: ${slotReady}/${requiredSlots}`,
      note: (postCount: number, orderLabel: string) => `出力はブラウザのダウンロードとして${postCount}枚を保存します。順番は ${orderLabel} です。`
    },
    toasts: {
      restoredInvalid: "保存データを復元できなかったため初期状態で開始しました。",
      restoredBroken: "保存データが破損していたため安全に初期化しました。",
      imageRestoreFailed: "設定は復元しましたが、画像の復元に失敗しました。",
      restored: "前回の作業状態を復元しました。",
      settingsSaveFailed: "設定の自動保存に失敗しました。画像は編集中の画面上では維持されています。",
      copied: "告知文をコピーしました。",
      copyFailed: "コピーできませんでした。告知文メモから手動でコピーしてください。",
      modeSwitched: (label: string) => `${label}に切り替えました。`,
      imageStoreFailed: "画像の復元用保存に失敗しました。現在の編集画面ではそのまま利用できます。",
      mainLoaded: "メイン画像を読み込みました。",
      slotLoaded: "追加画像を読み込みました。",
      resetConfig: "分割・合成設定をリセットしました。",
      resetPost: (index: number) => `投稿${index}の表示位置をリセットしました。`,
      draftSaved: "作業状態を保存しました。",
      exportNeedsMain: "メイン画像を選択してから出力してください。",
      exportDone: (orderLabel: string, postCount: number) => `${orderLabel} の順で${postCount}枚を書き出しました。`,
      exportFailed: "画像の書き出しに失敗しました。"
    },
    messages: {
      previewFailed: "プレビュー生成に失敗しました。",
      imageReadFailed: "画像を読み込めませんでした。",
      saveWorkFailed: "作業状態の保存に失敗しました。",
      untitledEvent: "無題の予定"
    },
    aria: {
      handoffAnnouncementMemo: (source: "thumbnail" | "schedule") =>
        source === "thumbnail" ? "Thumbnail Editorから受け取った告知文メモ" : "Schedule Calendarから受け取った告知文メモ",
      editPreview: (index: number) => `投稿${index}の編集プレビュー`,
      orderPreview: (count: number) => `${count}枚投稿の並び確認`,
      imageMainPreview: (index: number) => `画像${index}のメイン分割プレビュー`,
      postMainPreview: (index: number) => `投稿${index}のメイン分割プレビュー`,
      mobileActions: "モバイル操作",
      closeNotification: "通知を閉じる"
    }
  },
  en: {
    header: {
      category: "Image & Design",
      title: "SNS Split Image Maker",
      description: "Choose a preset for your post layout. You can edit and export 2-, 3-, and 4-split images.",
      openStoredDraft: "Open previous work",
      changePreset: "Change preset",
      help: "? Help",
      saveDraft: "Save draft",
      saveImages: "Save images"
    },
    common: {
      available: "Available",
      openEditor: "Open editor",
      unavailable: "Not editable yet",
      save: "Save",
      preview: "Preview",
      edit: "Edit"
    },
    controls: {
      addMode: "Add mode",
      joinType: "Join type",
      finalRatio: "Final ratio",
      outputOrder: "Output order",
      showSeam: "Show guides",
      showGrid: "Show grid"
    },
    preview: {
      title: "Preview",
      description: "Switch between edit, posting order, and final views.",
      edit: "Edit",
      grid: "Order",
      post: "Final",
      postButton: (index: number) => `Post ${index}`,
      empty: "Select a main image to enable posting-order preview and PNG/JPEG export.",
      editGuide: (index: number) => `Editing post ${index}. Adjust per-post position by dragging or using sliders. It snaps near the center line.`,
      gridGuide: "Posting-order preview. Check from split_1 in save order.",
      finalGuide: "Final preview. Review the main split as one image, then pick a post to adjust.",
      guideNote: "Guides are for preview only and are not included in exported images. Keep guides visible while moving boundaries."
    },
    handoff: {
      thumbnailReceived: "Image received from Thumbnail Editor.",
      thumbnailMissing: "The image from Thumbnail Editor was not found, so the main image starts empty.",
      scheduleReceived: "Announcement memo received from Schedule Calendar.",
      thumbnailNext: "Review the received image as the main image, add extra images if needed, then save.",
      thumbnailMissingNext: "Choose the main image again, then use the received announcement memo for your post.",
      scheduleNext: "No main image is selected yet. Choose an image, then use the announcement memo for your post.",
      copy: "Copy announcement"
    },
    input: {
      title: "Input area",
      mainImage: "Main split image (1)",
      selectImage: "Select image",
      dragDrop: "or drag and drop",
      removeImage: "Remove image",
      recommendation: "Recommended: 16:9, such as 1920x1080. Other resolutions are scaled automatically.",
      additionalSlots: "Additional image slots",
      cropNote: "Images with different ratios are center-cropped.",
      localNote: "Image processing and restore data stay in this browser and are not sent externally."
    },
    settings: {
      title: "Split / composite settings",
      selectedPost: (index: number) => `Center-main adjustment for post ${index}`,
      postX: "Post X",
      postY: "Post Y",
      postScale: "Post scale",
      resetPost: (index: number) => `Reset post ${index}`,
      base: "Base split adjustment",
      open: "Open",
      splitY: "Main split Y (splitY)",
      splitX: "Main split X (splitX)",
      seamFix: "Seam fix",
      seamWidth: "Guide width",
      offsetX: "X offset",
      offsetY: "Y offset",
      scale: "Overall scale",
      color: "Color",
      resetAll: "Reset all"
    },
    export: {
      title: "Export settings",
      format: "Format",
      quality: "Quality",
      filePattern: "File name pattern",
      deferredNote: "Choose either PNG or JPEG. ZIP and multi-format batch export are later candidates.",
      singleFormat: "Saves individual files in the selected format.",
      status: (baseReady: boolean, slotReady: number, requiredSlots: number) => `Main image: ${baseReady ? "selected" : "not selected"} / extra images: ${slotReady}/${requiredSlots}`,
      note: (postCount: number, orderLabel: string) => `Exports ${postCount} files as browser downloads. Order: ${orderLabel}.`
    },
    toasts: {
      restoredInvalid: "Stored data could not be restored, so the editor started from defaults.",
      restoredBroken: "Broken stored data was safely reset.",
      imageRestoreFailed: "Settings were restored, but image restore failed.",
      restored: "Previous work restored.",
      settingsSaveFailed: "Autosave for settings failed. Images remain available in the current editor view.",
      copied: "Announcement copied.",
      copyFailed: "Could not copy. Copy manually from the announcement memo.",
      modeSwitched: (label: string) => `Switched to ${label}.`,
      imageStoreFailed: "Could not save image restore data. You can keep using it in the current editor view.",
      mainLoaded: "Main image loaded.",
      slotLoaded: "Additional image loaded.",
      resetConfig: "Split / composite settings reset.",
      resetPost: (index: number) => `Post ${index} position reset.`,
      draftSaved: "Work saved.",
      exportNeedsMain: "Select a main image before exporting.",
      exportDone: (orderLabel: string, postCount: number) => `Exported ${postCount} files in ${orderLabel} order.`,
      exportFailed: "Image export failed."
    },
    messages: {
      previewFailed: "Could not generate preview.",
      imageReadFailed: "Could not read the image.",
      saveWorkFailed: "Could not save the work state.",
      untitledEvent: "Untitled event"
    },
    aria: {
      handoffAnnouncementMemo: (source: "thumbnail" | "schedule") =>
        source === "thumbnail" ? "Announcement memo received from Thumbnail Editor" : "Announcement memo received from Schedule Calendar",
      editPreview: (index: number) => `Edit preview for post ${index}`,
      orderPreview: (count: number) => `Posting-order preview for ${count} posts`,
      imageMainPreview: (index: number) => `Main split preview for image ${index}`,
      postMainPreview: (index: number) => `Main split preview for post ${index}`,
      mobileActions: "Mobile actions",
      closeNotification: "Close notification"
    }
  }
} as const;

const presetCards: Record<Locale, SnsSplitPresetCard[]> = {
  ja: [
    {
      id: "split-2",
      title: "2分割",
      status: "利用可能",
      description: "横長2枚を保存順どおりに作ります。",
      details: ["3連結 / 5連結", "個別追加 / フレーム追加", "保存順 split_1 → split_2"],
      available: true
    },
    {
      id: "split-3",
      title: "3分割",
      status: "利用可能",
      description: "横長1枚と縦長2枚を保存順どおりに作ります。",
      details: ["24:9 + 8:13.5", "個別追加 / フレーム追加", "保存順 split_1 → split_2 → split_3"],
      available: true
    },
    {
      id: "split-4",
      title: "4分割",
      status: "利用可能",
      description: "縦長4枚を保存順どおりに作ります。",
      details: ["2x2配置", "個別追加 / フレーム追加", "保存順 split_1 → split_2 → split_3 → split_4"],
      available: true
    }
  ],
  en: [
    {
      id: "split-2",
      title: "2-split",
      status: "Available",
      description: "Creates two wide images in save order.",
      details: ["3-panel / 5-panel", "Individual add / Frame add", "Save order split_1 → split_2"],
      available: true
    },
    {
      id: "split-3",
      title: "3-split",
      status: "Available",
      description: "Creates one wide image and two vertical images in save order.",
      details: ["24:9 + 8:13.5", "Individual add / Frame add", "Save order split_1 → split_2 → split_3"],
      available: true
    },
    {
      id: "split-4",
      title: "4-split",
      status: "Available",
      description: "Creates four vertical images in save order.",
      details: ["2x2 layout", "Individual add / Frame add", "Save order split_1 → split_2 → split_3 → split_4"],
      available: true
    }
  ]
};

const modeLabels = {
  ja: {
    concatenate: "個別追加",
    replace: "フレーム追加"
  },
  en: {
    concatenate: "Individual add",
    replace: "Frame add"
  }
} as const satisfies Record<Locale, Record<SnsSplitMode, string>>;

const modeNotes = {
  ja: {
    concatenate: "プリセットごとの追加枠に個別画像を配置します",
    replace: "投稿ごとのフレーム画像へメイン分割を差し込みます"
  },
  en: {
    concatenate: "Place individual images in each preset's extra slots.",
    replace: "Insert the main split into each post's frame image."
  }
} as const satisfies Record<Locale, Record<SnsSplitMode, string>>;

const joinTypeLabels = {
  ja: {
    three: "3連結",
    five: "5連結"
  },
  en: {
    three: "3-panel",
    five: "5-panel"
  }
} as const satisfies Record<Locale, Record<SnsSplitJoinType, string>>;

const joinTypeNotes = {
  ja: {
    three: "左追加 / 中央メイン / 右追加で構成します",
    five: "左上下 / 中央メイン / 右上下で構成します"
  },
  en: {
    three: "Uses left extra / center main / right extra.",
    five: "Uses left top-bottom / center main / right top-bottom."
  }
} as const satisfies Record<Locale, Record<SnsSplitJoinType, string>>;

const slotGroupLabels: Record<Locale, Record<string, string>> = {
  ja: {
    "split-2-replace": "投稿別フレーム",
    "split-2-five": "投稿別の左右上下",
    "split-2-three": "投稿別の左右",
    "split-3-replace": "画像別フレーム",
    "split-3-concatenate": "画像別の左右/上下",
    "split-4-replace": "投稿別フレーム",
    "split-4-concatenate": "投稿別の上部/下部"
  },
  en: {
    "split-2-replace": "per-post frames",
    "split-2-five": "left/right top-bottom",
    "split-2-three": "left/right sides",
    "split-3-replace": "per-image frames",
    "split-3-concatenate": "left/right and top/bottom",
    "split-4-replace": "per-post frames",
    "split-4-concatenate": "top/bottom per post"
  }
};

const slotDescriptions: Record<Locale, Record<string, string>> = {
  ja: {
    "split-2-replace": "フレーム追加では、各24:9フレーム画像の中央8:9へメイン分割を差し込みます。",
    "split-2-five": "5連結では、各投稿を「左上下 / 中央メイン / 右上下」の24:9画像として作成します。",
    "split-2-three": "3連結では、各投稿を「左追加 / 中央メイン / 右追加」の24:9画像として作成します。",
    "split-3-replace": "フレーム追加では、画像1は24:9、画像2/3は8:13.5のフレーム全面へ描画し、中央メイン領域を上書きします。",
    "split-3-concatenate": "個別追加では、画像1は左右8:9、画像2/3は上下8:4.5の追加画像でメイン分割を挟みます。",
    "split-4-replace": "フレーム追加では、各フレーム画像の中央1/3へメイン分割を差し込みます。（旧: 1+4）",
    "split-4-concatenate": "個別追加では、各投稿を「追加画像（上）/ メイン分割 / 追加画像（下）」で作成します。（旧: 1+8）"
  },
  en: {
    "split-2-replace": "Frame add inserts the main split into the center 8:9 area of each 24:9 frame image.",
    "split-2-five": "5-panel mode creates each 24:9 post as left top/bottom, center main, and right top/bottom.",
    "split-2-three": "3-panel mode creates each 24:9 post as left extra, center main, and right extra.",
    "split-3-replace": "Frame add draws image 1 as 24:9 and images 2/3 as 8:13.5 frames, replacing the center main area.",
    "split-3-concatenate": "Individual add surrounds image 1 with left/right extras and images 2/3 with top/bottom extras.",
    "split-4-replace": "Frame add inserts the main split into the center third of each 8:13.5 frame.",
    "split-4-concatenate": "Individual add creates each post as extra image top, main split, and extra image bottom."
  }
};

const ratioHints: Record<Locale, Record<string, string>> = {
  ja: {
    "split-2-replace": "フレーム追加は24:9画像を投稿ごとに1枚ずつ用意します。",
    "split-2-five": "5連結の個別追加は、左右の追加画像を各8:4.5相当で使います。",
    "split-2-three": "3連結の個別追加は、左右の追加画像を各8:9相当で使います。",
    "split-3-replace": "フレーム追加は画像1が24:9、画像2/3が8:13.5です。",
    "split-3-concatenate": "個別追加は画像1の左右が8:9、画像2/3の上下が8:4.5です。",
    "split-4-replace": "フレーム追加は投稿ごとの8:13.5フレームを使います。（旧: 1+4）",
    "split-4-concatenate": "個別追加は投稿ごとの上部/下部に16:9画像を使います。（旧: 1+8）"
  },
  en: {
    "split-2-replace": "Frame add uses one 24:9 frame image for each post.",
    "split-2-five": "5-panel individual add uses each left/right extra image at about 8:4.5.",
    "split-2-three": "3-panel individual add uses each left/right extra image at about 8:9.",
    "split-3-replace": "Frame add uses 24:9 for image 1 and 8:13.5 for images 2/3.",
    "split-3-concatenate": "Individual add uses 8:9 left/right extras for image 1 and 8:4.5 top/bottom extras for images 2/3.",
    "split-4-replace": "Frame add uses an 8:13.5 frame for each post.",
    "split-4-concatenate": "Individual add uses 16:9 images above and below each post."
  }
};

function getPresetModeKey(preset: SnsSplitPreset, mode: SnsSplitMode, joinType: SnsSplitJoinType): string {
  if (preset === "split-2" && mode === "concatenate") {
    return `${preset}-${joinType}`;
  }
  return `${preset}-${mode}`;
}

export function getSnsSplitImageMakerCopy(locale: Locale) {
  return snsSplitImageMakerCopy[locale] ?? snsSplitImageMakerCopy.ja;
}

export function getSnsSplitPresetCards(locale: Locale): SnsSplitPresetCard[] {
  return presetCards[locale] ?? presetCards.ja;
}

export function getSnsSplitModeLabel(mode: SnsSplitMode, locale: Locale): string {
  return modeLabels[locale][mode] ?? modeLabels.ja[mode];
}

export function getSnsSplitModeNote(mode: SnsSplitMode, locale: Locale): string {
  return modeNotes[locale][mode] ?? modeNotes.ja[mode];
}

export function getSnsSplitJoinTypeLabel(joinType: SnsSplitJoinType, locale: Locale): string {
  return joinTypeLabels[locale][joinType] ?? joinTypeLabels.ja[joinType];
}

export function getSnsSplitJoinTypeNote(joinType: SnsSplitJoinType, locale: Locale): string {
  return joinTypeNotes[locale][joinType] ?? joinTypeNotes.ja[joinType];
}

export function getSnsSplitSlotGroupLabel(preset: SnsSplitPreset, mode: SnsSplitMode, joinType: SnsSplitJoinType, locale: Locale): string {
  return slotGroupLabels[locale][getPresetModeKey(preset, mode, joinType)] ?? slotGroupLabels.ja[getPresetModeKey(preset, mode, joinType)];
}

export function getSnsSplitSlotDescription(preset: SnsSplitPreset, mode: SnsSplitMode, joinType: SnsSplitJoinType, locale: Locale): string {
  return slotDescriptions[locale][getPresetModeKey(preset, mode, joinType)] ?? slotDescriptions.ja[getPresetModeKey(preset, mode, joinType)];
}

export function getSnsSplitAdditionalImageRatioHint(preset: SnsSplitPreset, mode: SnsSplitMode, joinType: SnsSplitJoinType, locale: Locale): string {
  return ratioHints[locale][getPresetModeKey(preset, mode, joinType)] ?? ratioHints.ja[getPresetModeKey(preset, mode, joinType)];
}
