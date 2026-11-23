"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, Coffee, CheckCircle2 } from "lucide-react";

function FacebookCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithFacebook, user, isAuthenticated } = useAuth();

  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const exchangeStartedRef = useRef(false);

  useEffect(() => {
    // If user is already authenticated, redirect smoothly immediately
    if (isAuthenticated || user) {
      const state = searchParams.get("state");
      let target = "/order";
      if (state) {
        try {
          let decoded = decodeURIComponent(state);
          if (decoded.startsWith("%")) decoded = decodeURIComponent(decoded);
          if (decoded.startsWith("/") && !decoded.startsWith("//")) target = decoded;
        } catch {
          target = "/order";
        }
      }
      setStatus("success");
      const t = setTimeout(() => router.push(target), 300);
      return () => clearTimeout(t);
    }

    if (exchangeStartedRef.current) return;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Cleanly sanitize target redirect URL
    let targetUrl = "/order";
    if (state) {
      try {
        let decoded = decodeURIComponent(state);
        if (decoded.startsWith("%")) decoded = decodeURIComponent(decoded);
        if (decoded.startsWith("/") && !decoded.startsWith("//")) targetUrl = decoded;
      } catch {
        targetUrl = "/order";
      }
    }

    if (error) {
      exchangeStartedRef.current = true;
      setStatus("error");
      if (error === "access_denied") {
        setErrorMessage("Facebook account authorization was canceled.");
      } else {
        setErrorMessage(errorDescription || `Facebook authentication error: ${error}`);
      }
      return;
    }

    if (!code) {
      try {
        const stored = localStorage.getItem("brew_and_co_user");
        if (stored) {
          setStatus("success");
          const t = setTimeout(() => router.push(targetUrl), 300);
          return () => clearTimeout(t);
        }
      } catch {
        // ignore
      }
      exchangeStartedRef.current = true;
      setStatus("error");
      setErrorMessage("No authorization code received from Facebook. Please try signing in again.");
      return;
    }

    exchangeStartedRef.current = true;
    let isMounted = true;

    async function handleExchange() {
      try {
        const redirectUri = `${window.location.origin}/auth/facebook/callback`;
        await loginWithFacebook({ code: code as string, redirect_uri: redirectUri });
        if (!isMounted) return;
        setStatus("success");
        setTimeout(() => {
          router.push(targetUrl);
        }, 400);
      } catch (err) {
        if (!isMounted) return;

        try {
          const stored = localStorage.getItem("brew_and_co_user");
          if (stored) {
            setStatus("success");
            setTimeout(() => router.push(targetUrl), 300);
            return;
          }
        } catch {
          // ignore
        }

        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to authenticate your Facebook account with Jhe's Cafe'."
        );
      }
    }

    void handleExchange();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user, loginWithFacebook, router, searchParams]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 selection:bg-[#1877F2] selection:text-white">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#EBE3D5] p-8 sm:p-10 shadow-sm text-center">
        {/* Top Logo / Coffee Emblem */}
        <div className="w-16 h-16 rounded-2xl bg-[#1877F2] mx-auto flex items-center justify-center text-white shadow-sm mb-6">
          <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </div>

        {status === "processing" && (
          <div className="space-y-4 animate-in fade-in">
            <h1 className="text-2xl font-serif text-[#173D2B] font-bold">
              Connecting Your Facebook Account
            </h1>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Verifying your Facebook profile and preparing your Jhe&apos;s Cafe&apos; membership...
            </p>
            <div className="pt-4 flex justify-center">
              <div className="w-9 h-9 border-3 border-[#1877F2]/20 border-t-[#1877F2] rounded-full animate-spin" />
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
              Your Facebook account is verified. Redirecting you now...
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

export default function FacebookCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
          <div className="w-9 h-9 border-3 border-[#1877F2]/20 border-t-[#1877F2] rounded-full animate-spin" />
        </div>
      }
    >
      <FacebookCallbackContent />
    </Suspense>
  );
}
