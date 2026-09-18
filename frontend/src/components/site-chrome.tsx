import Link from "next/link";
import { Bell, BellRing, Plane } from "lucide-react";

import { AuthButton } from "@/components/auth-button";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";

export function SiteHeader({ actions }: { actions?: React.ReactNode }) {
  return (
    <header className="bg-[#102f35] text-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-3" aria-label="FareDelta home">
          <span className="flex size-9 items-center justify-center rounded-full bg-[#f2c94c] text-[#102f35]">
            <Plane className="size-4 -rotate-12" strokeWidth={2.5} aria-hidden />
          </span>
          <span className="text-xl font-semibold tracking-[-0.03em]">FareDelta</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
          <Button asChild variant="ghost" size="sm" className="px-2 text-white/75 hover:bg-white/10 hover:text-white sm:px-3">
            <Link href="/tracked"><Bell className="size-4" /><span className="sr-only sm:not-sr-only">Tracked</span></Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="px-2 text-white/75 hover:bg-white/10 hover:text-white sm:px-3">
            <Link href="/alerts"><BellRing className="size-4" /><span className="sr-only sm:not-sr-only">Alerts</span></Link>
          </Button>
          {actions}
          <NotificationBell dark />
          <AuthButton dark />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[#102f35]/10 bg-[#f6f3ec] text-[#102a2f]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <p className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-full bg-[#102f35] text-[#f2c94c]">
            <Plane className="size-3.5 -rotate-12" aria-hidden />
          </span>
          FareDelta
        </p>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[#102f35]/65" aria-label="Footer">
          <Link href="/" className="transition-colors hover:text-[#102f35]">Search</Link>
          <Link href="/explore" className="transition-colors hover:text-[#102f35]">Explore fares</Link>
          <Link href="/tracked" className="transition-colors hover:text-[#102f35]">Tracked routes</Link>
          <Link href="/alerts" className="transition-colors hover:text-[#102f35]">Price alerts</Link>
          <Link href="/settings" className="transition-colors hover:text-[#102f35]">Settings</Link>
        </nav>
        <p className="text-xs text-[#102f35]/50">Observed fares, not booking guarantees.</p>
      </div>
    </footer>
  );
}
