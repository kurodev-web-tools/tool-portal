import type { Locale } from "@/lib/locale";
import type {
  ThumbnailFontLanguage,
  ThumbnailEditorDraft,
  ThumbnailLayer,
  ThumbnailMainTextCarryoverKey,
  ThumbnailMaterial,
  ThumbnailMaterialCategory,
  ThumbnailPreset,
  ThumbnailPresetCategory,
  ThumbnailPresetFilter,
  ThumbnailPresetId,
  ThumbnailPresetVariantId,
  ThumbnailQualityGuardItem,
  ThumbnailQualityGuardSummary,
  ThumbnailStandeePlacementPreset,
  ThumbnailStandeePlacementPresetId,
  ThumbnailTextLayer
} from "@/lib/thumbnail-editor";

type ThumbnailPresetCopy = {
  name: string;
  description: string;
};

type ThumbnailPresetTextBodyCopy = Partial<Record<ThumbnailPresetId, Record<string, string>>>;
type ThumbnailPresetTextLayerVisualAdjustment = Partial<Pick<ThumbnailTextLayer, "x" | "y" | "width" | "height" | "fontSize" | "lineHeight" | "align">>;
type ThumbnailPresetLayerVisualAdjustment = Partial<Pick<ThumbnailLayer, "x" | "y" | "width" | "height">>;
const thumbnailIriamSquarePresetIds = new Set<ThumbnailPresetId>(["karaoke", "dark_gacha", "chatting", "first_stream", "endurance_stream"]);

