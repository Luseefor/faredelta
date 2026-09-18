import { SettingsForm } from "@/components/settings-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata = {
  title: "Settings",
  description: "FareDelta search defaults, stored in your browser.",
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ec] text-[#102a2f]">
      <SiteHeader />
      <section className="border-b border-[#102f35]/10 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b47b16]">Preferences</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Settings.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#102f35]/55">Your watchlist lives in your account; these defaults live in this browser.</p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12"><SettingsForm /></section>
      <SiteFooter />
    </main>
  );
}
