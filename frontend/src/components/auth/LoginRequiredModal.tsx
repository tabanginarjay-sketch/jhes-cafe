"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { X, Lock, Eye, EyeOff, AlertCircle, Sparkles, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { getProductImage } from "@/lib/productRegistry";

export function LoginRequiredModal() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    showLoginModal,
    dismissLoginModal,
    pendingAuthItem,
  } = useCart();
  const { loginWithEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "facebook" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!showLoginModal) return;
    setErrorMessage(null);
    setPassword("");
    try {
      const savedEmail = localStorage.getItem("jhes_cafe_last_device_email");
      if (savedEmail && savedEmail.includes("@")) {
        setEmail(savedEmail);
      }
    } catch {
      // Ignore storage access errors
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissLoginModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showLoginModal, dismissLoginModal]);

  if (!showLoginModal) return null;

  const returnUrl = pendingAuthItem?.returnUrl || pathname || "/menu";
  const pendingItem = pendingAuthItem?.item;
  const pendingQty = pendingAuthItem?.quantity || pendingItem?.quantity || 1;
  const pendingTotal = pendingItem ? pendingItem.price * pendingQty : 0;

  const handleOAuthRedirect = (provider: "google" | "facebook") => {
    setOauthLoading(provider);
    setErrorMessage(null);
    router.push(`/auth/${provider}?redirect=${encodeURIComponent(returnUrl)}`);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
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
      router.refresh();
      // CartContext detects the newly authenticated user and automatically adds the preserved customization.
      if (returnUrl && returnUrl !== pathname && returnUrl.startsWith("/")) {
        router.push(returnUrl);
      }
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

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-required-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F2A1D]/70 backdrop-blur-xs animate-fade-in"
        onClick={dismissLoginModal}
      />

      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-3xl bg-[#FFFCF7] border border-[#E5DACB] shadow-2xl overflow-hidden animate-scale-in">
          {/* Top Forest Header */}
          <div className="px-6 py-5 bg-[#173D2B] text-[#FFFCF7] flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-[#C9AE8B]">
                <Lock className="w-3 h-3" />
                <span>Member Bag Required</span>
              </div>
              <h2
                id="login-required-modal-title"
                className="font-serif text-xl sm:text-2xl font-bold tracking-tight"
              >
                Sign in to add to your bag
              </h2>
            </div>

            <button
              type="button"
              onClick={dismissLoginModal}
              className="p-1.5 rounded-full text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close sign in dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Preserved Selection Preview Card */}
            {pendingItem && (
              <div className="rounded-2xl border border-[#E5DACB] bg-[#F5F0E7]/85 p-3.5 flex items-start gap-3">
                <img
                  src={getProductImage(pendingItem)}
                  alt={pendingItem.name}
                  className="w-14 h-14 rounded-xl object-cover border border-[#E5DACB] shrink-0 bg-[#173D2B]"
                />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-serif text-sm font-bold text-[#173D2B] leading-snug">
                      {pendingItem.name}
                    </p>
                    <span className="font-mono text-xs font-bold text-[#173D2B] shrink-0">
                      ₱{pendingTotal}
                    </span>
                  </div>
                  {pendingItem.customizationSummary && (
                    <p className="text-[11px] text-[#573B2C] leading-snug">
                      {pendingItem.customizationSummary}
                    </p>
                  )}
                  <p className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#315640] pt-0.5">
                    <Sparkles className="w-3 h-3 text-[#C9AE8B]" />
                    <span>
                      Qty {pendingQty} · Your customization is saved and will be added automatically after sign-in.
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* OAuth Quick Sign-In Options */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleOAuthRedirect("google")}
                disabled={Boolean(oauthLoading) || isSubmitting}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[#E5DACB] bg-white hover:bg-[#F5F0E7] text-[#173D2B] font-semibold text-xs tracking-wide transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-60"
              >
                {oauthLoading === "google" ? (
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
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuthRedirect("facebook")}
                disabled={Boolean(oauthLoading) || isSubmitting}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-[#1877F2] bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold text-xs tracking-wide transition-all shadow-2xs cursor-pointer disabled:opacity-60"
              >
                {oauthLoading === "facebook" ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
                <span>Continue with Facebook</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-[#E5DACB] w-full" />
              <span className="bg-[#FFFCF7] px-3 text-[10px] font-mono font-semibold text-[#573B2C]/70 uppercase tracking-widest">
                Or Sign In with Email
              </span>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Inline Email Login Form */}
            <form onSubmit={handleEmailLogin} className="space-y-3 text-xs">
              <div>
                <label htmlFor="modal-login-email" className="font-semibold text-[#173D2B] block mb-1">
                  Email Address
                </label>
                <input
                  id="modal-login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-[#E5DACB] bg-white px-3.5 py-2.5 text-xs text-[#173D2B] placeholder:text-[#573B2C]/40 focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20 focus:border-[#173D2B]"
                />
              </div>

              <div className="relative">
                <label htmlFor="modal-login-password" className="font-semibold text-[#173D2B] block mb-1">
                  Password
                </label>
                <input
                  id="modal-login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-[#E5DACB] bg-white px-3.5 py-2.5 pr-10 text-xs text-[#173D2B] placeholder:text-[#573B2C]/40 focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20 focus:border-[#173D2B]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-7 text-[#573B2C]/60 hover:text-[#173D2B] p-1 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || Boolean(oauthLoading)}
                className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In &amp; Add to Bag</span>
                    <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Registration Link */}
            <div className="pt-3 border-t border-[#E5DACB] flex items-center justify-between text-xs text-[#573B2C]">
              <span>New to Jhe&apos;s Cafe&apos;?</span>
              <Link
                href={`/register?redirect=${encodeURIComponent(returnUrl)}`}
                onClick={dismissLoginModal}
                className="font-bold text-[#173D2B] hover:text-[#315640] underline underline-offset-2"
              >
                Create Member Account →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
