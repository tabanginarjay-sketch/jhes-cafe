"use client";

import Link from "next/link";
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Lock,
  UserPlus,
  Sliders,
  Flame,
  Snowflake,
  Coffee,
  Sparkles,
} from "lucide-react";
import { useCart, CartItem } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { getProductImage } from "@/lib/productRegistry";

export function CartDrawer() {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
    setActiveEditItem,
    subtotal,
    totalCount,
  } = useCart();
  const { user } = useAuth();

  if (!isCartOpen) return null;

  const handleEditItem = (item: CartItem) => {
    setIsCartOpen(false);
    setActiveEditItem(item);
  };

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
          <div className="px-6 py-5 border-b border-[#E5DACB] flex items-center justify-between bg-[#F5F0E7]/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#173D2B] flex items-center justify-center text-[#C9AE8B] shadow-xs">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#173D2B]">
                  Your Order Bag
                </h2>
                <p className="text-xs text-[#573B2C]">
                  {totalCount} {totalCount === 1 ? "item" : "items"} formulated
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
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#F5F0E7] flex items-center justify-center text-[#573B2C]">
                  <ShoppingBag className="w-8 h-8 opacity-40" />
                </div>
                <div className="space-y-1">
                  <p className="font-serif text-lg font-medium text-[#173D2B]">
                    Your order bag is empty
                  </p>
                  <p className="text-xs text-[#573B2C] max-w-xs leading-relaxed">
                    Select any handcrafted espresso, slow-steeped cold brew, or fresh French viennoiserie pastry to customize.
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
                  className="rounded-2xl border border-[#E5DACB] bg-white p-3.5 sm:p-4 space-y-3 shadow-xs hover:border-[#C9AE8B] transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* Item Thumbnail */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#173D2B] border border-[#E5DACB] shrink-0">
                      <img
                        src={getProductImage(item)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-serif text-sm sm:text-base font-bold text-[#173D2B] truncate">
                          {item.name}
                        </h4>
                        <span className="font-mono text-sm font-bold text-[#173D2B] shrink-0">
                          ₱{item.price * item.quantity}
                        </span>
                      </div>

                      {/* Customization Specs Breakdown */}
                      <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-medium text-[#573B2C]">
                        {item.size && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#F5F0E7] border border-[#E5DACB]">
                            {item.size}
                          </span>
                        )}
                        {item.temperature && (
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] ${
                            item.temperature === "Hot"
                              ? "bg-amber-50 text-amber-900 border border-amber-200"
                              : "bg-cyan-50 text-cyan-900 border border-cyan-200"
                          }`}>
                            {item.temperature === "Hot" ? <Flame className="w-2.5 h-2.5 text-amber-600" /> : <Snowflake className="w-2.5 h-2.5 text-cyan-600" />}
                            <span>{item.temperature}</span>
                          </span>
                        )}
                        {item.milk && !item.isBakery && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#F5F0E7] border border-[#E5DACB]">
                            {item.milk.replace(" Milk", "")}
                          </span>
                        )}
                        {item.sweetness !== undefined && !item.isBakery && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#F5F0E7] border border-[#E5DACB]">
                            {item.sweetness}% sweet
                          </span>
                        )}
                        {item.extraShots && item.extraShots > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold">
                            +{item.extraShots} Shot
                          </span>
                        )}
                        {item.warming && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                            {item.warming}
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-[#573B2C]/70 font-mono mt-1">
                        ₱{item.price} each
                      </p>
                    </div>
                  </div>

                  {/* Actions: Stepper, Edit Button, Remove Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#F5F0E7]">
                    <div className="flex items-center border border-[#E5DACB] rounded-full overflow-hidden bg-[#FFFCF7]">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 px-2 hover:bg-[#F5F0E7] text-[#573B2C] transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2.5 text-xs font-bold font-mono text-[#173D2B]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 px-2 hover:bg-[#F5F0E7] text-[#573B2C] transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleEditItem(item)}
                        className="text-[11px] font-semibold text-[#173D2B] hover:text-[#315640] flex items-center gap-1 p-1 hover:underline cursor-pointer"
                      >
                        <Sliders className="w-3 h-3 text-[#C9AE8B]" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-[11px] text-rose-800/80 hover:text-rose-900 flex items-center gap-1 p-1 hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout */}
          {items.length > 0 && (
            <div className="px-6 py-5 border-t border-[#E5DACB] bg-[#F5F0E7]/90 space-y-3.5">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[#573B2C]">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium">₱{subtotal}</span>
                </div>
                <div className="flex justify-between text-[#573B2C]">
                  <span>Packaging &amp; Prep</span>
                  <span className="text-emerald-800 font-semibold">Complimentary</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#173D2B] pt-2 border-t border-[#E5DACB]">
                  <span className="font-serif">Total Due</span>
                  <span className="font-mono text-xl text-[#173D2B]">₱{subtotal}</span>
                </div>
              </div>

              {/* View Full Cart Page Link */}
              <div className="pt-1">
                <Link
                  href="/cart"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-2.5 rounded-xl border border-[#173D2B] text-[#173D2B] hover:bg-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                >
                  <span>Review Order in Cart Page</span>
                </Link>
              </div>

              {/* Auth Guard on Checkout */}
              {user ? (
                <Link
                  href="/order"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full rounded-full bg-[#173D2B] hover:bg-[#315640] text-[#F5F0E7] py-3.5 px-4 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                </Link>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-tight flex items-start gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      Sign in or create an account to place your order and earn loyalty bean rewards.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/login?redirect=/order"
                      onClick={() => setIsCartOpen(false)}
                      className="rounded-full bg-[#173D2B] hover:bg-[#315640] text-white py-2.5 px-3 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all text-center"
                    >
                      <span>Sign In</span>
                    </Link>

                    <Link
                      href="/register?redirect=/order"
                      onClick={() => setIsCartOpen(false)}
                      className="rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-white py-2.5 px-3 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all text-center"
                    >
                      <span>Register</span>
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
