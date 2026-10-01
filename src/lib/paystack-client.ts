"use client";

/**
 * Browser-side Paystack popup flow (inline.js v2).
 *
 * payWithPaystack(orderId):
 *   1. asks our server to initialize a transaction for the order
 *      (amount is re-read server-side — the client never sets prices);
 *   2. loads https://js.paystack.co/v2/inline.js once;
 *   3. opens the Paystack POPUP where the customer picks Card,
 *      Bank Transfer, USSD, etc.;
 *   4. resolves with the transaction reference on success, rejects when
 *      the popup is closed without paying.
 *
 * API note: the current inline.js exposes `new PaystackPop({ publicKey })`
 * (`PaystackPop.setup(...)` is a deprecated shim that validates v1 params),
 * followed by `popup.resumeTransaction(accessCode, callbacks)`.
 */
export function payWithPaystack(orderId: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Initialize on our server.
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const init = await res.json().catch(() => ({}));
      if (!res.ok || !init.accessCode) {
        throw new Error(init.error ?? "Could not start the payment");
      }

      // 2. Load Paystack's inline script once.
      await loadPaystackInline();
      const PaystackPop = window.PaystackPop;
      if (!PaystackPop) throw new Error("Paystack popup failed to load");

      // 3–4. Open the popup and wire the callbacks.
      const popup = new PaystackPop({ publicKey: init.publicKey });
      popup.resumeTransaction(init.accessCode, {
        onSuccess: (transaction: { reference: string }) => resolve(transaction.reference),
        onCancel: () => reject(new Error("Payment cancelled")),
        onError: () => reject(new Error("Payment error — please try again")),
      });
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Could not start the payment"));
    }
  });
}

/** Inject Paystack inline.js exactly once per page. */
function loadPaystackInline(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src*="js.paystack.co"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Paystack script failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Paystack script failed to load — check your connection"));
    document.body.appendChild(script);
  });
}

/** Minimal typing for Paystack's inline.js v2 global. */
declare global {
  interface Window {
    PaystackPop?: new (options: { publicKey: string }) => {
      resumeTransaction: (
        accessCode: string,
        callbacks: {
          onSuccess: (transaction: { reference: string }) => void;
          onCancel: () => void;
          onError?: (error: unknown) => void;
        }
      ) => void;
    };
  }
}