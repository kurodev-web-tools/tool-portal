import type { Metadata } from "next";
import { PortalHome } from "@/components/portal/PortalHome";
import { PortalShell } from "@/components/portal/PortalShell";

export const metadata: Metadata = {
  title: "Home",
  description: "V Streamer Toolsの公開最小セットへの入口。Tools IndexとSchedule Calendarへ移動できます。"
};

export default function Home() {
  return (
    <PortalShell>
      <PortalHome />
    </PortalShell>
  );
}
