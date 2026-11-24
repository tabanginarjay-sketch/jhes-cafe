"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { CartDrawer } from "@/components/CartDrawer";
import { ProductCustomizerModal } from "@/components/common/ProductCustomizerModal";
import { LoginRequiredModal } from "@/components/auth/LoginRequiredModal";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

/**
 * Conditionally renders the public customer storefront chrome (Navbar, CartDrawer, Footer).
 * All /admin/* management routes render exclusively inside AdminLayout without customer shopping nav.
 */
export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    return <div className="min-h-screen flex flex-col bg-[#F5F0E7]">{children}</div>;
  }

  return (
    <>
      <Suspense fallback={<div className="h-20 bg-[#FFFCF7] border-b border-[#E5DACB]" />}>
        <Navbar />
      </Suspense>
      <CartDrawer />
      <ProductCustomizerModal />
      <LoginRequiredModal />
      <div className="flex-1 flex flex-col">{children}</div>
      <Footer />
    </>
  );
}
