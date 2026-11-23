"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function GoogleAuthRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/order";

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (clientId) {
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      googleAuthUrl.searchParams.set("client_id", clientId);
      googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
      googleAuthUrl.searchParams.set("response_type", "code");
      googleAuthUrl.searchParams.set("scope", "openid email profile");
      googleAuthUrl.searchParams.set("prompt", "select_account"); // The official Google Account Chooser
      googleAuthUrl.searchParams.set("access_type", "offline");
      googleAuthUrl.searchParams.set("state", redirectTarget);
      window.location.href = googleAuthUrl.toString();
    } else {
      router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
    }
  }, [redirectTarget, router]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4">
      <div className="w-9 h-9 border-3 border-[#173D2B]/20 border-t-[#173D2B] rounded-full animate-spin" />
      <p className="mt-4 text-sm font-serif text-[#173D2B]">Opening Google Account Chooser...</p>
    </div>
  );
}

export default function GoogleAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
          <div className="w-9 h-9 border-3 border-[#173D2B]/20 border-t-[#173D2B] rounded-full animate-spin" />
        </div>
      }
    >
      <GoogleAuthRedirect />
    </Suspense>
  );
}
