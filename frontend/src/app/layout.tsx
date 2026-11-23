import type { Metadata } from "next";
import { Suspense } from "react";
import { Montserrat, Lora } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { CartDrawer } from "@/components/CartDrawer";
import { ProductCustomizerModal } from "@/components/common/ProductCustomizerModal";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jhe's Cafe' — Your everyday coffee escape",
  description:
    "Great coffee. Cozy spaces. Moments worth slowing down for. Jhe's Cafe' modern specialty coffee lounge with warm walnut wood interiors, natural light, and artisan brews.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FFFCF7] text-[#173D2B] font-sans selection:bg-[#315640] selection:text-white">
        <AuthProvider>
          <CartProvider>
            <Suspense fallback={<div className="h-20 bg-[#FFFCF7] border-b border-[#E5DACB]" />}>
              <Navbar />
            </Suspense>
            <CartDrawer />
            <ProductCustomizerModal />
            <div className="flex-1 flex flex-col">{children}</div>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
