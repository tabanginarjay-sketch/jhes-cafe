"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Coffee,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { JhesCafeLogo } from "@/components/brand/JhesCafeLogo";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/account";
  const { login } = useAuth();

  const [email, setEmail] = useState("juan@example.com");
  const [password, setPassword] = useState("••••••••");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim());
      router.push(redirectTarget);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Sign in failed. Please verify your email and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSelect = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("••••••••");
    setErrorMessage(null);
  };

  return (
    <div className="py-16 sm:py-24 flex-1 flex items-center justify-center bg-[#FFFCF7] px-4">
      <div className="w-full max-w-md space-y-6">

        <div className="rounded-3xl border border-[#E5DACB] bg-white p-8 sm:p-10 shadow-md space-y-6">

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <JhesCafeLogo variant="emblem" size="md" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#173D2B]">
              Welcome Back
            </h1>
            <p className="text-xs text-[#573B2C] leading-relaxed">
              Sign in to track orders, collect reward bean points, and customize your brews.
            </p>
          </div>

          {/* Social Sign In with Google & Apple */}
          <SocialAuthButtons mode="signin" redirectTarget={redirectTarget} />

          {/* Quick Member Accounts for Demo & Testing */}
          <div className="p-3.5 rounded-2xl bg-[#F5F0E7]/80 border border-[#E5DACB] space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#315640] block">
              Quick Test Accounts (Airtable DB):
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickSelect("juan@example.com")}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${email === "juan@example.com"
                  ? "border-[#173D2B] bg-[#173D2B] text-white"
                  : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#173D2B]"
                  }`}
              >
                <strong className="block leading-none">Juan Ramos</strong>
                <span className="text-[9px] opacity-80">juan@example.com</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect("maria@example.com")}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${email === "maria@example.com"
                  ? "border-[#173D2B] bg-[#173D2B] text-white"
                  : "border-[#E5DACB] bg-white text-[#573B2C] hover:border-[#173D2B]"
                  }`}
              >
                <strong className="block leading-none">Maria Santos</strong>
                <span className="text-[9px] opacity-80">maria@example.com</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-[#173D2B] block mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B] placeholder:text-[#573B2C]/40 focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20 focus:border-[#173D2B] bg-[#FFFCF7]"
              />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-[#173D2B]">Password</label>
                <span className="text-[10px] text-[#573B2C]/70">Demo password accepted</span>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl border border-[#E5DACB] p-3 text-xs text-[#173D2B] bg-[#FFFCF7] pr-10 focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20 focus:border-[#173D2B]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-[#573B2C]/60 hover:text-[#173D2B]"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                </>
              )}
            </button>
          </form>

          {/* Registration link */}
          <p className="text-center text-xs text-[#573B2C] pt-2 border-t border-[#E5DACB]">
            New to BREW &amp; CO.?{" "}
            <Link
              href={redirectTarget ? `/register?redirect=${encodeURIComponent(redirectTarget)}` : "/register"}
              className="font-bold text-[#173D2B] hover:underline ml-1"
            >
              Create an account
            </Link>
          </p>

        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex items-center justify-center bg-[#FFFCF7]">
          <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
