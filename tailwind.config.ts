import type { Config } from "tailwindcss";

/**
 * Afin house palette.
 *
 * Lab Board was a dark violet-neon theme; the Academy is the bank's live
 * design language — ink and slate-green structure, mint as the single
 * affirmative accent, on a warm near-white ground. Two Afin products should
 * not disagree about what colour the page is, so these values are copied
 * from the Academy's tokens rather than approximated.
 *
 * The token NAMES are unchanged. Every one of the ~1,350 colour classes in
 * this codebase is semantic — bg-surface, text-muted, border-line — so the
 * whole app re-skins by remapping values here, with no sweep through the
 * components and no chance of missing one.
 *
 * Two names needed care:
 *   `ink` stays the DARK colour. It is used both as a scrim (bg-ink/70) and
 *   as dark text on bright buttons (text-ink on amber). Flipping it would
 *   have made amber buttons illegible. The page background is now `canvas`.
 *
 *   `ink-text` becomes the dark body colour rather than the light one, which
 *   is what its 113 uses always meant: "the colour text is".
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          // Was violet #7C3AED. The Academy's accent is teal — its darker voice.
          primary: "#1a4a54",
          "primary-dark": "#0c2d3b",
          "primary-glow": "#3f5c64",
          "primary-50": "#e8eef0",
          "primary-100": "#d7e2e5",
          "primary-900": "#0c2d3b",
          "primary-950": "#08202a",
          // Already identical to the Academy's --afin-amber. Kept.
          accent: "#ffbf00",
          "accent-dark": "#d9a300",
          "accent-50": "#fbf1d8",
          "accent-100": "#f6e4b4",
          // Amber cannot be read as text on a light ground; goldenrod is the
          // Academy's answer to exactly that problem.
          "accent-ink": "#715207",
          "accent-900": "#715207",
          "accent-950": "#4a3604",
          // Already identical to the Academy's --afin-mint. Kept.
          success: "#31b897",
          "success-dark": "#26977b",
          "success-50": "#e4f4ef",
          "success-100": "#c9e9df",
          "success-ink": "#1a6250",
          "success-900": "#146350",
          "success-950": "#0d4234",
          coral: "#ff6b61",
          "coral-50": "#fdeae8",
          "coral-ink": "#b10c00",
        },

        // Structure. `ink` is the dark; `canvas` is the page.
        ink: "#0c2d3b",
        canvas: "#f5f4f1",
        surface: "#ffffff",
        raised: "#ecebe6",
        line: "#dedbd3",
        "line-strong": "#c5c1b6",

        // Text, at the ratios the Academy's contrast check enforces.
        "ink-text": "#0c2d3b",  // 12.10:1 on surface
        muted: "#313c3f",       //  9.52:1
        dim: "#454f52",         //  7.06:1

        // The inverted frame the sidebar sits on.
        chrome: "#0c2d3b",
        "chrome-2": "#123847",
        "chrome-ink": "#eef2f2",   // 12.80:1 on chrome
        "chrome-muted": "#c0cfd3", //  9.01:1
        "chrome-soft": "#9fb1b8",  //  6.50:1
      },
      fontFamily: {
        // The estate's three faces. `sans` is the reading face; headings and
        // the nav take `display`, eyebrows and labels take `label` — wired
        // globally in globals.css so 1,300 utility-classed components did not
        // each need an opinion.
        sans: ["var(--font-body-primary)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display-primary)", "ui-sans-serif", "system-ui", "sans-serif"],
        label: ["var(--font-label-primary)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        // Was a set of neon glows, which only work on a dark ground. Paper on
        // a light table instead — the Academy's elevation, same values.
        card: "0 1px 2px 0 rgba(12,45,59,0.05), 0 1px 3px 0 rgba(12,45,59,0.04)",
        glow: "0 4px 12px -2px rgba(12,45,59,0.10), 0 2px 5px -1px rgba(12,45,59,0.05)",
        "glow-accent": "0 4px 12px -2px rgba(113,82,7,0.16), 0 0 0 1px rgba(255,191,0,0.45)",
        "glow-success": "0 4px 12px -2px rgba(20,99,80,0.16), 0 0 0 1px rgba(49,184,151,0.45)",
        "glow-soft": "0 16px 32px -12px rgba(12,45,59,0.18)",
      },
      transitionTimingFunction: {
        instrument: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      animation: {
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        scanline: "scanline 12s linear infinite",
      },
      keyframes: {
        "pulse-soft": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.55" } },
        "pulse-glow": {
          "0%": { boxShadow: "0 0 0 0 rgba(49, 184, 151, 0.55)" },
          "70%": { boxShadow: "0 0 0 8px rgba(49, 184, 151, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(49, 184, 151, 0)" },
        },
        scanline: { "0%": { transform: "translateY(0)" }, "100%": { transform: "translateY(-100%)" } },
      },
    },
  },
  plugins: [],
} satisfies Config;
