import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { ScheduleCalendarApp } from "@/components/schedule-calendar/ScheduleCalendarApp";

export const metadata: Metadata = {
  title: "Schedule Calendar",
  description: "A public Kuro Stream Kit tool for adding, editing, reviewing, backing up, and handing off stream schedules."
};

export default function ScheduleCalendarPage() {
  return (
    <PortalShell mode="workspace">
      <ScheduleCalendarApp />
    </PortalShell>
  );
}
