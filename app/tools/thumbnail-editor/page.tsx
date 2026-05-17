import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { ThumbnailEditorApp } from "@/components/thumbnail-editor/ThumbnailEditorApp";

export const metadata: Metadata = {
  title: "Thumbnail Editor",
  description: "用途別プリセットを選び、文字と立ち絵を差し替えてVTuber向けサムネイルを組み立てるKuro Stream Kitのツールです。"
};

export default function ThumbnailEditorPage() {
  return (
    <PortalShell mode="workspace">
      <ThumbnailEditorApp />
    </PortalShell>
  );
}
