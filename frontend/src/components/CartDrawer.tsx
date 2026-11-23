"use client";

import Link from "next/link";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Lock, UserPlus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export function CartDrawer() {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
    subtotal,
    totalCount,
  } = useCart();
  const { user } = useAuth();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop Overlay */}
      <div
        className="absolute inset-0 bg-[#0F2A1D]/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FFFCF7] shadow-2xl flex flex-col border-l border-[#E5DACB]">
          
          {/* Header */}
          <div className="px-6 py-6 border-b border-[#E5DACB] flex items-center justify-between bg-[#F5F0E7]/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#173D2B] flex items-center justify-center text-[#C9AE8B]">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                  Your Coffee Bag
                </h2>
                <p className="text-xs text-[#573B2C]">
                  {totalCount} {totalCount === 1 ? "item" : "items"} selected
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-full text-[#573B2C] hover:bg-[#E5DACB] transition-colors cursor-pointer"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#F5F0E7] flex items-center justify-center text-[#573B2C]">
                  <ShoppingBag className="w-8 h-8 opacity-40" />
                </div>
                <div className="space-y-1">
                  <p className="font-serif text-lg font-medium text-[#173D2B]">
                    Your bag is empty
                  </p>
                  <p className="text-xs text-[#573B2C] max-w-xs leading-relaxed">
                    Explore our handcrafted espresso bar, single-origin pour-overs, and artisan pastries.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="mt-2 text-xs font-semibold uppercase tracking-wider text-[#173D2B] underline underline-offset-4 hover:text-[#315640]"
                >
                  Browse Menu →
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#E5DACB] bg-white p-4 space-y-3 shadow-2xs transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-serif text-base font-semibold text-[#173D2B]">
                        {item.name}
                      </h4>
                      <div className="text-[11px] text-[#573B2C] space-x-2 mt-0.5 font-medium">
                        {item.size && <span>• {item.size}</span>}
                        {item.temperature && <span>• {item.temperature}</span>}
                        {item.milk && <span>• {item.milk}</span>}
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold text-[#173D2B]">
                      ₱{item.price * item.quantity}
                    </span>
                  </div>

                  {/* Quantity & Delete Controls */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#F5F0E7]">
                    <div className="flex items-center border border-[#E5DACB] rounded-full overflow-hidden bg-[#FFFCF7]">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1.5 hover:bg-[#F5F0E7] text-[#573B2C] transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-bold font-mono text-[#173D2B]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1.5 hover:bg-[#F5F0E7] text-[#573B2C] transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-rose-800/80 hover:text-rose-900 flex items-center gap-1 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Remove</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout */}
          {items.length > 0 && (
            <div className="px-6 py-6 border-t border-[#E5DACB] bg-[#F5F0E7]/80 space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#573B2C]">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium">₱{subtotal}</span>
                </div>
                <div className="flex justify-between text-[#573B2C]">
                  <span>Pickup Prep Time</span>
                  <span>~5-8 mins</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#173D2B] pt-2 border-t border-[#E5DACB]">
                  <span className="font-serif">Total Due</span>
                  <span className="font-mono text-xl text-[#173D2B]">₱{subtotal}</span>
                </div>
              </div>

              {/* Auth Guard on Checkout */}
              {user ? (
                <Link
                  href="/order"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full rounded-xl bg-[#173D2B] hover:bg-[#315640] text-[#F5F0E7] py-3.5 px-4 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                </Link>
              ) : (
                <div className="space-y-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-tight flex items-start gap-2">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      Account required to buy. Sign in or register to confirm your order &amp; collect points.
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link
                      href="/login?redirect=/order"
                      onClick={() => setIsCartOpen(false)}
                      className="w-full rounded-xl bg-[#173D2B] hover:bg-[#315640] text-white py-3 px-4 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <span>Sign In to Buy</span>
                      <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                    </Link>

                    <Link
                      href="/register?redirect=/order"
                      onClick={() => setIsCartOpen(false)}
                      className="w-full rounded-xl border border-[#173D2B] text-[#173D2B] hover:bg-white py-2.5 px-4 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create Account</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
