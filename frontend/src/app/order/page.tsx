"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LegacyOrderRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = (searchParams.get("tab") || "").toLowerCase();
    if (tab === "history" || tab === "orders") {
      router.replace("/my-orders");
    } else {
      router.replace("/checkout");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-[#FFFCF7]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
        <span className="text-xs font-mono text-[#573B2C]">Redirecting...</span>
      </div>
    </div>
  );
}

/**
 * Backward-compatible redirect replacing the old monolithic /order page.
 * Checkout now lives exclusively at /checkout; order history & tracking live at /my-orders.
 */
export default function OrderRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center bg-[#FFFCF7]">
          <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
        </div>
      }
    >
      <LegacyOrderRedirect />
    </Suspense>
  );
}
