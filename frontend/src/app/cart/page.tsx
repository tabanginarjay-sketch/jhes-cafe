"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  Sliders,
  Flame,
  Snowflake,
  ShieldCheck,
  Sparkles,
  Lock,
  Tag,
  ChevronRight,
  X,
} from "lucide-react";
import { useCart, CartItem } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { getProductImage } from "@/lib/productRegistry";
import { BRAND_CONFIG } from "@/lib/brandConfig";

export default function CartPage() {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    setActiveEditItem,
    subtotal,
    totalCount,
    appliedPromoCode,
    setAppliedPromoCode,
  } = useCart();
  const { user, isLoading } = useAuth();

  const [promoInput, setPromoInput] = useState(appliedPromoCode || "");
  const [promoFeedback, setPromoFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (appliedPromoCode) {
      setPromoInput(appliedPromoCode);
    }
  }, [appliedPromoCode]);

  const handleEdit = (item: CartItem) => {
    setActiveEditItem(item);
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = promoInput.trim().toUpperCase();
    if (!clean) {
      setAppliedPromoCode(null);
      setPromoFeedback(null);
      return;
    }
    if (clean === BRAND_CONFIG.promo.code) {
      setAppliedPromoCode(BRAND_CONFIG.promo.code);
      setPromoFeedback({
        type: "success",
        text: `Demo promo ${BRAND_CONFIG.promo.code} applied (15% off) — carried into checkout.`,
      });
    } else {
      setAppliedPromoCode(null);
      setPromoFeedback({
        type: "error",
        text: `Unknown promo code "${clean}". Try ${BRAND_CONFIG.promo.code}.`,
      });
    }
  };

  const handleClearPromo = () => {
    setAppliedPromoCode(null);
    setPromoInput("");
    setPromoFeedback(null);
  };

  const isPromoValid = appliedPromoCode === BRAND_CONFIG.promo.code;
  const discountAmount = isPromoValid ? Math.round(subtotal * BRAND_CONFIG.promo.discountRate) : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#FFFCF7]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#173D2B]/30 border-t-[#173D2B] rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#573B2C]">Loading your shopping bag...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFCF7] text-[#173D2B] py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#573B2C]">
          <Link href="/" className="hover:text-[#173D2B] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <span className="font-semibold text-[#173D2B]">Cart</span>
        </nav>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5DACB] pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#315640]">
              <ShoppingBag className="w-4 h-4 text-[#C9AE8B]" />
              <span>Review Your Selection</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#173D2B]">
              Shopping Cart
            </h1>
            <p className="text-sm text-[#573B2C]">
              {totalCount} {totalCount === 1 ? "handcrafted item" : "handcrafted items"} saved to your account bag
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#173D2B] hover:text-[#315640] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#C9AE8B]" />
              <span>Continue Browsing Menu</span>
            </Link>
            {user && items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-rose-800 hover:text-rose-950 font-medium transition-colors cursor-pointer"
              >
                Clear Cart
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        {!user ? (
          <div className="rounded-3xl border border-[#E5DACB] bg-white p-10 sm:p-16 text-center space-y-6 max-w-xl mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#F5F0E7] flex items-center justify-center text-[#173D2B] mx-auto">
              <Lock className="w-8 h-8 text-[#315640]" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-bold text-[#173D2B]">
                Sign in to access your shopping cart
              </h2>
              <p className="text-sm text-[#573B2C] max-w-md mx-auto leading-relaxed">
                Shopping bags at <strong>Jhe&apos;s Cafe&apos;</strong> are securely linked to your member account so your customized drinks and pastries persist across sessions and devices.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/login?redirect=/cart"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md inline-flex items-center justify-center gap-2"
              >
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
              </Link>
              <Link
                href="/register?redirect=/cart"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold uppercase tracking-wider transition-all inline-flex items-center justify-center"
              >
                <span>Create Account</span>
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-[#E5DACB] bg-[#F5F0E7]/40 p-12 sm:p-20 text-center space-y-6 max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-[#E5DACB] flex items-center justify-center text-[#573B2C] mx-auto shadow-inner">
              <ShoppingBag className="w-10 h-10 opacity-60" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-bold text-[#173D2B]">
                Your shopping cart is empty
              </h2>
              <p className="text-sm text-[#573B2C] max-w-md mx-auto leading-relaxed">
                Explore our manual espresso bar, slow-steeped cold brews, and freshly baked pastries. Every order is crafted to your exact customization.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md hover:shadow-lg"
              >
                <span>Explore Our Menu</span>
                <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Itemized Customizations */}
            <div className="lg:col-span-8 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-[#E5DACB] bg-white p-5 sm:p-6 shadow-xs hover:border-[#C9AE8B] transition-all flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-[#173D2B] border border-[#E5DACB] shrink-0 relative group">
                      <img
                        src={getProductImage(item)}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#315640] px-2 py-0.5 rounded-full bg-[#F5F0E7] inline-block">
                        {item.category || "Specialty"}
                      </span>

                      <h3 className="font-serif text-lg sm:text-xl font-bold text-[#173D2B] leading-snug">
                        {item.name}
                      </h3>

                      <div className="flex flex-wrap gap-1.5 pt-0.5 text-[11px] font-medium text-[#573B2C]">
                        {item.size && (
                          <span className="px-2 py-0.5 rounded-lg bg-[#F5F0E7] border border-[#E5DACB]">
                            {item.size}
                          </span>
                        )}
                        {item.temperature && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                              item.temperature === "Hot"
                                ? "bg-amber-50 text-amber-900 border border-amber-200"
                                : "bg-cyan-50 text-cyan-900 border border-cyan-200"
                            }`}
                          >
                            {item.temperature === "Hot" ? (
                              <Flame className="w-3 h-3 text-amber-600" />
                            ) : (
                              <Snowflake className="w-3 h-3 text-cyan-600" />
                            )}
                            <span>{item.temperature}</span>
                          </span>
                        )}
                        {item.milk && !item.isBakery && (
                          <span className="px-2 py-0.5 rounded-lg bg-[#F5F0E7] border border-[#E5DACB]">
                            {item.milk.replace(" Milk", "")}
                          </span>
                        )}
                        {item.sweetness !== undefined && !item.isBakery && (
                          <span className="px-2 py-0.5 rounded-lg bg-[#F5F0E7] border border-[#E5DACB]">
                            {item.sweetness}% Sweetness
                          </span>
                        )}
                        {item.extraShots && item.extraShots > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold">
                            +{item.extraShots} Extra Shot
                          </span>
                        )}
                        {item.toppings && item.toppings.length > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-[#173D2B]/10 text-[#173D2B]">
                            +{item.toppings.length} topping(s)
                          </span>
                        )}
                        {item.servingStyle && (
                          <span className="px-2 py-0.5 rounded-lg bg-[#F5F0E7] border border-[#E5DACB]">
                            {item.servingStyle}
                          </span>
                        )}
                        {item.finishes && item.finishes.length > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
                            +{item.finishes.length} finish(es)
                          </span>
                        )}
                        {item.warming && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                            {item.warming}
                          </span>
                        )}
                        {item.addOns && item.addOns.length > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
                            +{item.addOns.length} add-on(s)
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-mono text-[#573B2C]/80 pt-1">
                        ₱{item.price.toFixed(2)} unit price
                      </p>
                    </div>
                  </div>

                  {/* Quantity Stepper & Subtotal & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#F5F0E7]">
                    <span className="font-serif text-xl sm:text-2xl font-bold text-[#173D2B]">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </span>

                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center border border-[#E5DACB] rounded-full overflow-hidden bg-[#FFFCF7] shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="px-2.5 py-1.5 hover:bg-[#F5F0E7] text-[#573B2C] transition-colors cursor-pointer"
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
                          className="px-2.5 py-1.5 hover:bg-[#F5F0E7] text-[#573B2C] transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                        title="Edit customization"
                      >
                        <Sliders className="w-3 h-3 text-[#C9AE8B]" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-rose-800/80 hover:text-rose-900 rounded-full hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove item"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Summary, Promo Code & Checkout CTA */}
            <div className="lg:col-span-4 sticky top-28 space-y-6">
              <div className="rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] p-6 sm:p-8 space-y-6 shadow-md">
                <div className="flex items-center justify-between border-b border-[#E5DACB] pb-3">
                  <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                    Cart Summary
                  </h2>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#573B2C]">
                    {totalCount} {totalCount === 1 ? "item" : "items"}
                  </span>
                </div>

                {/* Promo Code Input */}
                <form onSubmit={handleApplyPromo} className="space-y-2">
                  <label
                    htmlFor="cart-promo-code"
                    className="text-[11px] font-bold uppercase tracking-wider text-[#573B2C] flex items-center gap-1.5"
                  >
                    <Tag className="w-3.5 h-3.5 text-[#315640]" />
                    <span>Promo Code (Demo: {BRAND_CONFIG.promo.code})</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="cart-promo-code"
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder={BRAND_CONFIG.promo.code}
                      className="flex-1 rounded-xl border border-[#E5DACB] bg-white px-3.5 py-2.5 text-xs font-mono uppercase text-[#173D2B] focus:outline-hidden focus:border-[#173D2B]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                  {isPromoValid && (
                    <div className="flex items-center justify-between text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                      <span className="font-semibold">
                        {appliedPromoCode} applied (-15%)
                      </span>
                      <button
                        type="button"
                        onClick={handleClearPromo}
                        aria-label="Remove promo code"
                        className="text-emerald-900 hover:text-rose-800 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {promoFeedback && !isPromoValid && (
                    <p className="text-[11px] text-rose-800">{promoFeedback.text}</p>
                  )}
                </form>

                {/* Price Breakdown */}
                <div className="space-y-3 text-xs text-[#573B2C]">
                  <div className="flex justify-between">
                    <span>Cart Subtotal</span>
                    <span className="font-mono font-bold text-sm text-[#173D2B]">
                      ₱{subtotal.toFixed(2)}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-800 font-semibold">
                      <span>Promo Discount ({appliedPromoCode})</span>
                      <span className="font-mono">-₱{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Handcrafted Packaging</span>
                    <span className="text-emerald-800 font-semibold font-mono">Complimentary</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Bean Points to Earn</span>
                    </span>
                    <span className="font-mono font-bold">+{Math.floor(finalTotal / 50)} pts</span>
                  </div>

                  <div className="flex justify-between items-baseline pt-4 border-t border-[#E5DACB] text-[#173D2B]">
                    <span className="font-serif text-base font-bold">Estimated Total</span>
                    <span className="font-serif text-3xl font-bold tracking-tight">
                      ₱{finalTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Proceed to Dedicated Checkout */}
                <Link
                  href="/checkout"
                  prefetch={false}
                  className="w-full py-4 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md hover:shadow-xl active:scale-98 flex items-center justify-center gap-2"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                </Link>

                <div className="pt-2 border-t border-[#E5DACB]/80 flex items-center justify-center gap-2 text-[11px] text-[#573B2C] text-center">
                  <ShieldCheck className="w-4 h-4 text-[#315640]" />
                  <span>Prices validated by server upon checkout</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
