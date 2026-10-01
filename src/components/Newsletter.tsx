"use client";

/**
 * Newsletter signup band (blue, like the moodboard) — posts the email to
 * /api/newsletter, which persists it in the `newsletter_subscribers` table.
 */
import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Subscription failed");
      }
      setStatus("done");
      setEmail("");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  return (
    <section className="rounded-2xl bg-brand-600">
      <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10">
        <div className="flex items-start gap-4">
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-white sm:flex">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-white sm:text-2xl">Join Our Newsletter</h2>
            <p className="mt-1 text-sm text-blue-100">
              Get the latest price drops, offers &amp; new arrivals in your inbox.
            </p>
          </div>
        </div>

        {status === "done" ? (
          <p className="rounded-lg bg-white/15 px-5 py-3 text-sm font-semibold text-white">
            You&apos;re in! 🎉 Watch your inbox for fresh deals.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex w-full max-w-md gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="min-w-0 flex-1 rounded-lg border-0 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-lg bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
            >
              {status === "loading" ? "Subscribing…" : "Subscribe"}
            </button>
          </form>
        )}
      </div>
      {status === "error" && (
        <p className="px-10 pb-5 text-sm font-medium text-amber-200">{errorMessage}</p>
      )}
    </section>
  );
}
