import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#7C3AED",
          "primary-dark": "#6D28D9",
          "primary-glow": "#A78BFA",
          "primary-50": "#F5F3FF",
          "primary-100": "#EDE9FE",
          "primary-900": "#2E1A5C",
          "primary-950": "#1A0F36",
          accent: "#FFBF00",
          "accent-dark": "#E0A800",
          "accent-50": "#FFF8E1",
          "accent-100": "#FFEFB8",
          "accent-900": "#3D2D00",
          "accent-950": "#1F1700",
          success: "#31B897",
          "success-dark": "#28A088",
          "success-50": "#ECFDF5",
          "success-100": "#D1FAE5",
          "success-900": "#0F3328",
          "success-950": "#061B14",
        },
        ink: "#0A0814",
        surface: "#13101F",
        raised: "#1B1730",
        line: "#2A2440",
        "line-strong": "#3A3454",
        "ink-text": "#EAE8F0",
        muted: "#8C86A8",
        dim: "#5C5879",
      },
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124, 58, 237, 0.5), 0 0 24px -4px rgba(124, 58, 237, 0.45)",
        "glow-accent":
          "0 0 0 1px rgba(255, 191, 0, 0.4), 0 0 22px -4px rgba(255, 191, 0, 0.4)",
        "glow-success":
          "0 0 0 1px rgba(49, 184, 151, 0.4), 0 0 18px -4px rgba(49, 184, 151, 0.4)",
        "glow-soft": "0 0 24px -8px rgba(124, 58, 237, 0.3)",
      },
      animation: {
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        scanline: "scanline 12s linear infinite",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "pulse-glow": {
          "0%": { boxShadow: "0 0 0 0 rgba(49, 184, 151, 0.55)" },
          "70%": { boxShadow: "0 0 0 8px rgba(49, 184, 151, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(49, 184, 151, 0)" },
        },
        scanline: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-100%)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
