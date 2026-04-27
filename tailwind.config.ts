import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#7C3AED",
          "primary-dark": "#6D28D9",
          "primary-50": "#F5F3FF",
          "primary-100": "#EDE9FE",
          accent: "#FFBF00",
          "accent-dark": "#E0A800",
          "accent-50": "#FFF8E1",
          "accent-100": "#FFEFB8",
          success: "#31B897",
          "success-dark": "#28A088",
          "success-50": "#ECFDF5",
          "success-100": "#D1FAE5",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
