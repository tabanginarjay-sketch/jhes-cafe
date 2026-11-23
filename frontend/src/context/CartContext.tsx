"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface CartItem {
  id: string;
  productId?: string;
  slug?: string;
  name: string;
  category?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  isBakery?: boolean;

  // Drink customizations
  size?: string;
  temperature?: "Hot" | "Iced";
  milk?: string;
  sweetness?: number;
  extraShots?: number;
  toppings?: string[];

  // Pastry customizations
  warming?: string;
  addOns?: string[];

  customizationSummary?: string;
}

export interface FlyingFlyData {
  imageUrl: string;
  startTop: number;
  startLeft: number;
  targetX: number;
  targetY: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (
    item: Partial<CartItem> & { name: string; price: number },
    quantity?: number,
    sourceElement?: HTMLElement | null
  ) => void;
  updateItem: (id: string, updatedFields: Partial<CartItem>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  totalCount: number;
  subtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  toggleCart: () => void;

  // Customization Editing
  activeEditItem: CartItem | null;
  setActiveEditItem: (item: CartItem | null) => void;

  // Quick Customizer Modal for card clicks
  quickCustomizeProduct: any | null;
  setQuickCustomizeProduct: (product: any | null) => void;

  // Toast feedback
  toastMessage: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeEditItem, setActiveEditItem] = useState<CartItem | null>(null);
  const [quickCustomizeProduct, setQuickCustomizeProduct] = useState<any | null>(null);

  // Flying Add-to-Cart Animation State
  const [flyingItem, setFlyingItem] = useState<FlyingFlyData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("jhes_cafe_cart");
      if (saved) {
        setItems(JSON.parse(saved));
      } else {
        // Fallback to legacy key if exists
        const legacy = localStorage.getItem("brew_and_co_cart");
        if (legacy) {
          setItems(JSON.parse(legacy));
        }
      }
    } catch {
      // Ignore storage errors
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem("jhes_cafe_cart", JSON.stringify(items));
      } catch {
        // Ignore storage errors
      }
    }
  }, [items, isHydrated]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  const triggerFlyAnimation = useCallback(
    (imageUrl: string, sourceElement?: HTMLElement | null) => {
      if (!sourceElement || typeof window === "undefined") return;

      const sourceRect = sourceElement.getBoundingClientRect();
      const cartBtn = document.getElementById("navbar-cart-btn");
      const cartRect = cartBtn ? cartBtn.getBoundingClientRect() : null;

      const targetX = cartRect
        ? cartRect.left + cartRect.width / 2 - (sourceRect.left + sourceRect.width / 2)
        : window.innerWidth - sourceRect.left - 60;
      const targetY = cartRect
        ? cartRect.top + cartRect.height / 2 - (sourceRect.top + sourceRect.height / 2)
        : -sourceRect.top + 30;

      setFlyingItem({
        imageUrl,
        startTop: sourceRect.top,
        startLeft: sourceRect.left,
        targetX,
        targetY,
      });

      // Clear after animation duration
      setTimeout(() => {
        setFlyingItem(null);
        // Subtle cart button bounce
        const btn = document.getElementById("navbar-cart-btn");
        if (btn) {
          btn.classList.remove("animate-cart-pop");
          void btn.offsetWidth; // trigger reflow
          btn.classList.add("animate-cart-pop");
        }
      }, 750);
    },
    []
  );

  const addItem = (
    itemData: Partial<CartItem> & { name: string; price: number },
    quantity: number = 1,
    sourceElement?: HTMLElement | null
  ) => {
    const qty = quantity || itemData.quantity || 1;
    const baseSlug = itemData.slug || itemData.productId || itemData.id || "coffee";
    const productId = itemData.productId || itemData.id || baseSlug;

    // Trigger visual flight towards cart
    if (itemData.imageUrl) {
      triggerFlyAnimation(itemData.imageUrl, sourceElement);
    }

    // Toast notification
    showToast(`Added to your bag! • ${itemData.name}`);

    // Create unique signature to group identical customizations
    const signature = [
      productId,
      itemData.size || "default",
      itemData.temperature || "default",
      itemData.milk || "default",
      itemData.sweetness !== undefined ? `${itemData.sweetness}%` : "default",
      itemData.extraShots || 0,
      (itemData.toppings || []).sort().join("_"),
      itemData.warming || "default",
      (itemData.addOns || []).sort().join("_"),
    ].join("|");

    const completeItem: CartItem = {
      id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productId,
      slug: baseSlug,
      name: itemData.name,
      category: itemData.category || "Specialty Drink",
      price: itemData.price,
      quantity: qty,
      imageUrl: itemData.imageUrl,
      isBakery: itemData.isBakery,
      size: itemData.size,
      temperature: itemData.temperature,
      milk: itemData.milk,
      sweetness: itemData.sweetness,
      extraShots: itemData.extraShots,
      toppings: itemData.toppings,
      warming: itemData.warming,
      addOns: itemData.addOns,
      customizationSummary: itemData.customizationSummary,
    };

    setItems((prev) => {
      // Find matching item with exact same customizations
      const existingIdx = prev.findIndex((i) => {
        const iSig = [
          i.productId,
          i.size || "default",
          i.temperature || "default",
          i.milk || "default",
          i.sweetness !== undefined ? `${i.sweetness}%` : "default",
          i.extraShots || 0,
          (i.toppings || []).sort().join("_"),
          i.warming || "default",
          (i.addOns || []).sort().join("_"),
        ].join("|");
        return iSig === signature;
      });

      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + qty,
        };
        return next;
      }

      return [...prev, completeItem];
    });

    // Auto open cart drawer after fly animation completes
    setTimeout(() => {
      setIsCartOpen(true);
    }, 600);
  };

  const updateItem = (id: string, updatedFields: Partial<CartItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            ...updatedFields,
          };
        }
        return item;
      })
    );
    showToast("Customization updated!");
    setIsCartOpen(true);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const toggleCart = () => setIsCartOpen((prev) => !prev);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalCount,
        subtotal,
        isCartOpen,
        setIsCartOpen,
        toggleCart,
        activeEditItem,
        setActiveEditItem,
        quickCustomizeProduct,
        setQuickCustomizeProduct,
        toastMessage,
      }}
    >
      {children}

      {/* 1. Global Flying Product Image Overlay */}
      {flyingItem && (
        <div
          className="fixed z-50 pointer-events-none rounded-2xl overflow-hidden shadow-2xl border-2 border-[#C9AE8B] animate-fly-to-cart bg-[#173D2B]"
          style={
            {
              top: `${flyingItem.startTop}px`,
              left: `${flyingItem.startLeft}px`,
              width: "72px",
              height: "72px",
              "--target-x": `${flyingItem.targetX}px`,
              "--target-y": `${flyingItem.targetY}px`,
            } as React.CSSProperties
          }
        >
          <img
            src={flyingItem.imageUrl}
            alt="Flying drink"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* 2. Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-subtle pointer-events-none">
          <div className="bg-[#173D2B] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#C9AE8B]/40 flex items-center gap-3 backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide">{toastMessage}</span>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
