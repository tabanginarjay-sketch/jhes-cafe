"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Coffee,
  ShoppingBag,
  Package,
  Layers,
  Boxes,
  Users,
  BadgeCheck,
  CreditCard,
  BarChart3,
  Settings,
  ArrowLeft,
  LayoutDashboard,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Live Orders", href: "/admin/orders", icon: ShoppingBag },
    { label: "Products Catalog", href: "/admin/products", icon: Package },
    { label: "Categories", href: "/admin/categories", icon: Layers },
    { label: "Inventory Stock", href: "/admin/inventory", icon: Boxes },
    { label: "Customers", href: "/admin/customers", icon: Users },
    { label: "Barista Staff", href: "/admin/staff", icon: BadgeCheck },
    { label: "Payments", href: "/admin/payments", icon: CreditCard },
    { label: "Sales Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F0E7]">
      {/* Admin Top Header */}
      <header className="bg-[#173D2B] text-white h-16 border-b border-[#0F2A1D] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#315640] flex items-center justify-center text-[#C9AE8B]">
            <Coffee className="w-4 h-4" />
          </div>
          <div>
            <span className="font-serif font-bold text-lg text-[#FFFCF7]">Jhe&apos;s Cafe&apos;</span>
            <span className="ml-2 text-[10px] uppercase font-mono tracking-widest text-[#C9AE8B] bg-[#0F2A1D] px-2 py-0.5 rounded">
              Manager Console
            </span>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#F5F0E7]/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#C9AE8B]" />
          <span>Back to Cafe Storefront</span>
        </Link>
      </header>

      {/* Admin Body Container */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 hidden md:block">
          <div className="rounded-3xl border border-[#E5DACB] bg-white p-4 space-y-1 shadow-2xs sticky top-24">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#573B2C] px-3 py-2">
              Management Modules
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#173D2B] text-white shadow-xs"
                      : "text-[#573B2C] hover:bg-[#F5F0E7] hover:text-[#173D2B]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#C9AE8B]" : "text-[#573B2C]"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Content View */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
