"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function FacebookAuthRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/";

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (appId) {
      const redirectUri = `${window.location.origin}/auth/facebook/callback`;
      const fbAuthUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
      fbAuthUrl.searchParams.set("client_id", appId);
      fbAuthUrl.searchParams.set("redirect_uri", redirectUri);
      fbAuthUrl.searchParams.set("response_type", "code");
      fbAuthUrl.searchParams.set("scope", "public_profile");
      fbAuthUrl.searchParams.set("state", redirectTarget);
      window.location.href = fbAuthUrl.toString();
    } else {
      router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
    }
  }, [redirectTarget, router]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-3 border-[#1877F2]/20 border-t-[#1877F2] rounded-full animate-spin mx-auto" />
        <p className="text-sm text-zinc-600 font-medium">Connecting to Facebook...</p>
      </div>
    </div>
  );
}

export default function FacebookAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-[#1877F2]/20 border-t-[#1877F2] rounded-full animate-spin" />
        </div>
      }
    >
      <FacebookAuthRedirect />
    </Suspense>
  );
}
