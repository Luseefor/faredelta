"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Bell, BellRing, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AuthButton({ dark = false }: { dark?: boolean }) {
  return (
    <>
      <Show when="signed-out">
        <span className="flex items-center gap-2">
          <SignInButton forceRedirectUrl="/tracked">
            <Button variant="ghost" size="sm" className={dark ? "text-white/75 hover:bg-white/10 hover:text-white" : undefined}>
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton forceRedirectUrl="/tracked">
            <Button size="sm" className={dark ? "bg-[#f2c94c] text-[#102f35] hover:bg-[#f2c94c]/90" : undefined}>
              Sign up
            </Button>
          </SignUpButton>
        </span>
      </Show>
      <Show when="signed-in">
        <UserButton
          userProfileMode="modal"
          appearance={{
            elements: {
              avatarBox: "size-9 rounded-full ring-2 ring-white/25 transition-shadow hover:ring-[#f2c94c]/80",
              userButtonPopoverCard: "rounded-2xl border border-[#102f35]/10 shadow-xl",
              userButtonPopoverActionButton: "rounded-xl transition-colors",
            },
          }}
        >
          <UserButton.MenuItems>
            <UserButton.Link
              label="Watchlist"
              labelIcon={<Bell className="size-4" />}
              href="/tracked"
            />
            <UserButton.Link
              label="Price alerts"
              labelIcon={<BellRing className="size-4" />}
              href="/alerts"
            />
            <UserButton.Link
              label="Settings"
              labelIcon={<Settings className="size-4" />}
              href="/settings"
            />
          </UserButton.MenuItems>
        </UserButton>
      </Show>
    </>
  );
}
