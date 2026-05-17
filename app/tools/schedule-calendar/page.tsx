import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { ScheduleCalendarApp } from "@/components/schedule-calendar/ScheduleCalendarApp";

export const metadata: Metadata = {
  title: "Schedule Calendar",
  description: "配信予定の追加、編集、確認、バックアップ運用ができるKuro Stream Kitの公開中ツールです。"
};

export default function ScheduleCalendarPage() {
  return (
    <PortalShell mode="workspace">
      <ScheduleCalendarApp />
    </PortalShell>
  );
}
