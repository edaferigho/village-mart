import type { Config } from "tailwindcss";

/**
 * Village Mart design tokens.
 *
 * The palette mirrors the moodboard: a deep navy hero canvas with a vivid
 * "brand blue" action color, white content surfaces and soft slate greys.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep navy used for the hero, promo banners and footer.
        navy: {
          DEFAULT: "#0B1B33",
          800: "#12264A",
          900: "#0D1D3A",
          950: "#060F22",
        },
        // Primary action color (buttons, links, active states).
        brand: {
          50: "#EEF4FF",
          100: "#DFEAFF",
          500: "#3B6DF1",
          600: "#2563EB",
          700: "#1D4ED8",
        },
      },
      fontFamily: {
        // System font stack — fast, no network font download required.
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "sans-serif",
        ],
      },
      boxShadow: {
        // Subtle default card elevation, and a blue-tinted hover elevation.
        card: "0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.10)",
        lift: "0 16px 32px -12px rgba(37,99,235,.28)",
      },
      keyframes: {
        // Small fade-up used by the hero copy and toasts.
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeUp: "fadeUp .45s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
