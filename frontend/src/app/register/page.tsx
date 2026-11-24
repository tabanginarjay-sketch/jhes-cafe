"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Coffee,
  ShieldCheck,
  Gift,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { JhesCafeLogo } from "@/components/brand/JhesCafeLogo";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import type { UserData } from "@/lib/api";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectTarget =
    rawRedirect &&
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//") &&
    !rawRedirect.startsWith("/login") &&
    !rawRedirect.startsWith("/register")
      ? rawRedirect
      : "/";

  const { user, isAuthenticated, isLoading: authLoading, registerWithEmail } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = useState<UserData | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !registeredUser) {
      router.refresh();
      router.replace(redirectTarget);
    }
  }, [authLoading, isAuthenticated, user, registeredUser, redirectTarget, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form validations
    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please provide a valid email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please choose a password for your account.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanPhone = phone.replace(/[^0-9+]/g, "").trim();
      const created = await registerWithEmail({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: cleanPhone || undefined,
      });

      setRegisteredUser(created);

      // Auto-redirect to target page or home after celebration
      router.refresh();
      setTimeout(() => {
        router.replace(redirectTarget);
      }, 1600);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Registration failed. Please check your details and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if ((authLoading || (isAuthenticated && user)) && !registeredUser) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 bg-[#FFFCF7] min-h-[70vh]">
        <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
        <p className="text-xs font-mono text-[#573B2C]">
          {isAuthenticated ? "Already signed in — redirecting..." : "Checking your session..."}
        </p>
      </div>
    );
  }

  return (
    <div className="py-12 sm:py-20 flex-1 flex items-center justify-center bg-[#FFFCF7] px-4">
      <div className="w-full max-w-xl space-y-8">

        {/* Success Modal / Banner when user successfully created */}
        {registeredUser ? (
          <div className="rounded-3xl border border-[#315640]/30 bg-[#F5F0E7] p-8 sm:p-12 text-center space-y-6 shadow-xl animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-[#173D2B] text-[#C9AE8B] flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#315640]">
                Account Created Successfully
              </span>
              <h2 className="font-serif text-3xl font-bold text-[#173D2B]">
                Welcome, {registeredUser.full_name}!
              </h2>
              <p className="text-sm text-[#573B2C] max-w-md mx-auto leading-relaxed">
                Your member account has been registered with <strong>Jhe&apos;s Cafe&apos;</strong>. You are now a recognized member of our Highland Reserve coffee club.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E5DACB] text-xs font-mono text-[#573B2C]">
              <span>Customer ID:</span>
              <strong className="text-[#173D2B]">{registeredUser.id}</strong>
              <span className="text-emerald-700 font-semibold ml-2">● Active</span>
            </div>

            <div className="pt-2">
              <Link
                href={redirectTarget}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md hover:shadow-lg"
              >
                <span>
                  Continue to{" "}
                  {redirectTarget === "/checkout" || redirectTarget === "/order"
                    ? "Checkout"
                    : redirectTarget === "/my-orders"
                      ? "My Orders"
                      : redirectTarget === "/account"
                        ? "My Account"
                        : redirectTarget === "/our-cafe"
                          ? "Table Booking"
                          : redirectTarget.startsWith("/menu")
                            ? "Menu"
                            : "Home"}
                </span>
                <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
              </Link>
            </div>
          </div>
        ) : (
          /* Registration Form Card */
          <div className="rounded-3xl border border-[#E5DACB] bg-white p-8 sm:p-12 shadow-md space-y-8">

            {/* Header with Emblem Logo */}
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <JhesCafeLogo variant="emblem" size="md" />
              </div>
              <h1 className="font-serif text-3xl font-bold text-[#173D2B] tracking-tight">
                Join Jhe&apos;s Cafe&apos;
              </h1>
              <p className="text-xs sm:text-sm text-[#573B2C] max-w-md mx-auto leading-relaxed">
                Unlock handcrafted drink rewards, personalized bean customizations, and seamless table bookings.
              </p>
            </div>

            {/* Social Sign Up with Google & Apple */}
            <SocialAuthButtons mode="signup" redirectTarget={redirectTarget} />

            {/* Error Alert if any */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs leading-relaxed">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block">Registration Note</strong>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">

              {/* Full Name */}
              <div>
                <label htmlFor="reg-name" className="font-semibold text-[#173D2B] block mb-1.5">
                  Full Name <span className="text-amber-800">*</span>
                </label>
                <input
                  id="reg-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Maria Clara Santos"
                  className="w-full rounded-xl border border-[#E5DACB] p-3.5 text-xs text-[#173D2B] placeholder:text-[#573B2C]/40 focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20 focus:border-[#173D2B] transition-all bg-[#FFFCF7]"
                />
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-email" className="font-semibold text-[#173D2B] block mb-1.5">
                    Email Address <span className="text-amber-800">*</span>
                  </label>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="maria@example.com"
                    className="w-full rounded-xl border border-[#E5DACB] p-3.5 text-xs text-[#173D2B] placeholder:text-[#573B2C]/40 focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20 focus:border-[#173D2B] transition-all bg-[#FFFCF7]"
                  />
                </div>

                <div>
                  <label htmlFor="reg-phone" className="font-semibold text-[#173D2B] block mb-1.5">
                    Mobile Number <span className="text-[10px] text-[#573B2C]/70">(Optional)</span>
                  </label>
                  <input
                    id="reg-phone"
                    name="tel"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+63 917 123 4567"
                    className="w-full rounded-xl border border-[#E5DACB] p-3.5 text-xs text-[#173D2B] placeholder:text-[#573B2C]/40 focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20 focus:border-[#173D2B] transition-all bg-[#FFFCF7]"
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label htmlFor="reg-pass" className="font-semibold text-[#173D2B] block mb-1.5">
                    Password <span className="text-amber-800">*</span>
                  </label>
                  <input
                    id="reg-pass"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-[#E5DACB] p-3.5 text-xs text-[#173D2B] placeholder:text-[#573B2C]/40 focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20 focus:border-[#173D2B] transition-all bg-[#FFFCF7] pr-10"
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

                <div>
                  <label htmlFor="reg-confirm" className="font-semibold text-[#173D2B] block mb-1.5">
                    Confirm Password <span className="text-amber-800">*</span>
                  </label>
                  <input
                    id="reg-confirm"
                    name="confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full rounded-xl border border-[#E5DACB] p-3.5 text-xs text-[#173D2B] placeholder:text-[#573B2C]/40 focus:outline-none focus:ring-2 focus:ring-[#173D2B]/20 focus:border-[#173D2B] transition-all bg-[#FFFCF7]"
                  />
                </div>
              </div>

              {/* Membership Benefits Box */}
              <div className="p-4 rounded-2xl bg-[#F5F0E7]/70 border border-[#E5DACB] space-y-2 mt-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#315640] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C9AE8B]" />
                  Your Jhe&apos;s Cafe&apos; Member Perks (Portfolio Demo):
                </span>
                <ul className="text-[11px] text-[#573B2C] space-y-1 list-disc list-inside">
                  <li>Earn 1 bean point for every ₱50 spent on drinks and pastries.</li>
                  <li>Complimentary drink reward voucher on your birthday month.</li>
                  <li>Priority table &amp; lounge reservations.</li>
                </ul>
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-4 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating your account...</span>
                  </div>
                ) : (
                  <>
                    <span>Create My Account</span>
                    <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Sign-in prompt */}
            <div className="pt-4 border-t border-[#E5DACB] text-center text-xs text-[#573B2C]">
              Already have an account?{" "}
              <Link
                href={rawRedirect ? `/login?redirect=${encodeURIComponent(redirectTarget)}` : "/login"}
                className="font-bold text-[#173D2B] hover:text-[#315640] underline underline-offset-2 ml-1"
              >
                Sign In here
              </Link>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex items-center justify-center bg-[#FFFCF7]">
          <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
