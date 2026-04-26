import Link from "next/link";
import { ThemeToggle } from "@/components/portal/ThemeToggle";

export function PortalHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/92 px-4 backdrop-blur sm:px-8 lg:justify-end">
      <Link href="/" className="flex items-center gap-2 lg:hidden">
        <span className="grid h-8 w-8 place-items-center rounded-base bg-primary text-sm font-black text-white">
          V
        </span>
        <span className="text-base font-bold tracking-tight text-foreground">V Streamer Tools</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}
