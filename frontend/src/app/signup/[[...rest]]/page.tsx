import { SignUp } from "@clerk/nextjs";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#f6f3ec] text-[#102a2f]">
      <SiteHeader />
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b47b16]">Track everywhere</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">Create your account.</h1>
        <p className="mt-3 text-center text-sm text-[#102f35]/55">Sync tracked routes across devices and get price alerts by email.</p>
        <div className="mt-8"><SignUp forceRedirectUrl="/tracked" signInUrl="/login" /></div>
      </section>
      <SiteFooter />
    </main>
  );
}
