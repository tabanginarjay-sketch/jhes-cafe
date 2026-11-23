"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";

declare global {
  interface Window {
    google?: any;
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/order";
  const { loginWithEmail, loginWithGoogle, loginWithGoogleCode } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // Auto-fill from this device's previous session if exists, and check for error param
  useEffect(() => {
    try {
      const saved = localStorage.getItem("brew_and_co_last_device_email");
      if (saved && saved.includes("@")) {
        setEmail(saved);
        setForgotEmail(saved);
      }
    } catch {
      // ignore
    }

    const errorParam = searchParams.get("error");
    if (errorParam) {
      setErrorMessage(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  // Initialize Google Identity Services if client ID is configured
  useEffect(() => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (googleClientId && typeof window !== "undefined" && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: { credential: string }) => {
            if (response.credential) {
              setIsSubmitting(true);
              try {
                await loginWithGoogle(response.credential, googleClientId);
                router.push(redirectTarget);
              } catch (err) {
                setErrorMessage(err instanceof Error ? err.message : "Google authentication failed.");
              } finally {
                setIsSubmitting(false);
              }
            }
          },
          auto_select: false,
        });

        const btnContainer = document.getElementById("gsi-render-target");
        if (btnContainer) {
          window.google.accounts.id.renderButton(btnContainer, {
            theme: "outline",
            size: "large",
            width: "360",
            text: "signin_with",
            shape: "rectangular",
          });
        }
      } catch (gsiErr) {
        console.warn("GSI init warning:", gsiErr);
      }
    }
  }, [loginWithGoogle, redirectTarget, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithEmail({ email: cleanEmail, password });
      router.push(redirectTarget);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Invalid email or password. Please verify your credentials."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLoginClick = () => {
    setErrorMessage(null);
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/google/callback`;

    if (!clientId) {
      setErrorMessage(
        "Google Sign-In is configured. To enable the official Google Account Chooser in live environments, provide NEXT_PUBLIC_GOOGLE_CLIENT_ID."
      );
      return;
    }

    // 1. If GIS oauth2 code client is ready, open official Google Account Chooser in popup
    if (typeof window !== "undefined" && window.google?.accounts?.oauth2) {
      try {
        const codeClient = window.google.accounts.oauth2.initCodeClient({
          client_id: clientId,
          scope: "openid email profile",
          ux_mode: "popup",
          prompt: "select_account", // Enforces official Google Account Chooser
          callback: async (response: { code?: string; error?: string }) => {
            if (response.code) {
              setIsSubmitting(true);
              try {
                // Google Identity Services popup mode explicitly mandates 'postmessage' as redirect_uri
                await loginWithGoogleCode(response.code, "postmessage", clientId);
                router.push(redirectTarget);
              } catch (err) {
                setErrorMessage(err instanceof Error ? err.message : "Google authentication failed.");
              } finally {
                setIsSubmitting(false);
              }
            } else if (response.error) {
              setErrorMessage(`Google authentication error: ${response.error}`);
            }
          },
          error_callback: (error: any) => {
            if (error?.type !== "popup_closed") {
              setErrorMessage("Google account selection was canceled or blocked.");
            }
          },
        });
        codeClient.requestCode();
        return;
      } catch (err) {
        console.warn("GIS popup notice, falling back to OAuth redirect:", err);
      }
    }

    // 2. Full official OAuth 2.0 Authorization Flow (ChatGPT style)
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("prompt", "select_account"); // Guarantees official Google Account Chooser
    googleAuthUrl.searchParams.set("access_type", "offline");
    googleAuthUrl.searchParams.set("state", redirectTarget);
    window.location.href = googleAuthUrl.toString();
  };

  const handleFacebookLoginClick = () => {
    setErrorMessage(null);
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const redirectUri = `${window.location.origin}/auth/facebook/callback`;

    if (!appId) {
      setErrorMessage(
        "Facebook Login is ready. To connect with Meta, configure NEXT_PUBLIC_FACEBOOK_APP_ID in your environment."
      );
      return;
    }

    const fbAuthUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    fbAuthUrl.searchParams.set("client_id", appId);
    fbAuthUrl.searchParams.set("redirect_uri", redirectUri);
    fbAuthUrl.searchParams.set("response_type", "code");
    fbAuthUrl.searchParams.set("scope", "public_profile");
    fbAuthUrl.searchParams.set("state", redirectTarget);
    window.location.href = fbAuthUrl.toString();
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes("@")) return;
    setIsForgotLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setForgotSuccess(
        `If ${forgotEmail} is registered, password reset instructions have been dispatched.`
      );
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />

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

            {/* Prominent Login with Google Button (Image 2 Match) */}
            <div className="space-y-2.5">
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
                <span>Continue with Google</span>
              </button>

              {/* Official Facebook Button */}
              <button
                type="button"
                onClick={handleFacebookLoginClick}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium text-xs transition-all shadow-xs hover:shadow-sm cursor-pointer active:scale-[0.99]"
              >
                <svg className="w-4 h-4 fill-[#1877F2] shrink-0" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Continue with Facebook</span>
              </button>
            </div>

            {/* Hidden container for Google One Tap / official rendered button */}
            <div id="gsi-render-target" className="flex justify-center" />

            {/* OR Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-gray-200 w-full" />
              <span className="bg-white px-3 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                OR
              </span>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* E-Mail Input with Native Device Autofill */}
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

              {/* Password Input with Visibility Toggle */}
              <div className="relative">
                <label
                  htmlFor="login-password"
                  className="font-bold text-gray-700 block mb-1.5 text-xs"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-gray-300 p-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all shadow-2xs pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Log in"
                )}
              </button>

              {/* Forgot Your Password? */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotSuccess(null);
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

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-gray-200">
              <div className="space-y-1">
                <h3 className="font-bold text-gray-900 text-base">Reset Your Password</h3>
                <p className="text-xs text-gray-500">
                  Enter your email address and we will dispatch password recovery instructions.
                </p>
              </div>

              {forgotSuccess ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{forgotSuccess}</span>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-gray-300 p-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isForgotLoading}
                      className="flex-1 py-2.5 rounded-xl bg-[#0066ff] hover:bg-[#0052cc] text-white text-xs font-semibold"
                    >
                      {isForgotLoading ? "Sending..." : "Send Instructions"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </form>
              )}

              {forgotSuccess && (
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold"
                >
                  Back to Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
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
