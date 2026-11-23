"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { getProductImage } from "@/lib/productRegistry";

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

  // Pastry & Food customizations
  warming?: string;
  addOns?: string[];
  servingStyle?: string;
  finishes?: string[];

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

  // Mutex state to prevent rapid double-clicks
  isAddingToCart: boolean;

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
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);

  // Flying Add-to-Cart Animation State
  const [flyingItem, setFlyingItem] = useState<FlyingFlyData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const flyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("jhes_cafe_cart");
      if (saved) {
        setItems(JSON.parse(saved));
      } else {
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

      if (flyTimeoutRef.current) {
        clearTimeout(flyTimeoutRef.current);
      }

      flyTimeoutRef.current = setTimeout(() => {
        setFlyingItem(null);
        // Subtle cart button bounce feedback
        const btn = document.getElementById("navbar-cart-btn");
        if (btn) {
          btn.classList.remove("animate-cart-pop");
          void btn.offsetWidth; // trigger reflow
          btn.classList.add("animate-cart-pop");
        }
      }, 700);
    },
    []
  );

  const addItem = (
    itemData: Partial<CartItem> & { name: string; price: number },
    quantity: number = 1,
    sourceElement?: HTMLElement | null
  ) => {
    // Click mutex: prevent rapid overlapping invocations
    if (isAddingToCart) return;
    setIsAddingToCart(true);

    const qty = quantity || itemData.quantity || 1;
    const baseSlug = itemData.slug || itemData.productId || itemData.id || "coffee";
    const productId = itemData.productId || itemData.id || baseSlug;
    const resolvedImage = getProductImage({
      image_url: itemData.imageUrl,
      slug: baseSlug,
      name: itemData.name,
      id: productId,
    });

    // 1. Launch smooth curved fly-to-cart animation immediately (0ms)
    triggerFlyAnimation(resolvedImage, sourceElement);

    // 2. Toast feedback
    showToast(`Added to your bag! • ${itemData.name}`);

    // 3. Strict signature: guarantees that different customizations of the same product
    // (e.g. Spanish Latte Grande Hot 50% vs Tall Iced 100%) remain distinct line items
    const signature = [
      productId,
      itemData.size || "standard",
      itemData.temperature || "standard",
      itemData.milk || "standard",
      itemData.sweetness !== undefined ? `${itemData.sweetness}%` : "standard",
      itemData.extraShots || 0,
      (itemData.toppings || []).slice().sort().join("_"),
      itemData.warming || "standard",
      (itemData.addOns || []).slice().sort().join("_"),
      itemData.servingStyle || "standard",
      (itemData.finishes || []).slice().sort().join("_"),
    ].join("|");

    const completeItem: CartItem = {
      id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productId,
      slug: baseSlug,
      name: itemData.name,
      category: itemData.category || "Specialty Item",
      price: itemData.price,
      quantity: qty,
      imageUrl: resolvedImage,
      isBakery: itemData.isBakery,
      size: itemData.size,
      temperature: itemData.temperature,
      milk: itemData.milk,
      sweetness: itemData.sweetness,
      extraShots: itemData.extraShots,
      toppings: itemData.toppings,
      warming: itemData.warming,
      addOns: itemData.addOns,
      servingStyle: itemData.servingStyle,
      finishes: itemData.finishes,
      customizationSummary: itemData.customizationSummary,
    };

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => {
        const iSig = [
          i.productId,
          i.size || "standard",
          i.temperature || "standard",
          i.milk || "standard",
          i.sweetness !== undefined ? `${i.sweetness}%` : "standard",
          i.extraShots || 0,
          (i.toppings || []).slice().sort().join("_"),
          i.warming || "standard",
          (i.addOns || []).slice().sort().join("_"),
          i.servingStyle || "standard",
          (i.finishes || []).slice().sort().join("_"),
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

    // 4. Open cart drawer strictly AFTER flight completes (750ms)
    setTimeout(() => {
      setIsCartOpen(true);
      setIsAddingToCart(false);
    }, 750);
  };

  const updateItem = (id: string, updatedFields: Partial<CartItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const merged = { ...item, ...updatedFields };
          return merged;
        }
        return item;
      })
    );
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
    try {
      localStorage.removeItem("jhes_cafe_cart");
      localStorage.removeItem("brew_and_co_cart");
    } catch {
      // Ignore
    }
  };

  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const totalCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

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
        isAddingToCart,
        activeEditItem,
        setActiveEditItem,
        quickCustomizeProduct,
        setQuickCustomizeProduct,
        toastMessage,
      }}
    >
      {children}

      {/* Fly-to-Cart Floating Particle Animation */}
      {flyingItem && (
        <div
          className="pointer-events-none fixed z-[9999] rounded-2xl overflow-hidden shadow-2xl border-2 border-[#C9AE8B] animate-fly-to-cart"
          style={
            {
              top: flyingItem.startTop,
              left: flyingItem.startLeft,
              "--fly-target-x": `${flyingItem.targetX}px`,
              "--fly-target-y": `${flyingItem.targetY}px`,
            } as React.CSSProperties
          }
        >
          <img
            src={flyingItem.imageUrl}
            alt="Adding item"
            className="w-16 h-16 sm:w-20 sm:h-20 object-cover"
          />
        </div>
      )}

      {/* Confirmation Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[9998] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#173D2B] text-white border border-[#C9AE8B]/40 shadow-2xl animate-fade-in-up">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium tracking-wide">{toastMessage}</span>
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
