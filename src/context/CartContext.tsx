"use client";

/**
 * Shopping cart state — React context backed by localStorage.
 *
 * The cart lives client-side (survives refresh, no login needed). Everything
 * transactional — orders, order items, customers — is persisted to Supabase
 * at checkout time by /api/orders.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CartItem, Product } from "@/lib/types";

const STORAGE_KEY = "villagemart_cart_v1";

interface CartContextValue {
  items: CartItem[];
  itemCount: number; // total number of units across line items
  subtotal: number;
  isReady: boolean; // true once the cart has been hydrated from localStorage
  addItem: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Load the persisted cart, tolerating corrupt/legacy data. */
function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate once on mount (after hydration, so SSR markup matches).
  useEffect(() => {
    setItems(loadCart());
    setIsReady(true);
  }, []);

  // Persist on every change (only after hydration to avoid wiping storage).
  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, isReady]);

  /** Show a small transient toast ("Added to cart ✓"). */
  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const addItem = useCallback(
    (product: Product, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        if (existing) {
          return prev.map((i) =>
            i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            unitLabel: product.unit_label ?? "",
            price: product.price,
            imageUrl: product.image_url ?? "",
            quantity,
          },
        ];
      });
      showToast(`${product.name} added to cart`);
    },
    [showToast]
  );

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const { itemCount, subtotal } = useMemo(() => {
    return {
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: items.reduce((sum, i) => sum + i.quantity * i.price, 0),
    };
  }, [items]);

  const value = useMemo(
    () => ({ items, itemCount, subtotal, isReady, addItem, setQuantity, removeItem, clearCart }),
    [items, itemCount, subtotal, isReady, addItem, setQuantity, removeItem, clearCart]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      {/* Transient "added to cart" toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 animate-fadeUp rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white shadow-lift"
        >
          {toast}
        </div>
      )}
    </CartContext.Provider>
  );
}

/** Access the cart from any client component. */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
