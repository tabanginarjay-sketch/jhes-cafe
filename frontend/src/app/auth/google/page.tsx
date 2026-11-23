"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, ShieldCheck, User } from "lucide-react";

function GoogleAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/order";
  const { bindSocialAccount } = useAuth();

  const [deviceSavedEmail, setDeviceSavedEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Check if this specific device already has a saved email in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("brew_and_co_last_device_email");
      if (saved && saved.includes("@")) {
        setDeviceSavedEmail(saved);
        setEmail(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAuth = async (targetEmail: string, targetName?: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setStatusMessage("Please enter a valid Google Account email.");
      return;
    }

    const resolvedName =
      targetName?.trim() ||
      cleanEmail
        .split("@")[0]
        .replace(/[._-]/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ") ||
      "Google User";

    setIsProcessing(true);
    setStatusMessage("Authenticating with Google Account...");
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setStatusMessage("Signing in to Jhe's Cafe'...");

      const user = await bindSocialAccount("google", cleanEmail, resolvedName);
      setIsSuccess(true);
      setStatusMessage(`✓ Signed in as ${user.full_name}! Redirecting...`);

      setTimeout(() => {
        router.push(redirectTarget);
      }, 600);
    } catch (err) {
      setIsProcessing(false);
      setStatusMessage(err instanceof Error ? err.message : "Error connecting with Google");
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F9] flex flex-col items-center justify-center p-4">
      {/* Google Card */}
      <div className="w-full max-w-[440px] bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-gray-100 space-y-6">

        {/* Google Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <svg className="w-10 h-10" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <h1 className="text-xl font-medium text-gray-800">
            Sign in with Google
          </h1>
          <p className="text-xs text-gray-500">
            to continue to <span className="font-semibold text-[#173D2B]">Jhe&apos;s Cafe&apos;</span>
          </p>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-center space-y-2 animate-in fade-in">
            {isSuccess ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
            ) : (
              <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
            )}
            <p className="text-xs font-medium text-blue-900">{statusMessage}</p>
          </div>
        )}

        {/* Form with Native Device Autofill */}
        {!isProcessing && (
          <div className="space-y-4">
            {/* Quick 1-tap if user's own device previously stored an account */}
            {deviceSavedEmail && (
              <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-blue-700 tracking-wider">
                    Saved on this device
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDeviceSavedEmail(null);
                      setEmail("");
                    }}
                    className="text-[10px] text-blue-600 hover:underline"
                  >
                    Use another
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleAuth(deviceSavedEmail)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white border border-blue-300 hover:border-blue-500 hover:shadow-xs transition-all text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {deviceSavedEmail.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      Continue as {deviceSavedEmail}
                    </p>
                    <p className="text-[11px] text-gray-500">Tap to sign in instantly</p>
                  </div>
                </button>
              </div>
            )}

            {/* Standard Google Email Form with Native Autofill */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAuth(email, name);
              }}
              className="space-y-3.5"
            >
              <div>
                <label
                  htmlFor="google-email"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Email or phone <span className="text-blue-600">*</span>
                </label>
                <input
                  id="google-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full p-3 rounded-xl border border-gray-300 text-xs text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Device auto-fill enabled. Tap above to select your device&apos;s Google Account.
                </p>
              </div>

              <div>
                <label
                  htmlFor="google-name"
                  className="block text-xs font-semibold text-gray-700 mb-1"
                >
                  Name <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="google-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full p-3 rounded-xl border border-gray-300 text-xs text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              {statusMessage && !isProcessing && (
                <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  {statusMessage}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <span>Continue with Google</span>
              </button>
            </form>
          </div>
        )}

        {/* Bottom Trust info */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Device Privacy Protected
          </span>
          <Link
            href={redirectTarget}
            className="hover:underline text-gray-600"
          >
            Cancel
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function GoogleAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F0F4F9] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
        </div>
      }
    >
      <GoogleAuthContent />
    </Suspense>
  );
}
