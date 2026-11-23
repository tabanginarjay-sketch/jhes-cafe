"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/order";
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
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

  const handleGoogleLoginClick = () => {
    router.push(`/auth/google?redirect=${encodeURIComponent(redirectTarget)}`);
  };

  return (
    <div className="min-h-screen py-16 sm:py-24 flex items-center justify-center bg-[#F8FAFC] px-4 selection:bg-blue-100 selection:text-blue-900">
      <div className="w-full max-w-[440px]">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-8 sm:p-10 shadow-sm space-y-6">

          {/* Heading */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1e293b] tracking-tight">
              Log in to your account
            </h1>
          </div>

          {/* Prominent Login with Google Button (Matching Image 2) */}
          <div>
            <button
              type="button"
              onClick={handleGoogleLoginClick}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border-2 border-[#1a73e8] bg-white hover:bg-blue-50/50 text-[#1a73e8] font-semibold text-sm transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              <span>Login with Google</span>
            </button>
          </div>

          {/* OR Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-gray-200 w-full" />
            <span className="bg-white px-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">
              OR
            </span>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* E-Mail Input */}
            <div>
              <label
                htmlFor="login-email"
                className="font-bold text-gray-700 block mb-1.5 text-xs"
              >
                E-Mail
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-gray-300 p-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all shadow-2xs"
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="login-password"
                className="font-bold text-gray-700 block mb-1.5 text-xs"
              >
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl border border-gray-300 p-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all shadow-2xs"
              />
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="remember-me"
                className="text-xs text-gray-600 font-medium select-none cursor-pointer"
              >
                Remember Me
              </label>
            </div>

            {/* Log In Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-[#0066ff] hover:bg-[#0052cc] text-white text-sm font-bold tracking-wide transition-all shadow-sm hover:shadow-md disabled:opacity-60 cursor-pointer active:scale-[0.99] mt-2"
            >
              {isSubmitting ? "Logging in..." : "Log in"}
            </button>

            {/* Forgot Your Password? */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setEmail("guest.coffee@jhescafe.ph");
                  setPassword("coffee123");
                }}
                className="text-xs sm:text-sm font-semibold text-[#0066ff] hover:underline cursor-pointer"
              >
                Forgot Your Password?
              </button>
            </div>
          </form>

          {/* Bottom Register Link */}
          <div className="pt-4 border-t border-gray-200 text-center">
            <p className="text-xs sm:text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link
                href={
                  redirectTarget
                    ? `/register?redirect=${encodeURIComponent(redirectTarget)}`
                    : "/register"
                }
                className="font-bold text-[#0066ff] hover:underline"
              >
                Register
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
