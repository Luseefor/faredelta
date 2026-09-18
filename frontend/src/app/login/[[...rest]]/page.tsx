import { SignIn } from "@clerk/nextjs";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#f6f3ec] text-[#102a2f]">
      <SiteHeader />
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b47b16]">Welcome back</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">Sign in.</h1>
        <p className="mt-3 text-center text-sm text-[#102f35]/55">Your tracked routes move with your account — any routes saved in this browser are adopted on sign in.</p>
        <div className="mt-8"><SignIn forceRedirectUrl="/tracked" signUpUrl="/signup" /></div>
      </section>
      <SiteFooter />
    </main>
  );
}
