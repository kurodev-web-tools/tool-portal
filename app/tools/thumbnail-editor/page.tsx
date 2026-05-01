import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { ThumbnailEditorApp } from "@/components/thumbnail-editor/ThumbnailEditorApp";

export const metadata: Metadata = {
  title: "Thumbnail Editor",
  description: "画像、テキスト、図形レイヤーを手動編集して16:9サムネイルを作成できるV Streamer Toolsのツールです。"
};

export default function ThumbnailEditorPage() {
  return (
    <PortalShell mode="workspace">
      <ThumbnailEditorApp />
    </PortalShell>
  );
}
