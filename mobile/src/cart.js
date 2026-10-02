/**
 * Cart state for the mobile app — mirrors the website's cart exactly.
 *
 * The server cart (/api/cart) is the source of truth, keyed to this device
 * or the signed-in account. Local state updates instantly on user actions
 * and is written through to the server; INCOMING changes from the website
 * (or another device) arrive through:
 *   • Supabase Realtime on `cart_items` — instant when the realtime
 *     migration has been enabled on the project, and
 *   • a 5-second poll + refresh-on-app-focus as a universal fallback.
 */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { api } from "./api";
import { useAuth } from "./auth";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const POLL_MS = 5000;

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]); // {productId, name, price, imageUrl, unitLabel, quantity}
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const ownerKeyRef = useRef(null);
  const applyingRef = useRef(false);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  /** Adopt server-canonical lines (normalized) without re-triggering writes. */
  const apply = (lines) => {
    applyingRef.current = true;
    setItems(lines);
    applyingRef.current = false;
  };

  /** GET /api/cart → normalized lines. Returns null when unavailable. */
  const fetchCart = async () => {
    try {
      const data = await api("/api/cart");
      ownerKeyRef.current = data.ownerKey ?? null;
      setSyncError(null);
      const lines = (data.items ?? [])
        .filter((l) => l.product)
        .map((l) => ({
          productId: l.product.id,
          slug: l.product.slug,
          name: l.product.name,
          price: l.product.price,
          imageUrl: l.product.image_url ?? "",
          unitLabel: l.product.unit_label ?? "",
          quantity: l.quantity,
        }));
      apply(lines);
      return lines;
    } catch (err) {
      setSyncError(err.message);
      return null;
    }
  };

  // Initial load + refetch when the signed-in user changes (guest → paired).
  useEffect(() => {
    fetchCart().finally(() => setReady(true));
  }, [user?.id]);

  // Realtime: instant updates from the website / other devices.
  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });
    const channel = supabase
      .channel("mobile-cart-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cart_items" },
        () => fetchCart()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Polling fallback + refresh when the app comes back to the foreground.
  useEffect(() => {
    const interval = setInterval(fetchCart, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // AppState refresh — covers "navigate away and back".
    const { AppState } = require("react-native");
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchCart();
    });
    return () => sub.remove();
  }, []);

  /** Set a product's quantity on the server (0 removes) then adopt result. */
  const setQuantity = async (productId, quantity) => {
    // Optimistic local update for instant feedback.
    apply(
      quantity <= 0
        ? items.filter((i) => i.productId !== productId)
        : items.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
    try {
      const data = await api("/api/cart", {
        method: "POST",
        body: { productId, quantity },
      });
      const lines = (data.items ?? [])
        .filter((l) => l.product)
        .map((l) => ({
          productId: l.product.id,
          name: l.product.name,
          price: l.product.price,
          imageUrl: l.product.image_url ?? "",
          unitLabel: l.product.unit_label ?? "",
          quantity: l.quantity,
        }));
      apply(lines);
    } catch (err) {
      setSyncError(err.message);
      fetchCart(); // resync on failure
    }
  };

  /** Add a product (or bump its quantity) — mirrors the website's cart. */
  const addToCart = async (product, delta = 1) => {
    const existing = items.find((i) => i.productId === product.id);
    const newQty = (existing?.quantity ?? 0) + delta;
    await setQuantity(product.id, newQty);
  };

  const clearCart = async () => {
    apply([]);
    try {
      await api("/api/cart", { method: "DELETE" });
    } catch {}
  };

  const value = useMemo(
    () => ({ items, itemCount, subtotal, ready, syncError, addToCart, setQuantity, clearCart, refresh: fetchCart }),
    [items, itemCount, subtotal, ready, syncError]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
