"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export function AuthButton({ dark = false }: { dark?: boolean }) {
  return (
    <>
      <Show when="signed-out">
        <span className="flex items-center gap-2">
          <SignInButton mode="modal" forceRedirectUrl="/tracked">
            <Button variant="ghost" size="sm" className={dark ? "text-white/75 hover:bg-white/10 hover:text-white" : undefined}>
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal" forceRedirectUrl="/tracked">
            <Button size="sm" className={dark ? "bg-[#f2c94c] text-[#102f35] hover:bg-[#f2c94c]/90" : undefined}>
              Sign up
            </Button>
          </SignUpButton>
        </span>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  );
}
