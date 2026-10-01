import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import { getSessionUser } from "@/lib/auth";

/**
 * Root layout — wraps every page with the store chrome:
 * sticky header, content area, footer and the cart context provider.
 */
export const metadata: Metadata = {
  title: {
    default: "Village Mart — Fresh Foodstuff, Honest Prices",
    template: "%s · Village Mart",
  },
  description:
    "Shop rice, oils, tomato paste, pasta, beverages and more at wholesale-friendly prices. Village Mart delivers fresh foodstuff to your door.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The signed session cookie is read on the server so the header can show
  // the user's avatar/name right after a Google sign-in.
  const user = await getSessionUser();

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col font-sans">
        <CartProvider>
          <Header user={user} />
          {/* flex-1 keeps the footer pinned to the bottom on short pages */}
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
