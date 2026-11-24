"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AppleAuthPage() {
  return (
    <div className="min-h-screen bg-[#FFFCF7] flex flex-col items-center justify-center p-4 text-[#173D2B]">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-lg border border-[#E5DACB] space-y-6 text-center">
        <div className="w-14 h-14 rounded-full bg-[#F5F0E7] text-[#173D2B] flex items-center justify-center mx-auto border border-[#E5DACB]">
          <ShieldAlert className="w-7 h-7 text-[#315640]" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold text-[#173D2B]">
            Apple Sign-In Unavailable
          </h1>
          <p className="text-xs text-[#573B2C] leading-relaxed">
            Sign in with Apple is not enabled on this deployment. Please sign in securely with your verified Google account, Facebook account, or email &amp; password.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md"
          >
            Go to Sign In
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 text-xs text-[#573B2C] hover:text-[#173D2B] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Storefront</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
