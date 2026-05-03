import {
  createSnsSplitDraft,
  normalizeSnsSplitDraft,
  snsSplitDraftStorageKey,
  type SnsSplitDraft,
  type SnsSplitImageSource
} from "@/lib/sns-split-image-maker";

const allowedImageMimeTypes = new Set(["image/png", "image/jpeg"]);
const allowedImageExtensions = new Set(["png", "jpg", "jpeg"]);
const imageUploadMaxBytes = 12 * 1024 * 1024;
const snsSplitImageDbName = "v-streamer-tools:sns-split-image-maker";
const snsSplitImageStoreName = "images";

export type RestoreDraftResult = {
  draft: SnsSplitDraft;
  restoredFromStorage: boolean;
  restoredStoredImages: boolean;
  invalidStoredDraft: boolean;
  brokenStoredDraft: boolean;
  imageRestoreFailed: boolean;
};

const isValidImageFile = (file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return allowedImageMimeTypes.has(file.type) && allowedImageExtensions.has(extension);
};

const stripDraftImageSources = (draft: SnsSplitDraft): SnsSplitDraft => ({
  ...draft,
  images: draft.images.map((image) => ({ ...image, src: null }))
});

const mergeStoredImageSources = (draft: SnsSplitDraft, imageSources: Map<string, string>): SnsSplitDraft => ({
  ...draft,
  images: draft.images.map((image) => ({ ...image, src: imageSources.get(image.id) ?? image.src }))
});

const openImageDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(snsSplitImageDbName, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(snsSplitImageStoreName)) {
        database.createObjectStore(snsSplitImageStoreName, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("画像保存領域を開けませんでした。"));
  });

export const readStoredImageSources = async () => {
  const database = await openImageDatabase();
  return new Promise<Map<string, string>>((resolve, reject) => {
    const transaction = database.transaction(snsSplitImageStoreName, "readonly");
    const request = transaction.objectStore(snsSplitImageStoreName).getAll();
    request.onsuccess = () => {
      const sources = new Map<string, string>();
      (request.result as Array<{ id?: unknown; src?: unknown }>).forEach((entry) => {
        if (typeof entry.id === "string" && typeof entry.src === "string") {
          sources.set(entry.id, entry.src);
        }
      });
      resolve(sources);
    };
    request.onerror = () => reject(request.error ?? new Error("保存済み画像を読み込めませんでした。"));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("保存済み画像を読み込めませんでした。"));
    };
  });
};

export const writeStoredImageSource = async (id: SnsSplitImageSource["id"], src: string | null) => {
  const database = await openImageDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(snsSplitImageStoreName, "readwrite");
    const store = transaction.objectStore(snsSplitImageStoreName);
    if (src) {
      store.put({ id, src, updatedAt: new Date().toISOString() });
    } else {
      store.delete(id);
    }
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("画像を保存できませんでした。"));
    };
  });
};

export const writeStoredImageSources = (images: SnsSplitImageSource[]) =>
  Promise.all(images.map((image) => writeStoredImageSource(image.id, image.src))).then(() => undefined);

export const persistDraftMetadata = (draft: SnsSplitDraft) => {
  const normalized = normalizeSnsSplitDraft({ ...stripDraftImageSources(draft), updatedAt: new Date().toISOString() });
  if (!normalized) {
    throw new Error("下書き保存用のデータを正規化できませんでした。");
  }
  localStorage.setItem(snsSplitDraftStorageKey, JSON.stringify(normalized));
};

export const restoreDraft = async (): Promise<RestoreDraftResult> => {
  let restoredDraft = createSnsSplitDraft();
  let restoredFromStorage = false;
  let invalidStoredDraft = false;
  let brokenStoredDraft = false;
  let restoredStoredImages = false;
  let imageRestoreFailed = false;

  try {
    const raw = localStorage.getItem(snsSplitDraftStorageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      const normalized = normalizeSnsSplitDraft(parsed);
      if (!normalized) {
        localStorage.removeItem(snsSplitDraftStorageKey);
        invalidStoredDraft = true;
      } else {
        restoredDraft = normalized;
        restoredFromStorage = true;
      }
    }
  } catch {
    localStorage.removeItem(snsSplitDraftStorageKey);
    brokenStoredDraft = true;
  }

  try {
    const legacySources = restoredDraft.images.filter((image) => image.src);
    if (legacySources.length > 0) {
      await writeStoredImageSources(legacySources);
      restoredDraft = stripDraftImageSources(restoredDraft);
    }
    const storedSources = await readStoredImageSources();
    restoredStoredImages = storedSources.size > 0;
    restoredDraft = mergeStoredImageSources(restoredDraft, storedSources);
  } catch {
    imageRestoreFailed = true;
  }

  return {
    draft: restoredDraft,
    restoredFromStorage,
    restoredStoredImages,
    invalidStoredDraft,
    brokenStoredDraft,
    imageRestoreFailed
  };
};

export const readImageFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    if (!isValidImageFile(file)) {
      reject(new Error("PNGまたはJPEG画像を選択してください。"));
      return;
    }
    if (file.size > imageUploadMaxBytes) {
      reject(new Error("画像は12MB以下にしてください。"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("画像を読み込めませんでした。")));
    reader.onerror = () => reject(new Error("画像を読み込めませんでした。"));
    reader.readAsDataURL(file);
  });
