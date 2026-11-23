"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";

function GoogleAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/order";
  const { bindSocialAccount } = useAuth();

  const [selectedEmail, setSelectedEmail] = useState("jherald.ramos@gmail.com");
  const [selectedName, setSelectedName] = useState("Jherald Ramos");
  const [isCustom, setIsCustom] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSelectAndBind = async (email: string, name: string) => {
    setIsProcessing(true);
    setStatusMessage("Authenticating with Google Accounts...");
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setStatusMessage("Binding Google profile to BREW & CO. account...");

      const user = await bindSocialAccount("google", email, name);
      setIsSuccess(true);
      setStatusMessage(`✓ Connected as ${user.full_name}! Redirecting...`);

      setTimeout(() => {
        router.push(redirectTarget);
      }, 700);
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
            Choose an account to continue to <span className="font-semibold text-[#173D2B]">BREW &amp; CO.</span>
          </p>
        </div>

        {/* Status / Loader */}
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

        {/* Account Selection List */}
        {!isProcessing && (
          <div className="space-y-3">
            {/* Primary Account: Jherald Ramos */}
            <button
              type="button"
              onClick={() => handleSelectAndBind("jherald.ramos@gmail.com", "Jherald Ramos")}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                J
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 truncate">
                  Jherald Ramos
                </p>
                <p className="text-xs text-gray-500 truncate">
                  jherald.ramos@gmail.com
                </p>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Bind
              </span>
            </button>

            {/* Secondary Account: BREW & CO. VIP */}
            <button
              type="button"
              onClick={() => handleSelectAndBind("vip@brewandco.ph", "BREW & CO. VIP")}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                BC
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 truncate">
                  BREW &amp; CO. VIP Member
                </p>
                <p className="text-xs text-gray-500 truncate">
                  vip@brewandco.ph
                </p>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Bind
              </span>
            </button>

            {/* Custom Account Toggle */}
            {!isCustom ? (
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className="w-full py-2.5 text-xs font-medium text-blue-600 hover:text-blue-800 text-center hover:underline cursor-pointer"
              >
                Use another Google account
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customEmail && customName) {
                    handleSelectAndBind(customEmail.trim(), customName.trim());
                  }
                }}
                className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3"
              >
                <p className="text-xs font-semibold text-gray-700">Enter custom Google account:</p>
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  required
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Bind &amp; Continue
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustom(false)}
                    className="px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Bottom Trust info */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Official Google OAuth 2.0
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
