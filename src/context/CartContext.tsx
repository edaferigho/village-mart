"use client";

/**
 * Shopping cart state — synced across the website and the mobile app.
 *
 * Storage model
 * ─────────────
 * • The SERVER (Supabase `cart_items`, via /api/cart) is the source of truth.
 *   Lines are keyed to an owner: `user:<id>` when signed in, `device:<uuid>`
 *   otherwise — so the same account sees the same cart on web and mobile.
 * • localStorage keeps an offline mirror for instant first paint.
 *
 * Synchronisation
 * ───────────────
 * • Every local mutation updates the UI immediately and is written through
 *   to the server (write-through); the server's canonical lines come back.
 * • INCOMING changes (another tab, the mobile app, another device) arrive
 *   via Supabase Realtime (`postgres_changes` on cart_items) and are applied
 *   by refetching — effectively instant.
 * • Without realtime (migration not run) a 10-second poll + refetch on tab
 *   focus keep devices in sync a few seconds later instead.
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
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CartItem, Product } from "@/lib/types";

const STORAGE_KEY = "villagemart_cart_v1";
const DEVICE_COOKIE = "vm_device";
const POLL_MS = 10_000;

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isReady: boolean;
  syncing: boolean; // server cart available and being mirrored
  addItem: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Read the cart mirror from localStorage (fast first paint / offline). */
function loadLocalCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

/** Keep a stable guest device id in a cookie (the server reads it). */
function ensureDeviceId(): string {
  const match = document.cookie.match(/(?:^|;\s*)vm_device=([\w-]+)/);
  if (match) return match[1];
  const id = crypto.randomUUID();
  document.cookie = `${DEVICE_COOKIE}=${id}; path=/; max-age=31536000; SameSite=Lax`;
  return id;
}

/** Raw line shape returned by /api/cart. */
interface ServerCartLine {
  quantity: number;
  product: {
    id: string; slug: string; name: string; price: number;
    image_url: string | null; unit_label: string | null;
  } | null;
}

