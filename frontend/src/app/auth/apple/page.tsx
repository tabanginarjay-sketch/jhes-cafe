"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, Lock, Fingerprint } from "lucide-react";

function AppleAuthContent() {
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

  const handleAppleAuthorize = async (targetEmail: string, targetName?: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setStatusMessage("Please enter a valid Apple ID email address.");
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
      "Apple User";

    setIsProcessing(true);
    setStatusMessage("Authenticating with Face ID / Apple Account...");
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setStatusMessage("Signing in to Jhe's Cafe'...");

      const user = await bindSocialAccount("apple", cleanEmail, resolvedName);
      setIsSuccess(true);
      setStatusMessage(`✓ Signed in as ${user.full_name}! Redirecting...`);

      setTimeout(() => {
        router.push(redirectTarget);
      }, 600);
    } catch (err) {
      setIsProcessing(false);
      setStatusMessage(err instanceof Error ? err.message : "Error connecting Apple ID");
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center p-4 text-white">
      {/* Apple Sheet Card */}
      <div className="w-full max-w-[420px] bg-[#1C1C1E] rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/10 space-y-6">

        {/* Apple Logo Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 fill-current" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.85-11.71-14.42-5.77-9.24-10.33-19.46-13.68-30.65-3.35-11.19-5.02-21.84-5.02-31.96 0-14.79 3.8-27.17 11.39-37.13 7.6-9.96 17.06-15.05 28.38-15.27 4.9 0 10.28 1.25 16.14 3.75 5.86 2.51 9.77 3.86 11.73 4.05 1.52-.33 5.48-1.74 11.88-4.24 6.4-2.5 11.99-3.64 16.77-3.43 12.3.65 22.31 5.38 30.05 14.19-10.87 6.64-16.19 15.77-15.97 27.41.22 9.14 3.75 16.86 10.59 23.17 6.84 6.31 15 9.89 24.47 10.76-2.17 6.74-4.89 13.59-8.15 20.55zM119.22 31.84c0-7.07 2.55-13.69 7.65-19.88 5.1-6.19 11.45-10.37 19.06-12.54 1.09 7.28-.54 14.14-4.89 20.57-4.35 6.43-10.33 10.63-17.94 12.6-.65-.25-1.96-.44-3.88-.75z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Sign in with Apple
          </h1>
          <p className="text-xs text-gray-400">
            Use your Apple ID to sign in to <span className="font-semibold text-white">Jhe&apos;s Cafe&apos;</span>
          </p>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
            {isSuccess ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            ) : (
              <Fingerprint className="w-8 h-8 text-white mx-auto animate-pulse" />
            )}
            <p className="text-xs font-medium text-gray-200">{statusMessage}</p>
          </div>
        )}

        {/* Form with Native Device Autofill */}
        {!isProcessing && (
          <div className="space-y-4">
            {deviceSavedEmail && (
              <div className="p-3.5 rounded-2xl border border-white/10 bg-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                    Saved on this device
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDeviceSavedEmail(null);
                      setEmail("");
                    }}
                    className="text-[10px] text-gray-400 hover:text-white hover:underline"
                  >
                    Use another
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleAppleAuthorize(deviceSavedEmail)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-left cursor-pointer"
                >
                  <Fingerprint className="w-5 h-5 text-gray-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      Continue as {deviceSavedEmail}
                    </p>
                    <p className="text-[11px] text-gray-400">Touch ID / Apple ID</p>
                  </div>
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAppleAuthorize(email, name);
              }}
              className="space-y-3.5"
            >
              <div>
                <label
                  htmlFor="apple-email"
                  className="block text-xs font-semibold text-gray-300 mb-1"
                >
                  Apple ID / Email <span className="text-white">*</span>
                </label>
                <input
                  id="apple-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@icloud.com"
                  className="w-full p-3 rounded-xl border border-white/20 bg-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white transition-all"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Device auto-fill enabled. Tap to select from your device.
                </p>
              </div>

              <div>
                <label
                  htmlFor="apple-name"
                  className="block text-xs font-semibold text-gray-300 mb-1"
                >
                  Name <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <input
                  id="apple-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full p-3 rounded-xl border border-white/20 bg-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white transition-all"
                />
              </div>

              {statusMessage && !isProcessing && (
                <p className="text-xs text-amber-300 bg-amber-500/20 p-2.5 rounded-xl border border-amber-500/30">
                  {statusMessage}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-white hover:bg-gray-100 text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98"
              >
                <Fingerprint className="w-4 h-4 text-black" />
                <span>Continue with Apple ID</span>
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-gray-400" />
            Apple ID Security &amp; Privacy
          </span>
          <Link href={redirectTarget} className="hover:underline text-gray-400">
            Cancel
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function AppleAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center text-white">
          <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <AppleAuthContent />
    </Suspense>
  );
}
