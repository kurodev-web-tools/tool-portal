import { PortalHome } from "@/components/portal/PortalHome";
import { PortalShell } from "@/components/portal/PortalShell";

export default function Home() {
  return (
    <PortalShell>
      <PortalHome />
    </PortalShell>
  );
}