/** Convert server cart lines into the client CartItem shape. */
function toCartItems(lines: ServerCartLine[]): CartItem[] {
  return lines
    .map((line) => {
      if (!line.product) return null; // product was deleted
      return {
        productId: line.product.id,
        slug: line.product.slug,
        name: line.product.name,
        unitLabel: line.product.unit_label ?? "",
        price: line.product.price,
        imageUrl: line.product.image_url ?? "",
        quantity: line.quantity,
      };
    })
    .filter((i): i is CartItem => i !== null);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const ownerKeyRef = useRef<string | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const applyingRef = useRef(false); // true while applying server state
  const mutationsInFlight = useRef(0); // write-through requests running
  const lastMutationAt = useRef(0); // ms timestamp of the last write-through
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Small transient toast ("added to cart ✓"). */
  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  /** Replace local state with server-canonical items (no write-back loop). */
  const applyServerItems = useCallback((next: CartItem[]) => {
    applyingRef.current = true;
    setItems(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    applyingRef.current = false;
  }, []);

  // ------------------------------------------------------------------
  // Server sync
  // ------------------------------------------------------------------
  const fetchServerCart = useCallback(async (): Promise<CartItem[] | null> => {
    const res = await fetch("/api/cart");
    if (!res.ok) return null; // offline or cart storage missing
    const body = await res.json();
    ownerKeyRef.current = body.ownerKey ?? null;
    if (!Array.isArray(body.items)) return null;
    return toCartItems(body.items);
  }, []);

  /** One-time boot: local paint → push offline-only lines → adopt server state. */
  const hydrate = useCallback(async () => {
    const local = loadLocalCart();
    setItems(local);
    setIsReady(true);

    ensureDeviceId();
    const serverItems = await fetchServerCart();
    if (serverItems === null) return; // offline / not migrated — local-only mode

    // Push locally-added lines the server hasn't seen yet (offline adds).
    const serverIds = new Set(serverItems.map((i) => i.productId));
    const localOnly = local.filter((i) => !serverIds.has(i.productId));
    let final = serverItems;
    if (localOnly.length > 0) {
      await Promise.all(
        localOnly.map((i) =>
          fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: i.productId, quantity: i.quantity }),
          }).catch(() => null)
        )
      );
      final = (await fetchServerCart()) ?? serverItems;
    }
    setSyncing(true);
    applyServerItems(final);
  }, [applyServerItems, fetchServerCart]);

  /** Fire-and-forget mutation; adopts the canonical lines from the response. */
  const serverMutate = useCallback(
    async (method: "POST" | "DELETE", body?: unknown, query = "") => {
      // Track writes so the poll/realtime adoption never resurrect a state
      // that a just-issued mutation is about to overwrite.
      mutationsInFlight.current += 1;
      lastMutationAt.current = Date.now();
      try {
        const res = await fetch(`/api/cart${query}`, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.items)) applyServerItems(toCartItems(data.items));
      } catch {
        /* offline — the local change stands and syncs on the next write */
      } finally {
        mutationsInFlight.current -= 1;
        lastMutationAt.current = Date.now();
      }
    },
    [applyServerItems]
  );

  // Boot once.
  useEffect(() => {
    setIsReady(true);
    hydrate();
  }, [hydrate]);

  // Persist mirror on change (skip while applying server state).
  useEffect(() => {
    if (applyingRef.current || !isReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, isReady]);

  // Realtime + polling: adopt incoming changes from other devices/tabs.
  useEffect(() => {
    if (!syncing) return;

    // Supabase Realtime (instant) — only when project env is available.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    let channel: ReturnType<SupabaseClient["channel"]> | null = null;
    if (url && key) {
      supabaseRef.current ??= createClient(url, key, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 5 } },
      });
      channel = supabaseRef.current
        .channel("cart-sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "cart_items" },
          () => {
            fetchServerCart().then((next) => {
              if (mutationsInFlight.current > 0 || Date.now() - lastMutationAt.current < 1500) return;
              if (next) applyServerItems(next);
            })
          }
        )
        .subscribe();
    }

    // Poll + refresh-on-focus fallback (covers no-realtime setups too).
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchServerCart().then((next) => {
              if (mutationsInFlight.current > 0 || Date.now() - lastMutationAt.current < 1500) return;
              if (next) applyServerItems(next);
            })
      }
    }, POLL_MS);
    const onFocus = () =>
      fetchServerCart().then((next) => {
              if (mutationsInFlight.current > 0 || Date.now() - lastMutationAt.current < 1500) return;
              if (next) applyServerItems(next);
            })
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      channel?.unsubscribe();
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [syncing, applyServerItems, fetchServerCart]);

  // ------------------------------------------------------------------
  // Public actions (optimistic local + write-through)
  // ------------------------------------------------------------------
  const addItem = useCallback(
    (product: Product, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        const next = existing
          ? prev.map((i) =>
              i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i
            )
          : [
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
        // Write-through: the line's new total quantity.
        serverMutate("POST", {
          productId: product.id,
          quantity: existing ? existing.quantity + quantity : quantity,
        });
        return next;
      });
      showToast(`${product.name} added to cart`);
    },
    [serverMutate, showToast]
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      setItems((prev) => {
        const next =
          quantity <= 0
            ? prev.filter((i) => i.productId !== productId)
            : prev.map((i) => (i.productId === productId ? { ...i, quantity } : i));
        serverMutate("POST", { productId, quantity });
        return next;
      });
    },
    [serverMutate]
  );

  const removeItem = useCallback(
    (productId: string) => {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      serverMutate("DELETE", undefined, `?productId=${productId}`);
    },
    [serverMutate]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    serverMutate("DELETE");
  }, [serverMutate]);

  const { itemCount, subtotal } = useMemo(
    () => ({
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: items.reduce((sum, i) => sum + i.quantity * i.price, 0),
    }),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      isReady,
      syncing,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [items, itemCount, subtotal, isReady, syncing, addItem, setQuantity, removeItem, clearCart]
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
