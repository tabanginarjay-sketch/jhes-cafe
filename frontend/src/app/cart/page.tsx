"use client";

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
  Coffee,
  ShieldCheck,
  Sparkles,
  Lock,
} from "lucide-react";
import { useCart, CartItem } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { getProductImage } from "@/lib/productRegistry";

export default function CartPage() {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    setActiveEditItem,
    subtotal,
    totalCount,
  } = useCart();
  const { user } = useAuth();

  const handleEdit = (item: CartItem) => {
    setActiveEditItem(item);
  };

  return (
    <div className="min-h-screen bg-[#FFFCF7] text-[#173D2B] py-12 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5DACB] pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#315640]">
              <ShoppingBag className="w-4 h-4 text-[#C9AE8B]" />
              <span>Review Your Selection</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#173D2B]">
              Shopping Bag
            </h1>
            <p className="text-sm text-[#573B2C]">
              {totalCount} {totalCount === 1 ? "handcrafted item" : "handcrafted items"} in your order
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#173D2B] hover:text-[#315640] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#C9AE8B]" />
              <span>Add More Items</span>
            </Link>
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-rose-800 hover:text-rose-950 font-medium transition-colors cursor-pointer"
              >
                Clear Bag
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        {items.length === 0 ? (
          /* Empty Bag State */
          <div className="rounded-3xl border border-[#E5DACB] bg-[#F5F0E7]/40 p-12 sm:p-20 text-center space-y-6 max-w-2xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-[#E5DACB] flex items-center justify-center text-[#573B2C] mx-auto shadow-inner">
              <ShoppingBag className="w-10 h-10 opacity-60" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-bold text-[#173D2B]">
                Your shopping bag is empty
              </h2>
              <p className="text-sm text-[#573B2C] max-w-md mx-auto leading-relaxed">
                Explore our manual espresso bar, slow-steeped cold brews, and oven-fresh pastries. Every order is freshly formulated to your taste.
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
          /* Two Column Cart Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Column: Itemized Customizations (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-[#E5DACB] bg-white p-5 sm:p-6 shadow-xs hover:border-[#C9AE8B] transition-all flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-[#173D2B] border border-[#E5DACB] shrink-0 relative group">
                      <img
                        src={getProductImage(item)}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>

                    {/* Information */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#315640] px-2 py-0.5 rounded-full bg-[#F5F0E7]">
                          {item.category || "Specialty"}
                        </span>
                      </div>

                      <h3 className="font-serif text-lg sm:text-xl font-bold text-[#173D2B] truncate">
                        {item.name}
                      </h3>

                      {/* Customization Specification Pills */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5 text-[11px] font-medium text-[#573B2C]">
                        {item.size && (
                          <span className="px-2 py-0.5 rounded-lg bg-[#F5F0E7] border border-[#E5DACB]">
                            {item.size}
                          </span>
                        )}
                        {item.temperature && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                            item.temperature === "Hot"
                              ? "bg-amber-50 text-amber-900 border border-amber-200"
                              : "bg-cyan-50 text-cyan-900 border border-cyan-200"
                          }`}>
                            {item.temperature === "Hot" ? <Flame className="w-3 h-3 text-amber-600" /> : <Snowflake className="w-3 h-3 text-cyan-600" />}
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
                        ₱{item.price} each
                      </p>
                    </div>
                  </div>

                  {/* Quantity Stepper & Price & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#F5F0E7]">
                    <span className="font-serif text-xl sm:text-2xl font-bold text-[#173D2B]">
                      ₱{item.price * item.quantity}
                    </span>

                    <div className="flex items-center gap-3">
                      {/* Quantity Stepper */}
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

                      {/* Edit Customization Action */}
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-[#F5F0E7] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                        title="Edit recipe customizations"
                      >
                        <Sliders className="w-3 h-3 text-[#C9AE8B]" />
                        <span>Edit</span>
                      </button>

                      {/* Remove Action */}
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-rose-800/80 hover:text-rose-900 rounded-full hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Order Summary & Checkout (4 cols) */}
            <div className="lg:col-span-4 sticky top-28 space-y-6">
              <div className="rounded-3xl border border-[#E5DACB] bg-[#F5F0E7] p-6 sm:p-8 space-y-6 shadow-md">
                
                <div className="flex items-center justify-between border-b border-[#E5DACB] pb-3">
                  <h2 className="font-serif text-xl font-bold text-[#173D2B]">
                    Order Summary
                  </h2>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#573B2C]">
                    {totalCount} items
                  </span>
                </div>

                <div className="space-y-3 text-xs text-[#573B2C]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono font-bold text-sm text-[#173D2B]">₱{subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Handcrafted Packaging</span>
                    <span className="text-emerald-800 font-semibold font-mono">Complimentary</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Barista Preparation</span>
                    <span>~8-12 minutes</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Loyalty Beans Earned</span>
                    </span>
                    <span className="font-mono font-bold">+{Math.floor(subtotal / 50)} pts</span>
                  </div>

                  <div className="flex justify-between items-baseline pt-4 border-t border-[#E5DACB] text-[#173D2B]">
                    <span className="font-serif text-base font-bold">Total Due</span>
                    <span className="font-serif text-3xl font-bold tracking-tight">₱{subtotal}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                {user ? (
                  <Link
                    href="/order"
                    className="w-full py-4 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md hover:shadow-xl active:scale-98 flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                  </Link>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span>
                        Please authenticate to proceed to checkout and save your live order status.
                      </span>
                    </div>

                    <Link
                      href="/login?redirect=/order"
                      className="w-full py-3.5 rounded-full bg-[#173D2B] hover:bg-[#315640] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 text-center"
                    >
                      <span>Sign In to Checkout</span>
                      <ArrowRight className="w-4 h-4 text-[#C9AE8B]" />
                    </Link>

                    <Link
                      href="/register?redirect=/order"
                      className="w-full py-3 rounded-full border border-[#173D2B] text-[#173D2B] hover:bg-white text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 text-center"
                    >
                      <span>Register New Account</span>
                    </Link>
                  </div>
                )}

                {/* Assurance */}
                <div className="pt-2 border-t border-[#E5DACB]/80 flex items-center justify-center gap-2 text-[11px] text-[#573B2C] text-center">
                  <ShieldCheck className="w-4 h-4 text-[#315640]" />
                  <span>100% Satisfaction Guarantee · Artisan Freshness</span>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
