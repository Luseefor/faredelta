import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignupSsoCallbackPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f6f3ec] px-5 text-[#102a2f]">
      <p className="text-sm text-[#102f35]/55">Finishing sign in…</p>
      <AuthenticateWithRedirectCallback
        signUpForceRedirectUrl="/tracked"
        signUpFallbackRedirectUrl="/tracked"
        signInForceRedirectUrl="/tracked"
        signInFallbackRedirectUrl="/tracked"
      />
    </main>
  );
}
