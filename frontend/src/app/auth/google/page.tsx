"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ChevronDown, AlertCircle } from "lucide-react";

function GoogleAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/order";
  const { bindSocialAccount } = useAuth();

  const [email, setEmail] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-fill from this device's previous session if exists
  useEffect(() => {
    try {
      const saved = localStorage.getItem("brew_and_co_last_device_email");
      if (saved && saved.includes("@")) {
        setEmail(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleNext = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Enter a valid email address or phone number.");
      return;
    }

    setIsProcessing(true);
    try {
      const derivedName = cleanEmail
        .split("@")[0]
        .replace(/[._-]/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ") || "Google User";

      await bindSocialAccount("google", cleanEmail, derivedName);

      // Smooth Google-like transition to app
      setTimeout(() => {
        router.push(redirectTarget);
      }, 500);
    } catch (err) {
      setIsProcessing(false);
      setErrorMessage(
        err instanceof Error ? err.message : "Couldn't sign you in. Please try again."
      );
    }
  };

  const hasValue = email.length > 0;

  return (
    <div className="min-h-screen bg-[#F0F4F9] flex flex-col items-center justify-center p-4 selection:bg-[#c2e7ff] selection:text-[#001d35]">
      {/* Main Google Box */}
      <div className="w-full max-w-[450px] bg-white rounded-[8px] sm:rounded-[28px] border border-[#dadce0] p-9 sm:p-11 shadow-sm relative overflow-hidden transition-all">
        {/* Indeterminate Google Progress Bar when loading */}
        {isProcessing && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#e8f0fe] overflow-hidden">
            <div className="h-full bg-[#1a73e8] w-1/3 animate-[indeterminate_1.5s_infinite_linear]" />
          </div>
        )}

        {/* Google Multicolor Wordmark */}
        <div className="flex justify-center mb-4">
          <svg className="w-20 h-7" viewBox="0 0 74 24" aria-label="Google">
            <path
              fill="#4285F4"
              d="M9.24 8.19v2.46h5.88c-.18 1.34-.64 2.33-1.34 3.02-.86.86-2.2 1.8-4.54 1.8-3.63 0-6.47-2.93-6.47-6.57s2.84-6.57 6.47-6.57c1.96 0 3.38.77 4.43 1.76L15.4 2.37C13.93.96 11.87 0 9.24 0 4.28 0 .22 4.04.22 9s4.06 9 9.02 9c2.68 0 4.7-.88 6.28-2.52 1.62-1.62 2.13-3.91 2.13-5.75 0-.57-.05-1.1-.14-1.54H9.24z"
            />
            <path
              fill="#EA4335"
              d="M25.7 6.12c-3.14 0-5.7 2.44-5.7 5.76 0 3.29 2.56 5.76 5.7 5.76s5.7-2.47 5.7-5.76c0-3.32-2.56-5.76-5.7-5.76zm0 9.24c-1.72 0-3.2-1.42-3.2-3.48 0-2.08 1.48-3.48 3.2-3.48s3.2 1.4 3.2 3.48c0 2.06-1.48 3.48-3.2 3.48z"
            />
            <path
              fill="#FBBC05"
              d="M38.5 6.12c-3.14 0-5.7 2.44-5.7 5.76 0 3.29 2.56 5.76 5.7 5.76s5.7-2.47 5.7-5.76c0-3.32-2.56-5.76-5.7-5.76zm0 9.24c-1.72 0-3.2-1.42-3.2-3.48 0-2.08 1.48-3.48 3.2-3.48s3.2 1.4 3.2 3.48c0 2.06-1.48 3.48-3.2 3.48z"
            />
            <path
              fill="#4285F4"
              d="M50.8 6.12c-3.08 0-5.46 2.47-5.46 5.76 0 3.26 2.38 5.76 5.46 5.76 1.76 0 2.76-.78 3.42-1.55v1.22c0 2.2-1.18 3.38-3.08 3.38-1.54 0-2.5-1.1-2.9-2.04l-2.18.9c.64 1.54 2.32 3.42 5.08 3.42 2.96 0 5.46-1.74 5.46-6v-11.7h-2.36v1.18c-.66-.75-1.66-1.53-3.44-1.53zm.28 9.24c-1.72 0-3.08-1.44-3.08-3.48 0-2.06 1.36-3.48 3.08-3.48 1.68 0 3.02 1.42 3.02 3.48 0 2.04-1.34 3.48-3.02 3.48z"
            />
            <path fill="#34A853" d="M58.3 0h2.46v17.4h-2.46z" />
            <path
              fill="#EA4335"
              d="M68.5 6.12c-2.76 0-4.66 1.94-4.66 5.76 0 3.46 2.26 5.76 5.34 5.76 2.5 0 3.96-1.36 4.7-2.46l-1.92-1.28c-.52.76-1.36 1.46-2.78 1.46-1.5 0-2.46-.86-2.88-2.12l7.74-3.2-.28-.7c-.52-1.4-2.12-3.22-5.26-3.22zm-.12 2.28c1.08 0 2 .54 2.32 1.32l-5.44 2.26c0-1.84 1.42-3.58 3.12-3.58z"
            />
          </svg>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-normal text-[#202124] tracking-tight">
            Sign in
          </h1>
          <p className="text-base text-[#202124] mt-2">
            Use your Google Account
          </p>
        </div>

        {/* Error notification if any */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form with Material Outline */}
        <form onSubmit={handleNext} className="space-y-2">
          {/* Outlined Input Box with Notch */}
          <div className="relative mt-2">
            <div
              className={`relative rounded-[4px] bg-white transition-colors ${
                errorMessage
                  ? "border-2 border-[#d93025]"
                  : isFocused
                  ? "border-2 border-[#1a73e8]"
                  : "border border-[#747775] hover:border-[#1f1f1f]"
              }`}
            >
              {/* Floating Label */}
              <label
                htmlFor="identifierId"
                className={`absolute left-3 -top-2.5 px-1 bg-white text-xs transition-all pointer-events-none ${
                  errorMessage
                    ? "text-[#d93025] font-medium"
                    : isFocused
                    ? "text-[#1a73e8] font-medium"
                    : hasValue
                    ? "text-[#444746]"
                    : "text-[#444746]"
                }`}
              >
                Email or phone
              </label>

              <input
                id="identifierId"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-3.5 text-base text-[#1f1f1f] bg-transparent outline-none rounded-[4px]"
              />
            </div>
          </div>

          {/* Forgot email? */}
          <div className="pt-1.5">
            <button
              type="button"
              onClick={() => setEmail("guest.coffee@jhescafe.ph")}
              className="text-sm font-medium text-[#1a73e8] hover:underline cursor-pointer"
            >
              Forgot email?
            </button>
          </div>

          {/* Guest mode copy */}
          <div className="pt-8 text-sm text-[#444746] leading-relaxed">
            Not your computer? Use Guest mode to sign in privately.
            <br />
            <Link
              href={`/login?redirect=${encodeURIComponent(redirectTarget)}`}
              className="text-[#1a73e8] font-medium hover:underline inline-block mt-0.5"
            >
              Learn more
            </Link>
          </div>

          {/* Action Buttons Row */}
          <div className="pt-10 flex items-center justify-between">
            <Link
              href={`/register?redirect=${encodeURIComponent(redirectTarget)}`}
              className="text-sm font-medium text-[#1a73e8] hover:bg-blue-50/70 px-2.5 py-2 -ml-2.5 rounded-[4px] transition-colors"
            >
              Create account
            </Link>

            <button
              type="submit"
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-[4px] bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white text-sm font-medium transition-colors shadow-xs hover:shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {isProcessing ? "Signing in..." : "Next"}
            </button>
          </div>
        </form>
      </div>

      {/* Bottom Google Footer Row */}
      <div className="w-full max-w-[450px] mt-4 px-2 flex items-center justify-between text-xs text-[#444746]">
        <div className="flex items-center gap-1.5 cursor-pointer hover:text-[#1f1f1f]">
          <span>English (United States)</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://support.google.com/accounts"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#1f1f1f]"
          >
            Help
          </a>
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#1f1f1f]"
          >
            Privacy
          </a>
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#1f1f1f]"
          >
            Terms
          </a>
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
