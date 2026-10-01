"use client";

/**
 * "Complete Payment" button for unpaid Paystack orders — reopens the
 * Paystack popup for the order and refreshes the page once paid.
 */
import { useState } from "react";
import { payWithPaystack } from "@/lib/paystack-client";

export default function CompletePaymentButton({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPayment = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await payWithPaystack(orderId);
      // Paid — reload so the server re-verifies and shows the paid banner.
      window.location.reload();
    } catch (err) {
      setBusy(false);
      setError(
        err instanceof Error && err.message === "Payment cancelled"
          ? "Payment window closed — your order is still saved, try again anytime."
          : err instanceof Error
            ? err.message
            : "Could not start the payment"
      );
    }
  };

  return (
    <div className="mt-4">
      <button type="button" onClick={startPayment} disabled={busy} className="btn-primary w-full py-3">
        {busy ? "Opening Paystack…" : "Complete Payment — Card or Bank Transfer"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-amber-700">{error}</p>
      )}
    </div>
  );
}