function isThumbnailIriamSquareDraft(draft: ThumbnailEditorDraft): boolean {
  return thumbnailIriamSquarePresetIds.has(draft.presetId) && draft.canvas.width === draft.canvas.height;
}

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
      laterCandidate: "後続候補",
      laterCandidateSuffix: "（後続候補）",
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
      inlineTextEditorAria: "キャンバス上でテキスト本文を編集",
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
        width: "幅",
        height: "高さ",
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
    iriamSquareDialog: {
      eyebrow: "1:1 IRIAM プリセット",
      title: "歌枠プリセット設定",
      body: "背景とタイトル画像の色を選んで、1:1 の下書きとして作成します。",
      presetTitles: {
        karaoke: "歌枠プリセット設定",
        dark_gacha: "闇ガチャプリセット設定",
        chatting: "雑談プリセット設定",
        first_stream: "初配信プリセット設定",
        endurance_stream: "耐久プリセット設定"
      },
      presetBodies: {
        karaoke: "背景とタイトル画像の色を選んで、1:1 の下書きとして作成します。",
        dark_gacha: "dark_cute 背景の色とタイトル画像の色を選んで、1:1 の下書きとして作成します。",
        chatting: "pop_bubble 背景の色とタイトル画像の色を選んで、1:1 の下書きとして作成します。",
        first_stream: "soft_cloud 背景の色とタイトル画像の色を選んで、1:1 の下書きとして作成します。",
        endurance_stream: "pop_bubble 背景の色とタイトル画像の色を選んで、1:1 の下書きとして作成します。"
      },
      preview: "プレビュー",
      backgroundStyle: "背景タイプ",
      backgroundColor: "背景カラー",
      titleColor: "タイトルカラー",
      matchBackground: "背景に合わせる",
      cancel: "キャンセル",
      create: "この設定で作成",
      styleLabels: {
        soft_cloud: "soft_cloud",
        pop_bubble: "pop_bubble",
        dark_cute: "dark_cute"
      },
      colorLabels: {
        "pink-blue": "pink-blue",
        blue: "blue",
        yellow: "yellow",
        purple: "purple",
        mint: "mint"
      }
    },
    iriamSquareBackgroundSwap: {
      title: "IRIAM 背景",
      note: "選択中の背景画像だけ差し替え",
      fixedStyle: (style: string) => `${style} 固定`
    },
    iriamSquareTitleSwap: {
      title: "IRIAM タイトル",
      note: "選択中のタイトル画像だけ差し替え"
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
    },
    messages: {
      canvasRenderFailed: "キャンバスの描画に失敗しました。",
      fullPreviewRenderFailed: "全体プレビューの描画に失敗しました。",
      invalidAutoSave: "下書きデータが不正なため自動保存を中断しました。",
      autoSaveFailed: "下書きの自動保存に失敗しました。",
      invalidSave: "下書きデータが不正なため保存できません。",
      saveFailed: "下書き保存に失敗しました。",
      imageTypeInvalid: "PNG/JPEG画像ファイルを選択してください。",
      imageTooLarge: "画像は8MB以下にしてください。",
      imageReadFailed: "画像の読み込みに失敗しました。",
      imageLayerAdded: "画像レイヤーを追加しました。",
      materialAddFailed: "素材を追加できませんでした。",
      materialLayerAdded: "素材レイヤーを追加しました。",
      materialLayerAddedWithName: (name: string) => `「${name}」を素材レイヤーとして追加しました。`,
      userMaterialListSaveFailed: "ユーザー素材の一覧保存に失敗しました。",
      userMaterialTypeInvalid: "PNG/JPEG/WebP/SVG画像ファイルを選択してください。",
      userMaterialReplaced: (name: string) => `「${name}」へ置換しました。配置とcropは維持しています。`,
      userMaterialAdded: (name: string) => `「${name}」をユーザー素材として追加しました。`,
      userMaterialSaveFailed: "ユーザー素材の保存に失敗しました。",
      userMaterialLayerAdded: (name: string) => `「${name}」をユーザー素材レイヤーとして追加しました。`,
      userMaterialDeleted: (name: string) => `「${name}」を素材一覧から削除しました。配置済みレイヤーは残ります。不要ならレイヤー一覧から削除してください。`,
      userMaterialDeleteFailed: "ユーザー素材の削除に失敗しました。",
      editableImageRequired: "編集可能な画像レイヤーを選択してください。",
      standeePlacementApplied: (layerName: string, presetName: string) => `「${layerName}」へ立ち絵配置「${presetName}」を適用しました。`,
      standeePlacementAppliedFallback: (layerName: string) => `「${layerName}」へ立ち絵配置を適用しました。`,
      minimumLayerRequired: "最低1レイヤーは残してください。",
      invalidExport: "下書きデータが不正なため書き出しできません。",
      exportNeedsImage: "画像レイヤーがないため書き出しできません。画像を追加してください。",
      exportFailed: "書き出しに失敗しました。",
      invalidSnsHandoff: "下書きデータが不正なためSNS分割画像へ渡せません。",
      userMaterialCapacity: {
        "file-too-large": "ユーザー素材は1点8MB以下にしてください。",
        "library-full": "ユーザー素材は最大24件です。不要な素材を削除してから追加してください。",
        "total-bytes-exceeded": "ユーザー素材は合計48MBまでです。不要な素材を削除するか置換してください。"
      }
    },
    aria: {
      closeFullPreview: "全体プレビューを閉じる",
      fullPreviewCanvas: "サムネイル全体確認",
      imageFileInput: "画像ファイルを選択",
      userMaterialFileInput: "ユーザー素材ファイルを選択",
      addMaterial: (name: string) => `${name}を素材として追加`,
      toggleWeeklyGroup: (label: string, collapsed: boolean) => `${label}グループを${collapsed ? "開く" : "閉じる"}`,
      selectColor: (label: string) => `${label}を選ぶ`,
      colorSwatch: (swatch: string) => `色 ${swatch}`
    },
    layerControls: {
      moveFront: "前面へ",
      moveBack: "背面へ",
      duplicate: "複製",
      toggleVisibility: "表示切替",
      toggleLock: "ロック切替",
      delete: "削除",
      duplicateShort: "複",
      hiddenShort: "非",
      visibleShort: "目",
      lockedShort: "錠",
      unlockedShort: "開",
      deleteShort: "削"
    },
    quickAdjust: {
      title: "操作補助",
      note: "画面外ハンドル対策",
      shrink: "サイズ -",
      enlarge: "サイズ +",
      rotateLeft: "回転 -5",
      rotateRight: "回転 +5",
      center: "中央へ",
      shrinkAria: (name: string) => `${name}を縮小`,
      enlargeAria: (name: string) => `${name}を拡大`,
      rotateLeftAria: (name: string) => `${name}を左へ5度回転`,
      rotateRightAria: (name: string) => `${name}を右へ5度回転`,
      centerAria: (name: string) => `${name}をキャンバス中央へ移動`
    },
    standee: {
      title: "立ち絵配置",
      locked: "ロック中",
      target: "適用先",
      groups: { "1人": "1人", "2人": "2人", "3人": "3人" },
      unlockGuide: "ロック解除後に適用できます。",
      multiGuide: "2人 / 3人は画像レイヤーを人数分追加して、選択中の1枚へ個別に適用します。",
      lockedReason: "ロック中のため適用できません"
    },
    textControls: {
      text: "テキスト",
      font: "フォント",
      fontSearchPlaceholder: "検索",
      fontSearchAria: "フォントを検索",
      recent: "最近",
      noResults: "該当なし",
      size: "サイズ",
      lineHeight: "行間",
      color: "色",
      alignLeft: "左",
      alignCenter: "中央",
      alignRight: "右"
    },
    shapeControls: {
      fill: "塗りつぶし",
      stroke: "枠線",
      strokeWidth: "枠線の太さ",
      radius: "角丸"
    },
    effectControls: {
      title: "エフェクト",
      opacity: "透明度",
      blur: "ぼかし",
      outline: "縁取り",
      outlineColor: "縁取り色",
      shadowBlur: "影ぼかし",
      shadowColor: "影色",
      shadowX: "影X",
      shadowY: "影Y"
    },
    favorite: {
      add: (name: string) => `${name}をお気に入りに追加`,
      remove: (name: string) => `${name}のお気に入りを解除`,
      addTitle: "お気に入りに追加",
      removeTitle: "お気に入りを解除"
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
      laterCandidate: "Later",
      laterCandidateSuffix: " (Later)",
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
      inlineTextEditorAria: "Edit text directly on the canvas",
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
        width: "Width",
        height: "Height",
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
    iriamSquareDialog: {
      eyebrow: "1:1 IRIAM preset",
      title: "Karaoke preset settings",
      body: "Choose the background and title image color, then create a 1:1 draft.",
      presetTitles: {
        karaoke: "Karaoke preset settings",
        dark_gacha: "Dark Gacha preset settings",
        chatting: "Chatting preset settings",
        first_stream: "First Stream preset settings",
        endurance_stream: "Endurance Stream preset settings"
      },
      presetBodies: {
        karaoke: "Choose the background and title image color, then create a 1:1 draft.",
        dark_gacha: "Choose the dark_cute background color and title image color, then create a 1:1 draft.",
        chatting: "Choose the pop_bubble background color and title image color, then create a 1:1 draft.",
        first_stream: "Choose the soft_cloud background color and title image color, then create a 1:1 draft.",
        endurance_stream: "Choose the pop_bubble background color and title image color, then create a 1:1 draft."
      },
      preview: "Preview",
      backgroundStyle: "Background type",
      backgroundColor: "Background color",
      titleColor: "Title color",
      matchBackground: "Match background",
      cancel: "Cancel",
      create: "Create with these settings",
      styleLabels: {
        soft_cloud: "soft_cloud",
        pop_bubble: "pop_bubble",
        dark_cute: "dark_cute"
      },
      colorLabels: {
        "pink-blue": "pink-blue",
        blue: "blue",
        yellow: "yellow",
        purple: "purple",
        mint: "mint"
      }
    },
    iriamSquareBackgroundSwap: {
      title: "IRIAM background",
      note: "Replace only the selected background image",
      fixedStyle: (style: string) => `${style} fixed`
    },
    iriamSquareTitleSwap: {
      title: "IRIAM title",
      note: "Replace only the selected title image"
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
    },
    messages: {
      canvasRenderFailed: "Could not render the canvas.",
      fullPreviewRenderFailed: "Could not render the full preview.",
      invalidAutoSave: "Autosave stopped because the draft data is invalid.",
      autoSaveFailed: "Draft autosave failed.",
      invalidSave: "Cannot save because the draft data is invalid.",
      saveFailed: "Could not save the draft.",
      imageTypeInvalid: "Choose a PNG or JPEG image file.",
      imageTooLarge: "Image must be 8MB or smaller.",
      imageReadFailed: "Could not read the image.",
      imageLayerAdded: "Image layer added.",
      materialAddFailed: "Could not add the asset.",
      materialLayerAdded: "Asset layer added.",
      materialLayerAddedWithName: (name: string) => `Added "${name}" as an asset layer.`,
      userMaterialListSaveFailed: "Could not save the user asset list.",
      userMaterialTypeInvalid: "Choose a PNG, JPEG, WebP, or SVG image file.",
      userMaterialReplaced: (name: string) => `Replaced with "${name}". Placement and crop were kept.`,
      userMaterialAdded: (name: string) => `Added "${name}" as a user asset.`,
      userMaterialSaveFailed: "Could not save the user asset.",
      userMaterialLayerAdded: (name: string) => `Added "${name}" as a user asset layer.`,
      userMaterialDeleted: (name: string) => `Removed "${name}" from the asset list. Placed layers remain; delete them from Layers if needed.`,
      userMaterialDeleteFailed: "Could not delete the user asset.",
      editableImageRequired: "Select an editable image layer.",
      standeePlacementApplied: (layerName: string, presetName: string) => `Applied standee placement "${presetName}" to "${layerName}".`,
      standeePlacementAppliedFallback: (layerName: string) => `Applied standee placement to "${layerName}".`,
      minimumLayerRequired: "Keep at least one layer.",
      invalidExport: "Cannot export because the draft data is invalid.",
      exportNeedsImage: "Add an image layer before exporting.",
      exportFailed: "Export failed.",
      invalidSnsHandoff: "Cannot hand off to SNS Split Image Maker because the draft data is invalid.",
      userMaterialCapacity: {
        "file-too-large": "User assets must be 8MB or smaller.",
        "library-full": "User assets are limited to 24 items. Delete an unused asset before adding more.",
        "total-bytes-exceeded": "User assets are limited to 48MB total. Delete or replace an unused asset."
      }
    },
    aria: {
      closeFullPreview: "Close full preview",
      fullPreviewCanvas: "Full thumbnail preview",
      imageFileInput: "Choose image file",
      userMaterialFileInput: "Choose user asset file",
      addMaterial: (name: string) => `Add ${name} as an asset`,
      toggleWeeklyGroup: (label: string, collapsed: boolean) => `${collapsed ? "Open" : "Close"} ${label} group`,
      selectColor: (label: string) => `Choose ${label}`,
      colorSwatch: (swatch: string) => `Color ${swatch}`
    },
    layerControls: {
      moveFront: "Bring forward",
      moveBack: "Send backward",
      duplicate: "Duplicate",
      toggleVisibility: "Toggle visibility",
      toggleLock: "Toggle lock",
      delete: "Delete",
      duplicateShort: "Dup",
      hiddenShort: "Hide",
      visibleShort: "Show",
      lockedShort: "Lock",
      unlockedShort: "Open",
      deleteShort: "Del"
    },
    quickAdjust: {
      title: "Quick adjust",
      note: "For off-canvas handles",
      shrink: "Size -",
      enlarge: "Size +",
      rotateLeft: "Rotate -5",
      rotateRight: "Rotate +5",
      center: "Center",
      shrinkAria: (name: string) => `Shrink ${name}`,
      enlargeAria: (name: string) => `Enlarge ${name}`,
      rotateLeftAria: (name: string) => `Rotate ${name} left 5 degrees`,
      rotateRightAria: (name: string) => `Rotate ${name} right 5 degrees`,
      centerAria: (name: string) => `Move ${name} to canvas center`
    },
    standee: {
      title: "Standee placement",
      locked: "Locked",
      target: "Target",
      groups: { "1人": "1 person", "2人": "2 people", "3人": "3 people" },
      unlockGuide: "Unlock the layer before applying.",
      multiGuide: "For 2 or 3 people, add image layers for each person and apply this to the selected layer.",
      lockedReason: "Cannot apply while locked"
    },
    textControls: {
      text: "Text",
      font: "Font",
      fontSearchPlaceholder: "Search",
      fontSearchAria: "Search fonts",
      recent: "Recent",
      noResults: "No matches",
      size: "Size",
      lineHeight: "Line height",
      color: "Color",
      alignLeft: "Left",
      alignCenter: "Center",
      alignRight: "Right"
    },
    shapeControls: {
      fill: "Fill",
      stroke: "Stroke",
      strokeWidth: "Stroke width",
      radius: "Radius"
    },
    effectControls: {
      title: "Effects",
      opacity: "Opacity",
      blur: "Blur",
      outline: "Outline",
      outlineColor: "Outline color",
      shadowBlur: "Shadow blur",
      shadowColor: "Shadow color",
      shadowX: "Shadow X",
      shadowY: "Shadow Y"
    },
    favorite: {
      add: (name: string) => `Add ${name} to favorites`,
      remove: (name: string) => `Remove ${name} from favorites`,
      addTitle: "Add to favorites",
      removeTitle: "Remove from favorites"
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
    goods_notice: { name: "グッズ告知", description: "BOOTH や digital goods の販売開始を商品カード中心に見せる物販告知向け。" },
    membership_stream: { name: "メン限配信", description: "member-only stream や限定公開を premium label と CTA で見せるメンバー向け配信告知。" },
    asmr_stream: { name: "ASMR配信", description: "ASMR、sleep aid、quiet talk を低彩度の night gradient と mic motif で見せるリラックス配信向け。" },
    privacy_notice: { name: "プライバシー告知", description: "予定テキストを活かしつつ、細かい内容を出しすぎない事前告知向け。" },
    whiteboard_plan: { name: "ホワイトボード", description: "企画内容や配信の流れを、白板風に軽く整理して見せる告知向け。" },
    karaoke: { name: "歌枠", description: "音楽配信に合う強いコントラスト。" },
    dark_gacha: { name: "闇ガチャ", description: "IRIAM向けの正方形 starter preset。dark_cute background と透明 title image を使う。" },
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
    goods_notice: { name: "Merch Notice", description: "A merch release layout for BOOTH, digital goods, product cards, and shop CTAs." },
    membership_stream: { name: "Members-Only Stream", description: "A premium member-only stream layout for limited access, community perks, and closed stream CTAs." },
    asmr_stream: { name: "ASMR Stream", description: "A low-contrast relax night layout for ASMR, sleep-aid streams, and quiet talk." },
    privacy_notice: { name: "Privacy Notice", description: "A pre-announcement layout that keeps schedule details from showing too much." },
    whiteboard_plan: { name: "Whiteboard Plan", description: "A whiteboard-style layout for lightly organizing a stream plan or flow." },
    karaoke: { name: "Karaoke", description: "Strong contrast for music streams." },
    dark_gacha: { name: "Dark Gacha", description: "A square IRIAM starter preset using a dark_cute background and transparent title image." },
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
    "物販 / merch release": "Merch release",
    "メン限 / members only": "Members only",
    "ASMR / relax night": "ASMR / relax night",
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

const materialCategoryLabels = {
  ja: {
    "label-base": "ラベル土台",
    "date-badge": "バッジ",
    corner: "角飾り",
    accent: "光 / グリント / エフェクト",
    divider: "HUD線 / 区切り",
    frame: "フレーム / パネル"
  },
  en: {
    "label-base": "Label base",
    "date-badge": "Date badge",
    corner: "Corner accent",
    accent: "Glow / effect",
    divider: "HUD line / divider",
    frame: "Frame / panel"
  }
} as const satisfies Record<Locale, Record<ThumbnailMaterialCategory, string>>;

type MaterialCopy = {
  name: string;
  description: string;
  recommendedPlacement: string;
};

const materialCopy: Record<Locale, Partial<Record<string, MaterialCopy>>> = {
  ja: {},
  en: {
    "label-plaque-cyan": {
      name: "Cyan Label Plate",
      description: "A cyan glow plate for short label text.",
      recommendedPlacement: "Upper-left label base"
    },
    "date-badge-navy-gold": {
      name: "Navy Gold Date Badge",
      description: "A wide navy and gold badge for dates, times, or release notes.",
      recommendedPlacement: "Lower date or time badge"
    },
    "week-range-badge-blue": {
      name: "Week Range Badge",
      description: "A blue badge suited for week ranges or short period labels.",
      recommendedPlacement: "Week range or short period label"
    },
    "corner-ornament-gold": {
      name: "Gold Corner Ornament",
      description: "A restrained gold corner ornament for info boxes and cards.",
      recommendedPlacement: "Corners of information frames"
    },
    "soft-glint-gold": {
      name: "Soft Gold Glint",
      description: "Small gold sparkles for headlines or badge areas.",
      recommendedPlacement: "Subtle glow near headlines"
    },
    "hud-corner-frame-green": {
      name: "Green HUD Corner Frame",
      description: "Green HUD corners that layer well over standees, video frames, or info blocks.",
      recommendedPlacement: "Standee or information HUD corners"
    },
    "schedule-table-accent-cyan": {
      name: "Cyan Schedule Accent",
      description: "Cyan line accents for schedule tables, separators, and info grids.",
      recommendedPlacement: "Schedule table or divider accent"
    },
    "duo-guide-spotlight": {
      name: "Soft Multi-Guide Glow",
      description: "A faint guide glow behind multi-person layouts, video frames, or comment areas.",
      recommendedPlacement: "Soft guide for multi-person or video frames"
    },
    "hud-divider-cyan": {
      name: "Cyan HUD Divider",
      description: "A thin cyan HUD line for headline undersides or section breaks.",
      recommendedPlacement: "Under headlines or between sections"
    },
    "video-comment-frame-blue": {
      name: "Blue Video Comment Frame",
      description: "A blue frame for video areas, comment boxes, or large information panels.",
      recommendedPlacement: "Base for video or comment frames"
    },
    "label-tech-plate-navy-cyan": {
      name: "Navy Cyan Tech Plate",
      description: "A wide navy plate with cyan trim for headline backgrounds.",
      recommendedPlacement: "Wide tech plate behind headlines"
    },
    "label-glass-plate-white-blue": {
      name: "White Blue Glass Label",
      description: "A white and pale-blue glass label for short supporting text.",
      recommendedPlacement: "Glass label behind short support text"
    },
    "label-champagne-plaque-dark-trim": {
      name: "Champagne Title Plaque",
      description: "A champagne-gold plaque for refined announcement headlines.",
      recommendedPlacement: "Elegant wide headline plaque"
    },
    "label-diagonal-ribbon-slate-cyan": {
      name: "Diagonal Cut Ribbon",
      description: "A wide diagonal-cut ribbon for subheads or short notes.",
      recommendedPlacement: "Diagonal ribbon behind subheads"
    },
    "badge-status-magenta-cyan": {
      name: "Magenta Round Badge",
      description: "A compact magenta and cyan badge for dates or short status labels.",
      recommendedPlacement: "Behind dates or short status text"
    },
    "badge-time-amber-charcoal": {
      name: "Amber Time Pill",
      description: "An amber and charcoal pill badge suited for time or release labels.",
      recommendedPlacement: "Behind time labels"
    },
    "badge-notice-mint-white": {
      name: "Mint Notice Tag",
      description: "A small mint and white tag badge for light notices or short support text.",
      recommendedPlacement: "Behind light notices or short notes"
    },
    "badge-tech-hex-cyan-violet": {
      name: "Cyan Hex Tech Badge",
      description: "A compact cyan and violet hex badge for short tech-style status text.",
      recommendedPlacement: "Short tech-style status label"
    },
    "frame-smoke-glass-blue-rim": {
      name: "Blue Rim Smoke Panel",
      description: "A low-saturation smoke glass panel with a blue rim for video or info blocks.",
      recommendedPlacement: "Behind video frames or info blocks"
    },
    "frame-offwhite-navy-info-panel": {
      name: "Off-White Navy Info Panel",
      description: "A readable off-white information panel with navy line accents.",
      recommendedPlacement: "Behind readable information blocks"
    },
    "frame-thin-gold-technical": {
      name: "Thin Gold Tech Frame",
      description: "A thin gold technical frame for elegant video frames or standee spacing guides.",
      recommendedPlacement: "Elegant frame or standee spacing guide"
    },
    "frame-translucent-comment-panel": {
      name: "Translucent Comment Panel",
      description: "A translucent wide panel for comment areas or short guidance text.",
      recommendedPlacement: "Behind comment areas or short notes"
    },
    "frame-muted-schedule-panel": {
      name: "Muted Schedule Panel",
      description: "A subdued panel with faint rules for schedule or information areas.",
      recommendedPlacement: "Schedule area or muted info frame"
    },
    "divider-cyan-thin-hud": {
      name: "Thin Cyan HUD Line",
      description: "A thin cyan HUD accent line that layers lightly under headlines.",
      recommendedPlacement: "Thin accent line under headlines"
    },
    "divider-soft-white-dotted": {
      name: "Soft White Dotted Divider",
      description: "A pale white dotted divider for spacing information blocks.",
      recommendedPlacement: "Dotted divider between information blocks"
    },
    "divider-muted-teal-l-corner-guide": {
      name: "Muted Teal L Guide",
      description: "A low-saturation teal L-shaped guide for schedule or information frame corners.",
      recommendedPlacement: "L guide for schedule or info corners"
    },
    "divider-pale-cyan-segmented-underline": {
      name: "Pale Cyan Segmented Underline",
      description: "A pale cyan segmented underline for headlines or short explanations.",
      recommendedPlacement: "Segmented underline for headlines"
    },
    "divider-navy-white-technical-rule": {
      name: "Navy White Technical Rule",
      description: "A subdued navy and white technical rule for schedule support lines.",
      recommendedPlacement: "Support rule for schedule areas"
    },
    "effect-warm-gold-subtle-glint": {
      name: "Warm Gold Glint",
      description: "A restrained gold glint for the side of headlines or badges.",
      recommendedPlacement: "Small gold glint beside headlines"
    },
    "effect-soft-white-sparkle-cluster": {
      name: "Soft White Sparkles",
      description: "Small pale white sparkles for CTA or key information areas.",
      recommendedPlacement: "Near CTA or important information"
    },
    "effect-pale-cyan-diagonal-streak": {
      name: "Pale Cyan Diagonal Streak",
      description: "A pale cyan diagonal highlight for lightly layering over backgrounds.",
      recommendedPlacement: "Light diagonal highlight over backgrounds"
    },
    "effect-blue-glow-wash": {
      name: "Blue Glow Wash",
      description: "A subtle blue glow wash that blends boundaries between assets.",
      recommendedPlacement: "Soft blue glow between layered assets"
    },
    "corner-rose-gold-asymmetric-shard": {
      name: "Rose Gold Shard",
      description: "A restrained asymmetric rose and gold accent for headline or info-frame corners.",
      recommendedPlacement: "Asymmetric accent near headlines or corners"
    },
    "corner-cyan-navy-tech-chevron": {
      name: "Navy Cyan Chevron",
      description: "A small navy and cyan chevron for directing attention beside key information.",
      recommendedPlacement: "Small direction mark beside key information"
    },
    "corner-white-charcoal-diagonal-tab": {
      name: "White Charcoal Diagonal Tab",
      description: "A small white and charcoal diagonal tab for edges and open space.",
      recommendedPlacement: "Diagonal tab at edges or open space"
    },
    "corner-champagne-glint-bracket": {
      name: "Champagne Glint Bracket",
      description: "A small champagne bracket accent that tightens another asset's corner.",
      recommendedPlacement: "Small bracket accent on another asset corner"
    },
    "impact-arrow-cyan-black": {
      name: "Cyan Arrow Accent",
      description: "A compact cyan and black arrow accent for headlines or focus points.",
      recommendedPlacement: "Arrow accent near headlines or focus points"
    },
    "impact-burst-yellow-black": {
      name: "Yellow Black Impact Burst",
      description: "An abstract yellow and black impact mark for emphasis behind or beside key elements.",
      recommendedPlacement: "Behind or beside emphasized elements"
    },
    "impact-speed-lines-white-cyan": {
      name: "White Cyan Speed Lines",
      description: "White and cyan diagonal speed lines for headline undersides or screen edges.",
      recommendedPlacement: "Speed lines under headlines or at screen edges"
    },
    "impact-focus-lines-monochrome": {
      name: "Monochrome Focus Lines",
      description: "Abstract black-and-white focus lines that can sit faintly behind a focal point.",
      recommendedPlacement: "Faint focus lines behind key points"
    },
    "impact-outline-pop-base-white-black": {
      name: "White Black Pop Base",
      description: "A compact white-and-black outlined base for dates or short status text.",
      recommendedPlacement: "Outlined base behind short dates or status text"
    },
    "iriam-square-accent-puffy-star-pink": {
      name: "Pink Puffy Star",
      description: "A rounded pink star decoration that works beside titles in square or 16:9 thumbnails.",
      recommendedPlacement: "Small star beside titles or open space"
    },
    "iriam-square-accent-soft-heart-blue": {
      name: "Soft Blue Heart",
      description: "A soft blue rounded heart for casual chat, notice, or open-space decoration.",
      recommendedPlacement: "Small heart for chat or soft notice layouts"
    },
    "iriam-square-accent-sparkle-mint": {
      name: "Mint Sparkles",
      description: "A light mint sparkle cluster for layering around headlines or small labels.",
      recommendedPlacement: "Light sparkles around headline areas"
    },
    "iriam-square-accent-hand-line-yellow": {
      name: "Yellow Hand Line",
      description: "A warm hand-drawn yellow underline for short headlines or time labels.",
      recommendedPlacement: "Hand-drawn underline below short text"
    },
    "iriam-square-label-speech-bubble-pink": {
      name: "Pink Speech Bubble",
      description: "A rounded pink speech-bubble base for short comments or time labels in square or 16:9 thumbnails.",
      recommendedPlacement: "Behind a short comment or time label"
    },
    "iriam-square-label-rounded-mint": {
      name: "Mint Small Label",
      description: "A compact mint label base for small notes, tags, or short status text.",
      recommendedPlacement: "Behind a small note or tag"
    },
    "iriam-square-label-cloud-blue": {
      name: "Blue Cloud Label",
      description: "A soft blue cloud-shaped label base for casual notices or chat notes.",
      recommendedPlacement: "Behind a soft notice or chat note"
    },
    "iriam-square-label-tiny-ribbon-yellow-pink": {
      name: "Yellow Pink Ribbon",
      description: "A compact yellow and pink ribbon base for short status text or small annotations.",
      recommendedPlacement: "Behind short status text or annotations"
    }
  }
};

const thumbnailPresetTextBodyCopy: Record<Locale, ThumbnailPresetTextBodyCopy> = {
  ja: {},
  en: {
    stream_announce: {
      "テキスト 4（ラベル）": "Stream / YouTube",
      "テキスト 1（見出し）": "FIRST TIME\nWELCOME!",
      "テキスト 2（時刻）": "21:00 START",
      "テキスト 3（サブ）": "Hang out together!"
    },
    first_stream: {
      "テキスト 4（ラベル）": "DEBUT STREAM",
      "テキスト 1（見出し）": "Debut\nStream",
      "テキスト 1（見出し補助）": "Nice to meet you",
      "テキスト 2（時刻）": "20:00 START",
      "テキスト 3（サブ）": "Requests welcome",
      "テキスト 3（サブ） コピー": "First-timers welcome"
    },
    anniversary_stream: {
      "テキスト 1（見出し）": "1st Anniv.",
      "テキスト 4（ラベル）": "ANNIV. LIVE",
      "テキスト 3（サブ）": "A special night of thanks",
      "テキスト 2（時刻）": "21:00 START"
    },
    endurance_stream: {
      "テキスト 4（ラベル）": "CHALLENGE",
      "テキスト 1（見出し）": "Endurance\nLive",
      "テキスト 5（目標）": "100-run goal",
      "テキスト 3（サブ）": "Clear until we win",
      "テキスト 2（時刻）": "19:00 START"
    },
    project_stream: {
      "テキスト 5（英字）": "SPECIAL PROGRAM",
      "テキスト 1（見出し）": "New\nProject",
      "テキスト 3（サブ）": "What's next?",
      "テキスト 4（ラベル）": "Viewer Event",
      "テキスト 2（時刻）": "20:30 START"
    },
    cover_song_notice: {
      "テキスト 5（カバーアート注記）": "COVER ART / MV",
      "テキスト 4（ラベル）": "PREMIERE",
      "テキスト 1（見出し）": "Cover Song",
      "テキスト 3（サブ）": "New cover release",
      "テキスト 2（時刻）": "20:00 public"
    },
    event_notice: {
      "テキスト 5（キービジュアル注記）": "KEY VISUAL",
      "テキスト 4（ラベル）": "EVENT INFO",
      "テキスト 1（見出し）": "Event Notice",
      "テキスト 2（時刻）": "06.15 SAT",
      "テキスト 3（サブ）": "Event details inside"
    },
    goods_notice: {
      "テキスト 12（発売バッジ）": "NEW",
      "テキスト 1（見出し）": "New Merch",
      "テキスト 5（英字）": "MERCH DROP",
      "テキスト 6（商品1）": "ACRYLIC STAND",
      "テキスト 7（商品2）": "STICKER SET",
      "テキスト 8（商品3）": "DIGITAL GOODS",
      "テキスト 9（価格1）": "¥1,800",
      "テキスト 10（価格2）": "¥800",
      "テキスト 11（価格3）": "¥1,200",
      "テキスト 2（時刻）": "20:00 START",
      "テキスト 3（CTA）": "Shop page open",
      "テキスト 4（補足）": "Limited stock"
    },
    membership_stream: {
      "テキスト 7（バッジ）": "VIP",
      "テキスト 6（会員ラベル）": "MEMBER PERK",
      "テキスト 1（見出し）": "Members\nOnly",
      "テキスト 5（英字）": "PREMIUM LIVE",
      "テキスト 2（時刻）": "21:00 START",
      "テキスト 4（補足）": "Archive included"
    },
    asmr_stream: {
      "テキスト 5（ラベル）": "SLEEP AID",
      "テキスト 1（見出し）": "ASMR Stream",
      "テキスト 3（英字）": "RELAX NIGHT",
      "テキスト 2（時刻）": "23:00 START",
      "テキスト 4（補足）": "Sleep aid / quiet talk"
    },
    privacy_notice: {
      "テキスト 4（ラベル）": "SAFE NOTICE",
      "テキスト 1（見出し）": "Schedule\nNotice",
      "テキスト 3（サブ）": "Details on stream day",
      "テキスト 2（時刻）": "20:00 START"
    },
    whiteboard_plan: {
      "テキスト 4（ラベル）": "TODAY'S PLAN",
      "テキスト 1（見出し）": "Today's\nPlan",
      "テキスト 3（サブ）": "Check the plan together",
      "テキスト 2（時刻）": "21:00"
    },
    karaoke: {
      "テキスト 4（ラベル）": "KARAOKE LIVE",
      "テキスト 1（見出し）": "song\nframe",
      "テキスト 5（見出し英字）": "SINGING STREAM",
      "テキスト 2（時刻）": "20:00 START",
      "テキスト 3（サブ）": "Requests welcome"
    },
    dark_gacha: {
      "テキスト 1（見出し補助）": "SSR WISH",
      "テキスト 2（時刻）": "22:00 START",
      "テキスト 3（サブ）": "Pull or pass?",
      "テキスト 4（ラベル）": "IRIAM / DARK GACHA"
    },
    chatting: {
      "テキスト 4（ラベル）": "CHATTING / YouTube",
      "テキスト 1（見出し）": "Chat\nStream",
      "テキスト 2（時刻）": "20:00 START",
      "テキスト 3（サブ）": "Let's sort out today's topics"
    },
    clip: {
      "テキスト 4（ラベル）": "CLIP",
      "テキスト 1（見出し）": "Best\nMoments",
      "テキスト 2（時刻）": "20:00 \npublic",
      "テキスト 3（サブ）": "Short premiere"
    },
    game_live: {
      "テキスト 4（ラベル）": "GAME LIVE",
      "テキスト 1（見出し）": "Viewer\nGame Live",
      "テキスト 2（時刻）": "20:00 START",
      "テキスト 3（サブ）": "Play along with us"
    },
    collaboration: {
      "テキスト 4（ラベル）": "GUEST",
      "テキスト 1（見出し）": "Collab\nStream",
      "テキスト 2（時刻）": "20:00 START",
      "テキスト 3（サブ）": "Guest name / project title"
    },
    announcement: {
      "テキスト 4（ラベル）": "NEWS",
      "テキスト 1（見出し）": "Key Notice",
      "テキスト 2（時刻）": "5/10 RELEASE",
      "テキスト 3（サブ）": "Upcoming activities"
    },
    weekly_schedule: {
      "テキスト 4（ラベル）": "WEEKLY",
      "テキスト 1（見出し）": "Weekly\nPlan",
      "テキスト 2（時刻）": "5/4 - 5/10",
      "月曜 / 曜日": "MON",
      "月曜 / 時間": "20:00",
      "月曜 / 予定": "Chat",
      "火曜 / 曜日": "TUE",
      "火曜 / 時間": "20:00",
      "火曜 / 予定": "Chat",
      "水曜 / 曜日": "WED",
      "水曜 / 時間": "-",
      "水曜 / 予定": "Break",
      "木曜 / 曜日": "THU",
      "木曜 / 時間": "20:00",
      "木曜 / 予定": "Games",
      "金曜 / 曜日": "FRI",
      "金曜 / 時間": "22:00",
      "金曜 / 予定": "Collab",
      "土曜 / 曜日": "SAT",
      "土曜 / 時間": "19:00",
      "土曜 / 予定": "Special",
      "日曜 / 曜日": "SUN",
      "日曜 / 時間": "21:00",
      "日曜 / 予定": "Recap"
    },
    x_announcement: {
      "テキスト 4（ラベル）": "X POST",
      "テキスト 1（見出し）": "Today's Notice",
      "テキスト 3（サブ）": "Stream updates",
      "テキスト 2（時刻）": "05.06 WED"
    }
  }
};

const thumbnailPresetTextLayerVisualAdjustments: Record<
  Locale,
  Partial<Record<ThumbnailPresetId, Record<string, ThumbnailPresetTextLayerVisualAdjustment>>>
> = {
  ja: {},
  en: {
    stream_announce: {
      "テキスト 1（見出し）": { x: 116.33322030449972, y: 145.33348404014833 }
    },
    first_stream: {
      "テキスト 1（見出し）": { x: 106.72245769895892, y: 175.77737589293787 },
      "テキスト 2（時刻）": { x: 140.83330507612487, y: 528.3343882810381 },
      "テキスト 3（サブ）": { x: 86.83313553287445, y: 608.3884618862465 }
    },
    anniversary_stream: {
      "テキスト 1（見出し）": { x: 73.66627106574896, y: 214.6669680802966, align: "center" },
      "テキスト 3（サブ）": { x: 103.55559323183354, y: 477.77737589293787 },
      "テキスト 2（時刻）": { x: 276.61110169204164, y: 588.3889140066914 }
    },
    endurance_stream: {
      "テキスト 4（ラベル）": { x: 733.555762775084, y: 116.05452572565329 },
      "テキスト 1（見出し）": { x: 61.222203384083286, y: 182.72194592639477, fontSize: 140 },
      "テキスト 5（目標）": { x: 180.94449153979178, y: 522.0567863278777 },
      "テキスト 3（サブ）": { x: 50.944152453290826, y: 655.3348404014829 },
      "テキスト 2（時刻）": { x: 107.66677969550031, y: 106.38891400669138 }
    },
    project_stream: {
      "テキスト 5（英字）": { x: 70.72194906920748, y: 43.83235373903608 },
      "テキスト 1（見出し）": { x: 152.27771184429145, y: 91.05362148476354 },
      "テキスト 3（サブ）": { x: 169.72228815570855, y: 497.0004521204449 }
    },
    cover_song_notice: {
      "テキスト 4（ラベル）": { x: 258.3120469977875 },
      "テキスト 1（見出し）": { x: 18.186999313344018, y: 241.06307222787393 }
    },
    event_notice: {
      "テキスト 1（見出し）": { x: 35.03487466588092, y: 157.82750879293576 }
    },
    goods_notice: {
      "テキスト 1（見出し）": { fontSize: 104 }
    },
    membership_stream: {
      "テキスト 1（見出し）": { x: 54, y: 190, fontSize: 92 },
      "テキスト 4（補足）": { fontSize: 24 }
    },
    asmr_stream: {
      "テキスト 1（見出し）": { x: 51.061464187204706, y: 301.5199753987606, height: 150, fontSize: 82 },
      "テキスト 4（補足）": { fontSize: 27 }
    },
    privacy_notice: {
      "テキスト 1（見出し）": { x: 109.55168059267987, y: 193.6542692509167 }
    },
    clip: {
      "テキスト 4（ラベル）": { x: 174.93151348052112, y: 138.8275087929357 },
      "テキスト 1（見出し）": { x: 605.6550417780398 },
      "テキスト 2（時刻）": { x: 853.3798328878412, y: 282.310035171743 }
    },
    announcement: {
      "テキスト 1（見出し）": { x: 264.34495822196027, y: 270.0698944847714 }
    },
    karaoke: {
      "テキスト 1（見出し）": { x: 181.62079851830015, y: 119.27508792935723, fontSize: 166 },
      "テキスト 5（見出し英字）": { x: 67.93088207437961, y: 464.89740327770704 },
      "テキスト 2（時刻）": { x: 236.0691179256204, y: 555.0349472423857 },
      "テキスト 3（サブ）": { x: 52.37920148169968, y: 650.241637356881 }
    }
  }
};

const thumbnailPresetLayerVisualAdjustments: Record<
  Locale,
  Partial<Record<ThumbnailPresetId, Record<string, ThumbnailPresetLayerVisualAdjustment>>>
> = {
  ja: {},
  en: {
    membership_stream: {
      "画像 7（補足パネル）": { x: 304, y: 567, width: 361.2822895120545, height: 123.29026132561717 },
      "図形 3（見出し下ライン）": { x: 59.16652538062459, y: 392.66787232118634 }
    }
  }
};

const materialNameTranslationsEn: Record<string, string> = {
  シアンラベル土台: "Cyan Label Plate",
  紺金日付バッジ: "Navy Gold Date Badge",
  週範囲バッジ: "Week Range Badge",
  金角飾り: "Gold Corner Ornament",
  控えめ金グリント: "Soft Gold Glint",
  HUD角フレーム: "Green HUD Corner Frame",
  予定表アクセント: "Cyan Schedule Accent",
  薄い複数枠ガイド: "Soft Multi-Guide Glow",
  シアンHUD区切り: "Cyan HUD Divider",
  動画コメント枠: "Blue Video Comment Frame",
  紺シアン横長プレート: "Navy Cyan Tech Plate",
  白青ガラスラベル: "White Blue Glass Label",
  金縁タイトル台座: "Champagne Title Plaque",
  斜めカットリボン: "Diagonal Cut Ribbon",
  マゼンタ丸バッジ: "Magenta Round Badge",
  琥珀時刻ピル: "Amber Time Pill",
  ミント通知タグ: "Mint Notice Tag",
  シアン六角バッジ: "Cyan Hex Tech Badge",
  青縁スモークパネル: "Blue Rim Smoke Panel",
  白紺情報パネル: "Off-White Navy Info Panel",
  細金テック枠: "Thin Gold Tech Frame",
  透けコメントパネル: "Translucent Comment Panel",
  低彩度予定パネル: "Muted Schedule Panel",
  細シアンHUDライン: "Thin Cyan HUD Line",
  白点線セパレーター: "Soft White Dotted Divider",
  ティールL字ガイド: "Muted Teal L Guide",
  淡シアン分割下線: "Pale Cyan Segmented Underline",
  紺白テクニカル罫線: "Navy White Technical Rule",
  薄金グリント: "Warm Gold Glint",
  白小粒スパークル: "Soft White Sparkles",
  淡シアン斜光: "Pale Cyan Diagonal Streak",
  青グロー光だまり: "Blue Glow Wash",
  ローズ金斜め破片: "Rose Gold Shard",
  紺シアン小シェブロン: "Navy Cyan Chevron",
  白チャコール斜めタブ: "White Charcoal Diagonal Tab",
  小金具グリント角: "Champagne Glint Bracket",
  シアン矢印アクセント: "Cyan Arrow Accent",
  黄黒衝撃マーク: "Yellow Black Impact Burst",
  白シアンスピード線: "White Cyan Speed Lines",
  白黒集中線: "Monochrome Focus Lines",
  白黒フチ強調土台: "White Black Pop Base",
  青雲ラベル: "Blue Cloud Label",
  ミントきらきら: "Mint Sparkles",
  黄桃リボン: "Yellow Pink Ribbon"
};

const standeePlacementCopy: Record<
  Locale,
  Partial<Record<ThumbnailStandeePlacementPresetId, { name: string; description: string }>>
> = {
  ja: {},
  en: {
    "solo-right-half": { name: "Right / half body", description: "Basic right-side placement for a half-body standee." },
    "solo-left-half": { name: "Left / half body", description: "Basic left-side placement for a half-body standee." },
    "solo-center-half": { name: "Center / half body", description: "Basic center placement for a half-body standee." },
    "solo-right-bust": { name: "Right / bust", description: "A larger right-side bust-up placement." },
    "solo-center-face": { name: "Center / face close-up", description: "A large center placement cropped closer to the face." },
    "duo-left": { name: "Duo / left", description: "Left slot for a two-person collab layout." },
    "duo-right": { name: "Duo / right", description: "Right slot for a two-person collab layout." },
    "trio-left": { name: "Trio / left", description: "Left slot for a three-person collab layout." },
    "trio-center": { name: "Trio / center", description: "Center slot for a three-person collab layout." },
    "trio-right": { name: "Trio / right", description: "Right slot for a three-person collab layout." }
  }
};

const standeeGroupLabels = {
  ja: { "1人": "1人", "2人": "2人", "3人": "3人" },
  en: { "1人": "1 person", "2人": "2 people", "3人": "3 people" }
} as const;

const fontLanguageLabels: Record<Locale, Record<ThumbnailFontLanguage, string>> = {
  ja: { ja: "日本語", en: "English" },
  en: { ja: "Japanese", en: "English" }
};

const fontCategoryLabels: Record<Locale, Partial<Record<string, string>>> = {
  ja: {},
  en: {
    "太字見出し / 汎用": "Bold headline / general",
    "読みやすいゴシック": "Readable gothic",
    "かわいい / 丸ゴ": "Cute / rounded",
    "上品 / 和風": "Elegant / Japanese",
    "上品 / レトロ": "Elegant / retro",
    "手書き / ラフ": "Handwritten / rough",
    "手書き / ポップ": "Handwritten / pop",
    "レトロ / ポップ": "Retro / pop",
    "レトロ / ピクセル": "Retro / pixel"
  }
};

const fontMoodLabels: Record<Locale, Partial<Record<string, string>>> = {
  ja: {},
  en: {
    "太字見出し、読みやすいゴシック": "Bold headline, readable gothic",
    "ポップ、現代的、太字向き": "Pop, modern, suited for bold text",
    "読みやすい、実用、情報整理": "Readable, practical, good for organized information",
    "すっきり、上品、配信告知向き": "Clean, elegant, suited for stream announcements",
    "かわいい、やわらかい、親しみ": "Cute, soft, friendly",
    "やさしい、丸い、軽い": "Gentle, rounded, light",
    "上品、和風、落ち着き": "Elegant, Japanese, calm",
    "ほんのりレトロ、上品、丸み": "Slightly retro, elegant, rounded",
    "手書き、ゆるい、親近感": "Handwritten, relaxed, approachable",
    "手書き、かわいい、個性強め": "Handwritten, cute, distinctive",
    "レトロ、元気、ポップ": "Retro, energetic, pop",
    "ピクセル、ゲーム風、レトロ": "Pixel, game-like, retro",
    "太字、圧縮、インパクト": "Bold, condensed, high impact",
    "スタイリッシュ、縦長、サムネ向き": "Stylish, tall, good for thumbnails",
    "読みやすい、配信 UI、凝縮": "Readable, stream UI, condensed",
    "モダン、安定、読みやすい": "Modern, stable, readable",
    "丸み、現代的、親しみ": "Rounded, modern, friendly",
    "丸い、軽快、読みやすい": "Rounded, lively, readable",
    "かわいい、丸い、ポップ": "Cute, rounded, pop",
    "コミック、派手、強い": "Comic, flashy, strong",
    "上品、クラシック、ファッション寄り": "Elegant, classic, fashion-oriented",
    "手書き、華やか、親しみ": "Handwritten, expressive, friendly",
    "近未来、テック、ゲーム風": "Futuristic, tech, game-like",
    "ピクセル、ゲーム、強い個性": "Pixel, game, distinctive"
  }
};

const mainTextCarryoverLabels: Record<Locale, Record<ThumbnailMainTextCarryoverKey, string>> = {
  ja: { headline: "見出し", time: "時刻", sub: "サブ", label: "ラベル" },
  en: { headline: "Headline", time: "Time", sub: "Sub text", label: "Label" }
};

const layerTokenLabels: Record<Locale, Record<string, string>> = {
  ja: {},
  en: {
    テキスト: "Text",
    画像: "Image",
    図形: "Shape",
    素材: "Asset",
    見出し: "Headline",
    時刻: "Time",
    サブ: "Sub text",
    ラベル: "Label",
    英字: "English text",
    目標: "Goal",
    背景: "Background",
    タイトル: "Title",
    "タイトル 歌枠": "Karaoke title",
    "タイトル 闇ガチャ": "Dark gacha title",
    "タイトル 雑談": "Chatting title",
    "タイトル 耐久": "Endurance title",
    曜日: "Day",
    時間: "Time",
    予定: "Schedule",
    上部ソフトライト: "Top soft light",
    上部やわらかライト: "Top soft light",
    上部ライトアウトライン: "Top light outline",
    上部チャレンジライト: "Top challenge light",
    立ち絵挿入ガイド: "Standee guide",
    左立ち絵ガイド: "Left standee guide",
    右立ち絵ガイド: "Right standee guide",
    右立ち絵枠の発光: "Right standee frame glow",
    見出し下ライン: "Headline underline",
    見出し下線: "Headline underline",
    見出し下スイープ: "Headline sweep",
    見出しカード: "Headline card",
    見出しステッカー土台: "Headline sticker base",
    見出し左下アクセント: "Lower-left headline accent",
    見出し右アクセント: "Right headline accent",
    見出し左矢印アクセント: "Left headline arrow accent",
    見出し英字: "English headline",
    ラベル横ライン: "Label side line",
    ラベル土台: "Label base",
    ラベル用角マーク: "Label corner mark",
    右下角マーク: "Lower-right corner mark",
    小粒スパーク: "Small sparkles",
    小粒きらめき: "Small sparkles",
    小さな破片候補: "Small shard accents",
    時刻バッジ土台: "Time badge base",
    時刻カード土台: "Time card base",
    時刻カードタブ: "Time card tab",
    時刻ピル土台: "Time pill base",
    時刻ラベル土台: "Time label base",
    時刻アイコン: "Time icon",
    時刻下ライン: "Time underline",
    サブ下ライン: "Sub underline",
    サブ情報カード: "Sub info card",
    サブ用キューカード: "Sub cue card",
    予定表アクセント: "Schedule table accent",
    控えめな角グリント: "Subtle corner glints",
    控えめな金色グリント: "Subtle gold glints",
    控えめな青金グリント: "Subtle blue-gold glints",
    週範囲バッジ土台: "Week range badge base",
    立ち絵guide枠: "Standee guide frame",
    立ち絵guideのHUD角: "Standee guide HUD corner",
    本文カード: "Body card",
    本文罫線: "Body rule",
    日付バッジ: "Date badge",
    日付チケットバッジ: "Date ticket badge",
    角飾り: "Corner ornament",
    左上金飾り: "Upper-left gold ornament",
    右下金飾り: "Lower-right gold ornament",
    記念バッジ: "Anniversary badge",
    金ローズきらめき: "Gold rose sparkles",
    金色音符: "Gold music notes",
    ピンク音符: "Pink music notes",
    ピンク三角アクセント: "Pink triangle accent",
    右側きらめき: "Right sparkle",
    右上きらめき: "Upper-right sparkle",
    左上きらめき: "Upper-left sparkle",
    左上リボン: "Upper-left ribbon",
    右下リボン: "Lower-right ribbon",
    右上フレーム角: "Upper-right frame corner",
    右下フレーム角: "Lower-right frame corner",
    左上フレーム角: "Upper-left frame corner",
    左下フレーム角: "Lower-left frame corner",
    稲妻アクセント大: "Large lightning accent",
    稲妻アクセント小: "Small lightning accent",
    右側シェブロン: "Right chevrons",
    右側レールアクセント: "Right rail accent",
    右側区切り線: "Right divider",
    右上矢印アクセント: "Upper-right arrow accent",
    矢印アクセント: "Arrow accent",
    カード区切りライン: "Card divider",
    参加ラベル用カード: "Participant label card",
    参加情報バンド: "Participant info band",
    左カードタブ: "Left card tab",
    カバーアート挿入ガイド: "Cover art guide",
    カバーアート枠: "Cover art frame",
    カバーアート注記: "Cover art note",
    サウンドウェーブ: "Sound wave",
    プレミアバッジ土台: "Premiere badge base",
    情報区切りライン: "Info divider",
    キービジュアル挿入ガイド: "Key visual guide",
    キービジュアル枠: "Key visual frame",
    キービジュアル注記: "Key visual note",
    商品カード1: "Product card 1",
    商品カード2: "Product card 2",
    商品カード3: "Product card 3",
    商品カード1ガイド: "Product card 1 guide",
    商品カード2ガイド: "Product card 2 guide",
    商品カード3ガイド: "Product card 3 guide",
    商品1: "Product 1",
    商品2: "Product 2",
    商品3: "Product 3",
    価格1: "Price 1",
    価格2: "Price 2",
    価格3: "Price 3",
    価格バッジ1: "Price badge 1",
    価格バッジ2: "Price badge 2",
    価格バッジ3: "Price badge 3",
    発売バッジ: "Release badge",
    時刻ピル: "Time pill",
    販売CTA: "Shop CTA",
    CTA: "CTA",
    注意書きパネル: "Notice panel",
    補足: "Note",
    メンバーバッジ: "Member badge",
    ロックバッジ: "Lock badge",
    プレミアムラベル: "Premium label",
    限定CTA: "Members-only CTA",
    補足パネル: "Note panel",
    限定公開フレーム: "Limited access frame",
    会員ラベル: "Member label",
    バッジ: "Badge",
    マイクシルエット: "Mic silhouette",
    サウンドリング: "Sound ring",
    低彩度ラベル: "Muted label",
    プライバシーロックバッジ: "Privacy lock badge",
    プライバシー目隠しパネル: "Privacy mask panel",
    プライバシー目隠しバー: "Privacy mask bar",
    白板面: "Whiteboard surface",
    全体トーン: "Overall tone",
    マップラインディバイダー: "Map line divider",
    やわらかい光粒: "Soft glow dots",
    やわらかい下線: "Soft underline",
    動画フレーム: "Video frame",
    衝撃マーク: "Impact mark",
    左下補助ライン: "Lower-left support line",
    ゲーム感ライン: "Game-style line",
    スピードアクセント: "Speed accent",
    接続アクセント: "Connection accent",
    二人配置ライン: "Two-person placement line",
    目標バッジ土台: "Goal badge base",
    進捗ディバイダー: "Progress divider",
    コピー: "Copy",
    削除済み: "Deleted",
    差し替え待ち: "Needs replacement",
    読み込み失敗: "Load failed",
    月曜: "Monday",
    火曜: "Tuesday",
    水曜: "Wednesday",
    木曜: "Thursday",
    金曜: "Friday",
    土曜: "Saturday",
    日曜: "Sunday"
  }
};

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

export function getThumbnailPresetTextLayerBody(
  presetId: ThumbnailPresetId,
  layerName: string,
  locale: Locale,
  fallback: string
): string {
  if (locale === "ja") {
    return fallback;
  }

  return thumbnailPresetTextBodyCopy[locale][presetId]?.[layerName] ?? fallback;
}

export function getThumbnailPresetTextLayerVisualAdjustment(
  presetId: ThumbnailPresetId,
  layerName: string,
  locale: Locale
): ThumbnailPresetTextLayerVisualAdjustment | null {
  if (locale === "ja") {
    return null;
  }

  return thumbnailPresetTextLayerVisualAdjustments[locale][presetId]?.[layerName] ?? null;
}

export function getThumbnailPresetLayerVisualAdjustment(
  presetId: ThumbnailPresetId,
  layerName: string,
  locale: Locale
): ThumbnailPresetLayerVisualAdjustment | null {
  if (locale === "ja") {
    return null;
  }

  return thumbnailPresetLayerVisualAdjustments[locale][presetId]?.[layerName] ?? null;
}

export function localizeThumbnailPresetTextLayerBodies(
  draft: ThumbnailEditorDraft,
  locale: Locale
): ThumbnailEditorDraft {
  if (locale === "ja") {
    return draft;
  }

  const applyVisualAdjustments = !isThumbnailIriamSquareDraft(draft);
  const localizeLayerNames = isThumbnailIriamSquareDraft(draft);
  return {
    ...draft,
    layers: draft.layers.map((layer) => {
      const layerVisualAdjustment = applyVisualAdjustments ? getThumbnailPresetLayerVisualAdjustment(draft.presetId, layer.name, locale) : null;
      const adjustedLayer = layerVisualAdjustment ? { ...layer, ...layerVisualAdjustment } : layer;
      const localizedName = localizeLayerNames ? getThumbnailLayerDisplayName(adjustedLayer, locale) : adjustedLayer.name;
      if (adjustedLayer.type !== "text") {
        return {
          ...adjustedLayer,
          name: localizedName
        };
      }

      const visualAdjustment = applyVisualAdjustments ? getThumbnailPresetTextLayerVisualAdjustment(draft.presetId, adjustedLayer.name, locale) : null;
      return {
        ...adjustedLayer,
        ...visualAdjustment,
        name: localizedName,
        text: getThumbnailPresetTextLayerBody(draft.presetId, adjustedLayer.name, locale, adjustedLayer.text)
      };
    })
  };
}

export function getThumbnailPresetCategoryLabel(category: ThumbnailPresetCategory, locale: Locale): string {
  return categoryLabels[locale][category] ?? categoryLabels.ja[category];
}

export function getThumbnailPresetUsageLabel(usageLabel: string, locale: Locale): string {
  const localizedUsageLabels: Partial<Record<string, string>> = usageLabels[locale];
  return localizedUsageLabels[usageLabel] ?? usageLabel;
}

export function getThumbnailMaterialCategoryLabel(category: ThumbnailMaterialCategory, locale: Locale): string {
  return materialCategoryLabels[locale][category] ?? materialCategoryLabels.ja[category];
}

export function getThumbnailMaterialName(materialId: string, locale: Locale, fallback = materialId): string {
  return materialCopy[locale][materialId]?.name ?? fallback;
}

export function getThumbnailMaterialDescription(
  material: Pick<ThumbnailMaterial, "id" | "description">,
  locale: Locale
): string {
  return materialCopy[locale][material.id]?.description ?? material.description;
}

export function getThumbnailMaterialRecommendedPlacement(
  material: Pick<ThumbnailMaterial, "id" | "recommendedPlacement">,
  locale: Locale
): string {
  return materialCopy[locale][material.id]?.recommendedPlacement ?? material.recommendedPlacement;
}

export function filterLocalizedThumbnailMaterials<T extends ThumbnailMaterial>(
  materials: T[],
  query: string,
  category: ThumbnailMaterialCategory | "all",
  locale: Locale
): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase(locale === "ja" ? "ja-JP" : "en-US");

  return materials.filter((material) => {
    if (category !== "all" && material.category !== category) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    return [
      material.name,
      material.description,
      material.recommendedPlacement,
      material.category,
      getThumbnailMaterialName(material.id, locale, material.name),
      getThumbnailMaterialDescription(material, locale),
      getThumbnailMaterialRecommendedPlacement(material, locale),
      getThumbnailMaterialCategoryLabel(material.category, locale)
    ]
      .join(" ")
      .toLocaleLowerCase(locale === "ja" ? "ja-JP" : "en-US")
      .includes(normalizedQuery);
  });
}

export function getThumbnailStandeePlacementName(
  presetId: string,
  locale: Locale,
  fallback = presetId
): string {
  return standeePlacementCopy[locale][presetId as ThumbnailStandeePlacementPresetId]?.name ?? fallback;
}

export function getThumbnailStandeePlacementDescription(
  preset: Pick<ThumbnailStandeePlacementPreset, "id" | "description">,
  locale: Locale
): string {
  return standeePlacementCopy[locale][preset.id]?.description ?? preset.description;
}

export function getThumbnailStandeePlacementGroup(group: "1人" | "2人" | "3人", locale: Locale): string {
  return standeeGroupLabels[locale][group] ?? standeeGroupLabels.ja[group];
}

export function getThumbnailFontLanguageLabel(language: ThumbnailFontLanguage, locale: Locale): string {
  return fontLanguageLabels[locale][language] ?? fontLanguageLabels.ja[language];
}

export function getThumbnailFontCategoryLabel(category: string, locale: Locale): string {
  return fontCategoryLabels[locale][category] ?? category;
}

export function getThumbnailFontMoodLabel(mood: string, locale: Locale): string {
  return fontMoodLabels[locale][mood] ?? mood;
}

export function getThumbnailMainTextCarryoverLabel(targetId: ThumbnailMainTextCarryoverKey, locale: Locale): string {
  return mainTextCarryoverLabels[locale][targetId] ?? mainTextCarryoverLabels.ja[targetId];
}

function localizeLayerToken(value: string, locale: Locale): string {
  if (locale === "ja") {
    return value;
  }

  return layerTokenLabels.en[value] ?? value;
}

function localizeCompositeLayerToken(value: string, locale: Locale): string {
  if (locale === "ja" || !value.includes(" / ")) {
    return value;
  }

  const parts = value.split(" / ");
  if (parts.every((part) => layerTokenLabels.en[part])) {
    return parts.map((part) => localizeLayerToken(part, locale)).join(" / ");
  }

  return value;
}

export function getThumbnailLayerDisplayName(
  layer: Pick<ThumbnailLayer, "name" | "type">,
  locale: Locale,
  displayName = layer.name
): string {
  if (locale === "ja") {
    return displayName;
  }

  const materialPrefixMatch = displayName.match(/^素材: (.+?)(?:（(.+)）)?$/);
  if (materialPrefixMatch) {
    const fallbackMaterialName = materialNameTranslationsEn[materialPrefixMatch[1]] ?? materialPrefixMatch[1];
    const fallbackStatus = materialPrefixMatch[2] ? ` (${localizeLayerToken(materialPrefixMatch[2], locale)})` : "";
    return `Asset: ${fallbackMaterialName}${fallbackStatus}`;
  }

  if (layerTokenLabels.en[displayName]) {
    return localizeLayerToken(displayName, locale);
  }

  const compositeToken = localizeCompositeLayerToken(displayName, locale);
  if (compositeToken !== displayName) {
    return compositeToken;
  }

  const presetLayerMatch = displayName.match(/^(テキスト|画像|図形) (\d+)(?:（(.+)）)?(?: (コピー)(?: (\d+))?)?$/);
  if (!presetLayerMatch) {
    return displayName;
  }

  const [, kind, index, role, copySuffix, copyIndex] = presetLayerMatch;
  const localizedKind = localizeLayerToken(kind, locale);
  const localizedRole = role ? ` (${localizeLayerToken(role, locale)})` : "";
  const localizedCopy = copySuffix ? ` ${localizeLayerToken(copySuffix, locale)}${copyIndex ? ` ${copyIndex}` : ""}` : "";
  return `${localizedKind} ${index}${localizedRole}${localizedCopy}`;
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
