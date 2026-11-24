"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { ShoppingBag } from "lucide-react";
import { getProductImage, getCanonicalProduct } from "@/lib/productRegistry";
import { useAuth } from "@/context/AuthContext";

export interface CartItem {
  id: string;
  productId?: string;
  slug?: string;
  name: string;
  category?: string;
  basePrice?: number;
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

export interface PendingAuthCartIntent {
  item: Partial<CartItem> & { name: string; price: number };
  quantity: number;
  returnUrl: string;
  createdAt: number;
}

interface FlightPayload {
  id: number;
  imageUrl: string;
  startRect: { left: number; top: number; width: number; height: number };
}

interface CartContextType {
  items: CartItem[];
  addItem: (
    item: Partial<CartItem> & { name: string; price: number },
    quantity?: number,
    sourceElement?: HTMLElement | null
  ) => boolean;
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

  // Auth-Required Login Modal & Pending Selection Preservation
  showLoginModal: boolean;
  pendingAuthItem: PendingAuthCartIntent | null;
  dismissLoginModal: () => void;
  clearPendingAuthItem: () => void;

  // Promo Code shared seamlessly between Cart & Checkout
  appliedPromoCode: string | null;
  setAppliedPromoCode: (code: string | null) => void;

  // Toast feedback
  toastMessage: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const PENDING_CART_STORAGE_KEY = "jhes_pending_cart_item";
const PROMO_STORAGE_KEY = "jhes_cafe_promo_code";
const PENDING_CART_TTL_MS = 30 * 60 * 1000;
const LEGACY_CART_KEYS = ["jhes_cafe_cart", "brew_and_co_cart"];

function getAccountCartKey(userId: string): string {
  return `jhes_cafe_cart_${userId}`;
}

function buildItemSignature(item: Partial<CartItem>): string {
  const productId = item.productId || item.id || item.slug || item.name || "item";
  return [
    productId,
    item.size || "standard",
    item.temperature || "standard",
    item.milk || "standard",
    item.sweetness !== undefined ? `${item.sweetness}%` : "standard",
    item.extraShots || 0,
    (item.toppings || []).slice().sort().join("_"),
    item.warming || "standard",
    (item.addOns || []).slice().sort().join("_"),
    item.servingStyle || "standard",
    (item.finishes || []).slice().sort().join("_"),
  ].join("|");
}

function normalizeCompleteItem(
  itemData: Partial<CartItem> & { name: string; price: number },
  quantity: number
): CartItem {
  const qty = Math.max(1, quantity || itemData.quantity || 1);
  const baseSlug = itemData.slug || itemData.productId || itemData.id || "coffee";
  const productId = itemData.productId || itemData.id || baseSlug;
  const resolvedImage = getProductImage({
    image_url: itemData.imageUrl,
    slug: baseSlug,
    name: itemData.name,
    id: productId,
  });
  const canonical = getCanonicalProduct(baseSlug) || getCanonicalProduct(itemData.name);
  const resolvedBasePrice = itemData.basePrice ?? canonical?.price ?? itemData.price;

  return {
    id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    productId,
    slug: baseSlug,
    name: itemData.name,
    category: itemData.category || "Specialty Item",
    basePrice: resolvedBasePrice,
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
}

function mergeCartItem(prev: CartItem[], completeItem: CartItem): CartItem[] {
  const signature = buildItemSignature(completeItem);
  const existingIdx = prev.findIndex((i) => buildItemSignature(i) === signature);
  if (existingIdx > -1) {
    const next = [...prev];
    next[existingIdx] = {
      ...next[existingIdx],
      quantity: next[existingIdx].quantity + completeItem.quantity,
    };
    return next;
  }
  return [...prev, completeItem];
}

function triggerCartIconFeedback() {
  if (typeof document === "undefined") return;
  const btn = document.getElementById("navbar-cart-btn");
  if (btn) {
    btn.classList.remove("animate-cart-pop");
    void btn.offsetWidth;
    btn.classList.add("animate-cart-pop");
  }
  const badge = document.getElementById("navbar-cart-count");
  if (badge) {
    badge.classList.remove("animate-badge-pop");
    void badge.offsetWidth;
    badge.classList.add("animate-badge-pop");
  }
}

/**
 * Temporary GPU-composited floating product image clone that flies along a
 * smooth quadratic Bézier curve from the product image to the real navbar cart icon.
 */
function FlyingProductClone({
  flight,
  onArrive,
}: {
  flight: FlightPayload;
  onArrive: () => void;
}) {
  const cloneRef = useRef<HTMLDivElement | null>(null);
  const arrivedRef = useRef(false);

  useEffect(() => {
    const el = cloneRef.current;
    if (!el || typeof window === "undefined") {
      onArrive();
      return;
    }

    const cartTarget =
      document.getElementById("navbar-cart-icon") ||
      document.getElementById("navbar-cart-btn");
    const cartRect = cartTarget ? cartTarget.getBoundingClientRect() : null;

    const thumbSize = Math.round(
      Math.min(Math.max(Math.min(flight.startRect.width, flight.startRect.height) * 0.55, 72), 116)
    );
    el.style.width = `${thumbSize}px`;
    el.style.height = `${thumbSize}px`;

    const p0x = flight.startRect.left + flight.startRect.width / 2;
    const p0y = flight.startRect.top + flight.startRect.height / 2;
    const p2x = cartRect ? cartRect.left + cartRect.width / 2 : window.innerWidth - 56;
    const p2y = cartRect ? cartRect.top + cartRect.height / 2 : 48;

    // Quadratic Bézier control point creates an organic upward arc toward the cart icon
    const midX = (p0x + p2x) / 2;
    const arcLift = Math.min(130, Math.max(65, Math.abs(p2x - p0x) * 0.22));
    const p1x = midX - (p2x > p0x ? 28 : -28);
    const p1y = Math.min(p0y, p2y) - arcLift;

    const durationMs = 680;
    const startTime = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const rawT = Math.min(1, (now - startTime) / durationMs);
      // Smooth cubic ease-in-out
      const t = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;
      const inv = 1 - t;

      const x = inv * inv * p0x + 2 * inv * t * p1x + t * t * p2x;
      const y = inv * inv * p0y + 2 * inv * t * p1y + t * t * p2y;

      // Naturally scale down as the product approaches the cart icon
      const scale = 1 - 0.82 * t;
      const rotate = Math.sin(t * Math.PI) * (p2x >= p0x ? -8 : 8);
      const opacity = rawT < 0.74 ? 1 : Math.max(0, 1 - (rawT - 0.74) / 0.26);

      el.style.transform = `translate3d(${x - thumbSize / 2}px, ${y - thumbSize / 2}px, 0) scale(${scale}) rotate(${rotate}deg)`;
      el.style.opacity = `${opacity}`;

      if (rawT < 1) {
        rafId = requestAnimationFrame(step);
      } else if (!arrivedRef.current) {
        arrivedRef.current = true;
        onArrive();
      }
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [flight, onArrive]);

  return (
    <div
      ref={cloneRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-2xl overflow-hidden shadow-2xl border-2 border-[#C9AE8B] ring-4 ring-[#173D2B]/20 bg-[#173D2B]"
      style={{
        willChange: "transform, opacity",
        transform: `translate3d(${flight.startRect.left}px, ${flight.startRect.top}px, 0)`,
      }}
    >
      <img
        src={flight.imageUrl}
        alt=""
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();

  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeEditItem, setActiveEditItem] = useState<CartItem | null>(null);
  const [quickCustomizeProduct, setQuickCustomizeProduct] = useState<any | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);

  // Auth-required cart modal & pending selection
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAuthItem, setPendingAuthItem] = useState<PendingAuthCartIntent | null>(null);

  // Curved Product-Image-to-Cart Flight State
  const [activeFlight, setActiveFlight] = useState<FlightPayload | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [appliedPromoCode, setAppliedPromoCodeState] = useState<string | null>(null);

  const setAppliedPromoCode = useCallback((code: string | null) => {
    const clean = code ? code.trim().toUpperCase() : null;
    setAppliedPromoCodeState(clean);
    try {
      if (clean) {
        sessionStorage.setItem(PROMO_STORAGE_KEY, clean);
      } else {
        sessionStorage.removeItem(PROMO_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const isAddingRef = useRef(false);
  const hydratedUserIdRef = useRef<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flightCounterRef = useRef(0);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3600);
  }, []);

  const launchProductToCartAnimation = useCallback(
    (
      imageUrl: string,
      capturedRect: { left: number; top: number; width: number; height: number } | null,
      productName: string
    ) => {
      if (typeof window === "undefined") {
        isAddingRef.current = false;
        setIsAddingToCart(false);
        return;
      }

      const prefersReducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion || !capturedRect) {
        triggerCartIconFeedback();
        showToast(`Added to your bag · ${productName}`);
        isAddingRef.current = false;
        setIsAddingToCart(false);
        return;
      }

      flightCounterRef.current += 1;
      setActiveFlight({
        id: flightCounterRef.current,
        imageUrl,
        startRect: capturedRect,
      });
    },
    [showToast]
  );

  const handleFlightArrive = useCallback(() => {
    setActiveFlight(null);
    triggerCartIconFeedback();
    isAddingRef.current = false;
    setIsAddingToCart(false);
  }, []);

  // Cleanup legacy unauthenticated shared cart keys once on mount
  useEffect(() => {
    try {
      LEGACY_CART_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignore storage access errors
    }
  }, []);

  // Hydrate account-scoped cart on login from server + local cache, clear in-memory on logout, and auto-add preserved pending item
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Protect customer cart data immediately when logged out / guest
      hydratedUserIdRef.current = null;
      setItems([]);
      setAppliedPromoCodeState(null);
      setIsCartOpen(false);
      setActiveEditItem(null);
      try {
        sessionStorage.removeItem(PROMO_STORAGE_KEY);
      } catch {}
      return;
    }

    try {
      const savedPromo = sessionStorage.getItem(PROMO_STORAGE_KEY);
      if (savedPromo) setAppliedPromoCodeState(savedPromo);
    } catch {}

    let isCancelled = false;

    // 1. Instant optimistic load from account cache (zero layout shift)
    const storageKey = getAccountCartKey(user.id);
    let loadedItems: CartItem[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          loadedItems = parsed;
        }
      }
    } catch {
      loadedItems = [];
    }

    // Check if the customer clicked "Add to Bag" before authenticating
    let pendingToCommit: PendingAuthCartIntent | null = null;
    try {
      const rawPending = sessionStorage.getItem(PENDING_CART_STORAGE_KEY);
      if (rawPending) {
        const parsed: PendingAuthCartIntent = JSON.parse(rawPending);
        sessionStorage.removeItem(PENDING_CART_STORAGE_KEY);
        if (
          parsed?.item?.name &&
          Date.now() - Number(parsed.createdAt || 0) <= PENDING_CART_TTL_MS
        ) {
          pendingToCommit = parsed;
        }
      }
    } catch {
      // Ignore sessionStorage errors
    }

    setPendingAuthItem(null);
    setShowLoginModal(false);

    if (pendingToCommit) {
      const completeItem = normalizeCompleteItem(
        pendingToCommit.item,
        pendingToCommit.quantity || 1
      );
      loadedItems = mergeCartItem(loadedItems, completeItem);
      try {
        localStorage.setItem(storageKey, JSON.stringify(loadedItems));
      } catch {}

      hydratedUserIdRef.current = user.id;
      setItems(loadedItems);

      // Persist to server
      void fetch("/api/v1/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: loadedItems }),
      }).catch(() => {});

      // Animate from the visible product image on the return page once settled
      setTimeout(() => {
        const heroEl = document.querySelector<HTMLElement>('[data-product-hero-image="true"]');
        const rect = heroEl
          ? heroEl.getBoundingClientRect()
          : typeof window !== "undefined"
            ? {
                left: window.innerWidth / 2 - 60,
                top: window.innerHeight / 2 - 60,
                width: 120,
                height: 120,
              }
            : null;
        showToast(`Added to your bag · ${completeItem.name}`);
        launchProductToCartAnimation(
          completeItem.imageUrl || getProductImage(completeItem),
          rect
            ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
            : null,
          completeItem.name
        );
      }, 220);
    } else {
      hydratedUserIdRef.current = user.id;
      setItems(loadedItems);

      // 2. Authoritative server hydration from Airtable Orders cart record
      void fetch("/api/v1/cart")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isCancelled || !data) return;
          if (Array.isArray(data.items)) {
            // If server has items, adopt authoritative server cart
            if (data.items.length > 0) {
              setItems(data.items);
              try {
                localStorage.setItem(storageKey, JSON.stringify(data.items));
              } catch {}
            } else if (loadedItems.length > 0) {
              // Push local items to server if server was fresh
              void fetch("/api/v1/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: loadedItems }),
              }).catch(() => {});
            }
          }
        })
        .catch(() => {});
    }

    return () => {
      isCancelled = true;
    };
  }, [user, authLoading, launchProductToCartAnimation, showToast]);

  // Persist account-scoped cart whenever items change for an authenticated user to both cache and server
  useEffect(() => {
    if (!user || hydratedUserIdRef.current !== user.id) return;
    try {
      localStorage.setItem(getAccountCartKey(user.id), JSON.stringify(items));
    } catch {
      // Ignore storage errors
    }

    const timer = setTimeout(() => {
      void fetch("/api/v1/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      }).catch(() => {});
    }, 400);

    return () => clearTimeout(timer);
  }, [items, user]);

  const dismissLoginModal = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  const clearPendingAuthItem = useCallback(() => {
    setPendingAuthItem(null);
    setShowLoginModal(false);
    try {
      sessionStorage.removeItem(PENDING_CART_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const addItem = (
    itemData: Partial<CartItem> & { name: string; price: number },
    quantity: number = 1,
    sourceElement?: HTMLElement | null
  ): boolean => {
    // 1. Strict Authentication Requirement: guests cannot add to cart until authenticated
    if (!user) {
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "/menu";
      const returnUrl = currentPath.startsWith("/menu/")
        ? currentPath
        : itemData.slug
          ? `/menu/${itemData.slug}`
          : currentPath;

      const intent: PendingAuthCartIntent = {
        item: {
          ...itemData,
          imageUrl: getProductImage({
            image_url: itemData.imageUrl,
            slug: itemData.slug,
            name: itemData.name,
            id: itemData.productId || itemData.id,
          }),
        },
        quantity: Math.max(1, quantity || itemData.quantity || 1),
        returnUrl,
        createdAt: Date.now(),
      };

      try {
        sessionStorage.setItem(PENDING_CART_STORAGE_KEY, JSON.stringify(intent));
      } catch {
        // Ignore storage errors
      }
      setPendingAuthItem(intent);
      setShowLoginModal(true);
      return false;
    }

    // 2. Duplicate-submission click mutex during active animation
    if (isAddingRef.current) return false;
    isAddingRef.current = true;
    setIsAddingToCart(true);

    // 3. Synchronously capture product image coordinates before any modal closes
    let capturedRect: { left: number; top: number; width: number; height: number } | null = null;
    if (sourceElement && typeof window !== "undefined") {
      const r = sourceElement.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        capturedRect = { left: r.left, top: r.top, width: r.width, height: r.height };
      }
    }
    if (!capturedRect && typeof document !== "undefined") {
      const fallbackImg = document.querySelector<HTMLElement>('[data-product-hero-image="true"]');
      if (fallbackImg) {
        const r = fallbackImg.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          capturedRect = { left: r.left, top: r.top, width: r.width, height: r.height };
        }
      }
    }

    const completeItem = normalizeCompleteItem(itemData, quantity);

    // 4. Add item to authenticated user's cart (preserving distinct customizations)
    setItems((prev) => mergeCartItem(prev, completeItem));

    // 5. Launch curved product-image-to-cart animation & show toast
    showToast(`Added to your bag · ${completeItem.name}`);
    launchProductToCartAnimation(
      completeItem.imageUrl || getProductImage(completeItem),
      capturedRect,
      completeItem.name
    );

    return true;
  };

  const updateItem = (id: string, updatedFields: Partial<CartItem>) => {
    if (!user) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
    );
    showToast("Recipe updated in your bag");
  };

  const updateQuantity = (id: string, delta: number) => {
    if (!user) return;
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
    if (!user) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
    setAppliedPromoCode(null);
    try {
      if (user) {
        localStorage.removeItem(getAccountCartKey(user.id));
        void fetch("/api/v1/cart", { method: "DELETE" }).catch(() => {});
      }
      LEGACY_CART_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignore
    }
  };

  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const totalCount = user ? items.reduce((acc, item) => acc + item.quantity, 0) : 0;
  const subtotal = user ? items.reduce((acc, item) => acc + item.price * item.quantity, 0) : 0;

  return (
    <CartContext.Provider
      value={{
        items: user ? items : [],
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
        showLoginModal,
        pendingAuthItem,
        dismissLoginModal,
        clearPendingAuthItem,
        appliedPromoCode,
        setAppliedPromoCode,
        toastMessage,
      }}
    >
      {children}

      {/* Curved Product-Image-to-Cart Floating Clone */}
      {activeFlight && (
        <FlyingProductClone
          key={activeFlight.id}
          flight={activeFlight}
          onArrive={handleFlightArrive}
        />
      )}

      {/* Compact Confirmation Toast with Optional View Bag Action */}
      {toastMessage && (
        <div
          key={toastMessage}
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-[9998] flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#173D2B] text-white border border-[#C9AE8B]/40 shadow-2xl animate-fade-in-up max-w-[calc(100vw-2.5rem)]"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-xs font-medium tracking-wide leading-snug">{toastMessage}</span>
          {user && (
            <button
              type="button"
              onClick={() => {
                setToastMessage(null);
                setIsCartOpen(true);
              }}
              className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#C9AE8B] text-[#173D2B] text-[11px] font-bold hover:bg-[#DECDB8] transition-colors shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-3 h-3" />
              <span>View Bag</span>
            </button>
          )}
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
