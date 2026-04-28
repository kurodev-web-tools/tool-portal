import { PortalShell } from "@/components/portal/PortalShell";
import { ScheduleCalendarApp } from "@/components/schedule-calendar/ScheduleCalendarApp";

export default function ScheduleCalendarPage() {
  return (
    <PortalShell mode="workspace">
      <ScheduleCalendarApp />
    </PortalShell>
  );
}
