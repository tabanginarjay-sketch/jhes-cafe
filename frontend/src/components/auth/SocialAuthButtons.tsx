"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { UserData } from "@/lib/api";

interface SocialAuthButtonsProps {
  mode: "signup" | "signin";
  redirectTarget?: string;
  onSuccess?: (user: UserData) => void;
  className?: string;
}

export function SocialAuthButtons({
  mode,
  redirectTarget = "/account",
  onSuccess,
  className = "",
}: SocialAuthButtonsProps) {
  const router = useRouter();
  const { register } = useAuth();

  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);
  const [showAccountSelector, setShowAccountSelector] = useState<"google" | "apple" | null>(null);
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");

  const handleQuickSocial = async (provider: "google" | "apple", email: string, name: string) => {
    setLoadingProvider(provider);
    try {
      const user = await register({
        full_name: name,
        email: email,
        phone: "+639178889900",
      });

      if (onSuccess) {
        onSuccess(user);
      } else {
        router.push(redirectTarget);
      }
    } catch (err) {
      console.error(`Failed social ${mode}`, err);
    } finally {
      setLoadingProvider(null);
      setShowAccountSelector(null);
    }
  };

  const handleSelectProvider = (provider: "google" | "apple") => {
    if (provider === "google") {
      setCustomName("Jherald Ramos");
      setCustomEmail("jherald.ramos@gmail.com");
    } else {
      setCustomName("Jherald Ramos");
      setCustomEmail("jherald.ramos@icloud.com");
    }
    setShowAccountSelector(provider);
  };

  const prefix = mode === "signup" ? "Sign up" : "Continue";

  return (
    <div className={`space-y-3.5 ${className}`}>
      
      {/* Social Provider Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        {/* Google Auth Button */}
        <button
          type="button"
          onClick={() => handleSelectProvider("google")}
          disabled={!!loadingProvider}
          className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-[#E5DACB] bg-white hover:bg-[#F5F0E7] text-[#173D2B] text-xs font-semibold tracking-wide transition-all shadow-xs hover:shadow-sm active:scale-98 cursor-pointer disabled:opacity-60"
        >
          {loadingProvider === "google" ? (
            <div className="w-4 h-4 border-2 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
          )}
          <span>{prefix} with Google</span>
        </button>

        {/* Apple Auth Button */}
        <button
          type="button"
          onClick={() => handleSelectProvider("apple")}
          disabled={!!loadingProvider}
          className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border border-black bg-black hover:bg-[#173D2B] text-white text-xs font-semibold tracking-wide transition-all shadow-xs hover:shadow-sm active:scale-98 cursor-pointer disabled:opacity-60"
        >
          {loadingProvider === "apple" ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.85-11.71-14.42-5.77-9.24-10.33-19.46-13.68-30.65-3.35-11.19-5.02-21.84-5.02-31.96 0-14.79 3.8-27.17 11.39-37.13 7.6-9.96 17.06-15.05 28.38-15.27 4.9 0 10.28 1.25 16.14 3.75 5.86 2.51 9.77 3.86 11.73 4.05 1.52-.33 5.48-1.74 11.88-4.24 6.4-2.5 11.99-3.64 16.77-3.43 12.3.65 22.31 5.38 30.05 14.19-10.87 6.64-16.19 15.77-15.97 27.41.22 9.14 3.75 16.86 10.59 23.17 6.84 6.31 15 9.89 24.47 10.76-2.17 6.74-4.89 13.59-8.15 20.55zM119.22 31.84c0-7.07 2.55-13.69 7.65-19.88 5.1-6.19 11.45-10.37 19.06-12.54 1.09 7.28-.54 14.14-4.89 20.57-4.35 6.43-10.33 10.63-17.94 12.6-.65-.25-1.96-.44-3.88-.75z" />
            </svg>
          )}
          <span>{prefix} with Apple</span>
        </button>

      </div>

      {/* Interactive Social Prompt / Account Confirmation Modal */}
      {showAccountSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-[#E5DACB] bg-white p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#F5F0E7] flex items-center justify-center mx-auto">
                {showAccountSelector === "google" ? (
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 fill-current text-black" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.85-11.71-14.42-5.77-9.24-10.33-19.46-13.68-30.65-3.35-11.19-5.02-21.84-5.02-31.96 0-14.79 3.8-27.17 11.39-37.13 7.6-9.96 17.06-15.05 28.38-15.27 4.9 0 10.28 1.25 16.14 3.75 5.86 2.51 9.77 3.86 11.73 4.05 1.52-.33 5.48-1.74 11.88-4.24 6.4-2.5 11.99-3.64 16.77-3.43 12.3.65 22.31 5.38 30.05 14.19-10.87 6.64-16.19 15.77-15.97 27.41.22 9.14 3.75 16.86 10.59 23.17 6.84 6.31 15 9.89 24.47 10.76-2.17 6.74-4.89 13.59-8.15 20.55zM119.22 31.84c0-7.07 2.55-13.69 7.65-19.88 5.1-6.19 11.45-10.37 19.06-12.54 1.09 7.28-.54 14.14-4.89 20.57-4.35 6.43-10.33 10.63-17.94 12.6-.65-.25-1.96-.44-3.88-.75z" />
                  </svg>
                )}
              </div>
              <h3 className="font-serif text-lg font-bold text-[#173D2B]">
                {showAccountSelector === "google" ? "Sign In with Google" : "Sign In with Apple"}
              </h3>
              <p className="text-xs text-[#573B2C]">
                Confirm account to connect with Jhe&apos;s Cafe&apos; member database:
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#173D2B] block mb-1">Full Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full rounded-xl border border-[#E5DACB] p-2.5 text-xs text-[#173D2B] bg-[#FFFCF7]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#173D2B] block mb-1">
                  {showAccountSelector === "google" ? "Google Account Email" : "Apple ID Email"}
                </label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#E5DACB] p-2.5 text-xs text-[#173D2B] bg-[#FFFCF7]"
                />
              </div>

              <button
                type="button"
                onClick={() => handleQuickSocial(showAccountSelector, customEmail, customName)}
                className="w-full py-3 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md mt-2"
              >
                <span>Authorize &amp; Continue</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAccountSelector(null)}
                className="w-full py-2 text-xs text-[#573B2C]/70 hover:text-[#173D2B] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled Divider */}
      <div className="relative flex items-center justify-center py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#E5DACB]" />
        </div>
        <div className="relative bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-[#573B2C]/60">
          or with email
        </div>
      </div>

    </div>
  );
}
