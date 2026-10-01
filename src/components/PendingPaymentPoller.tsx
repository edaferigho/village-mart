"use client";

/**
 * Background watcher for an unpaid Paystack order.
 *
 * The order page is a server component: it re-checks with Paystack only
 * when it renders. While the page sits open — right after the popup closes,
 * or while a bank transfer is still settling — the "Payment pending" banner
 * would otherwise never change. This poller asks the server to re-verify
 * every few seconds and refreshes the page the moment the payment is
 * confirmed, so the customer sees "Payment received" without manually
 * reloading.
 */
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 5_000;
const MAX_ATTEMPTS = 24; // ~2 minutes of watching, then stop silently

export default function PendingPaymentPoller({ orderId }: { orderId: string }) {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    let stopped = false;
    const timer = setInterval(async () => {
      if (stopped || document.hidden) return; // don't burn checks in a background tab
      attempts.current += 1;
      if (attempts.current > MAX_ATTEMPTS) {
        clearInterval(timer);
        return;
      }
      try {
        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const body = await res.json().catch(() => ({}));
        if (body.paid) {
          clearInterval(timer);
          router.refresh(); // re-render with the "Payment received" banner
        }
      } catch {
        // Network hiccup — keep polling; the manual "Complete Payment"
        // button below remains as the fallback.
      }
    }, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [orderId, router]);

  return null;
}
