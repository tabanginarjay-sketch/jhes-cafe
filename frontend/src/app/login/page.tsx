"use client";

import { Suspense, useState, useEffect } from "react";
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(cleanEmail);
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

  const handleFillDemo = () => {
    setEmail("guest.coffee@jhescafe.ph");
    setPassword("coffee123");
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

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#E5DACB] w-full" />
            <span className="bg-white px-3 text-[11px] text-[#573B2C]/70 uppercase tracking-wider font-semibold">
              or sign in with email
            </span>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form with Browser Auto-fill Enabled */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-email" className="font-semibold text-[#173D2B]">
                  Email Address
                </label>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-[10px] text-[#315640] hover:underline font-medium"
                >
                  Fill Guest Demo
                </button>
              </div>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="w-full rounded-xl border border-[#E5DACB] p-3.5 text-xs text-[#173D2B] placeholder:text-[#573B2C]/40 focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20 focus:border-[#173D2B] bg-[#FFFCF7] transition-all"
              />
              <p className="text-[10px] text-[#573B2C]/60 mt-1">
                Device autofill enabled. Sign in with your Gmail or registered email.
              </p>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="font-semibold text-[#173D2B]">
                  Password
                </label>
                <span className="text-[10px] text-[#573B2C]/70">Optional for fast login</span>
              </div>
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl border border-[#E5DACB] p-3.5 text-xs text-[#173D2B] bg-[#FFFCF7] pr-10 focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20 focus:border-[#173D2B] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-[#573B2C]/60 hover:text-[#173D2B]"
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
              className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer active:scale-98"
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
            New to Jhe&apos;s Cafe&apos;?{" "}
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
