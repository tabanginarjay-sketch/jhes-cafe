"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, Coffee, CheckCircle2 } from "lucide-react";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithGoogleCode } = useAuth();

  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    const targetUrl = state ? decodeURIComponent(state) : "/order";

    if (error) {
      setStatus("error");
      if (error === "access_denied") {
        setErrorMessage("Google account selection was canceled.");
      } else {
        setErrorMessage(errorDescription || `Google authentication error: ${error}`);
      }
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMessage("No authorization code received from Google. Please try signing in again.");
      return;
    }

    const validCode = code;
    let isMounted = true;

    async function handleExchange() {
      try {
        const redirectUri = `${window.location.origin}/auth/google/callback`;
        await loginWithGoogleCode(validCode, redirectUri);
        if (!isMounted) return;
        setStatus("success");
        setTimeout(() => {
          router.push(targetUrl);
        }, 600);
      } catch (err) {
        if (!isMounted) return;
        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to authenticate your Google account with Jhe's Cafe'."
        );
      }
    }

    void handleExchange();

    return () => {
      isMounted = false;
    };
  }, [loginWithGoogleCode, router, searchParams]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 selection:bg-[#173D2B] selection:text-white">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#EBE3D5] p-8 sm:p-10 shadow-sm text-center">
        {/* Top Logo / Coffee Emblem */}
        <div className="w-16 h-16 rounded-2xl bg-[#173D2B] mx-auto flex items-center justify-center text-[#E5D7B7] shadow-sm mb-6">
          <Coffee className="w-8 h-8" />
        </div>

        {status === "processing" && (
          <div className="space-y-4 animate-in fade-in">
            <h1 className="text-2xl font-serif text-[#173D2B] font-bold">
              Connecting Your Account
            </h1>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Verifying your Google session and preparing your Jhe&apos;s Cafe&apos; membership...
            </p>
            <div className="pt-4 flex justify-center">
              <div className="w-9 h-9 border-3 border-[#173D2B]/20 border-t-[#173D2B] rounded-full animate-spin" />
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-serif text-[#173D2B] font-bold">
              Welcome to Jhe&apos;s Cafe&apos;
            </h1>
            <p className="text-sm text-zinc-600">
              Your Google account is verified. Redirecting you now...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-serif text-red-800 font-bold">
              Sign-In Failed
            </h1>
            <p className="text-sm text-red-700 bg-red-50 p-3.5 rounded-xl border border-red-200">
              {errorMessage}
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-block w-full py-3 px-4 rounded-xl bg-[#173D2B] hover:bg-[#123122] text-[#FDFBF7] font-medium text-sm transition-all shadow-sm"
              >
                Return to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
          <div className="w-9 h-9 border-3 border-[#173D2B]/20 border-t-[#173D2B] rounded-full animate-spin" />
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
