"use client";

import {
  normalizeThumbnailUserMaterialRefs,
  thumbnailUserMaterialStoragePolicy,
  type ThumbnailUserMaterialRef,
  type ThumbnailUserMaterialMimeType
} from "@/lib/thumbnail-editor";

export const thumbnailUserMaterialRefsStorageKey = "v-streamer-tools:thumbnail-editor:user-material-refs:v1";

const dbName = "v-streamer-tools:thumbnail-editor:user-materials";
const storeName = "images";
const dbVersion = 1;

type StoredUserMaterialImage = {
  storageId: string;
  blob: Blob;
  mimeType: ThumbnailUserMaterialMimeType;
  updatedAt: string;
};

const openThumbnailUserMaterialDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "storageId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDBを開けませんでした。"));
  });

const withUserMaterialStore = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openThumbnailUserMaterialDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = run(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB操作に失敗しました。"));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error("IndexedDB transactionに失敗しました。"));
    };
  });
};

const createUserMaterialId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const sanitizeUserMaterialName = (name: string) => {
  const withoutExtension = name.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension.trim().replace(/\s+/g, " ").slice(0, 32);
  return normalized || "ユーザー素材";
};

export const isThumbnailUserMaterialFile = (file: File) =>
  thumbnailUserMaterialStoragePolicy.supportedMimeTypes.includes(file.type as ThumbnailUserMaterialMimeType);

export const readThumbnailUserMaterialRefsMetadata = () => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const saved = window.localStorage.getItem(thumbnailUserMaterialRefsStorageKey);
    return normalizeThumbnailUserMaterialRefs(saved ? JSON.parse(saved) : []);
  } catch {
    window.localStorage.removeItem(thumbnailUserMaterialRefsStorageKey);
    return [];
  }
};

export const writeThumbnailUserMaterialRefsMetadata = (refs: ThumbnailUserMaterialRef[]) => {
  if (typeof window === "undefined") {
    return;
  }
  const metadata = normalizeThumbnailUserMaterialRefs(refs);
  window.localStorage.setItem(thumbnailUserMaterialRefsStorageKey, JSON.stringify(metadata));
};

export const saveThumbnailUserMaterialFile = async (file: File, existingRef?: ThumbnailUserMaterialRef) => {
  if (!isThumbnailUserMaterialFile(file)) {
    throw new Error("PNG/JPEG/WebP/SVG画像ファイルを選択してください。");
  }

  const now = new Date().toISOString();
  const ref: ThumbnailUserMaterialRef = {
    id: existingRef?.id ?? createUserMaterialId(),
    name: sanitizeUserMaterialName(file.name),
    storageId: existingRef?.storageId ?? `thumbnail-user-material:${createUserMaterialId()}`,
    storage: "indexeddb",
    mimeType: file.type as ThumbnailUserMaterialMimeType,
    byteSize: file.size,
    createdAt: existingRef?.createdAt ?? now,
    updatedAt: now
  };
  const image = await createImageBitmap(file).catch(() => null);
  if (image) {
    ref.width = image.width;
    ref.height = image.height;
    image.close();
  }

  await withUserMaterialStore("readwrite", (store) =>
    store.put({
      storageId: ref.storageId,
      blob: file,
      mimeType: ref.mimeType,
      updatedAt: now
    } satisfies StoredUserMaterialImage)
  );

  return ref;
};

export const resolveThumbnailUserMaterialImageUrl = async (ref: ThumbnailUserMaterialRef) => {
  const stored = await withUserMaterialStore<StoredUserMaterialImage | undefined>("readonly", (store) => store.get(ref.storageId));
  if (!stored?.blob) {
    return null;
  }
  return URL.createObjectURL(stored.blob);
};

export const deleteThumbnailUserMaterialImage = async (storageId: string) => {
  await withUserMaterialStore("readwrite", (store) => store.delete(storageId));
};
