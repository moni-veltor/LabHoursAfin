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
        // Voltage — the same values globals.css carries, so a utility class and
        // a custom property can never disagree about what "teal" is. Every
        // family is a fill, a tint to sit text on, and an ink to write in.
        brand: {
          // Lab Hours' assigned hue in the estate palette is #00BFE9 — the
          // cyan the hub paints its tile with. This app had been wearing the
          // generic Afin teal instead, so the launcher promised one colour
          // and the app delivered another.
          //
          // `primary-glow` IS that hue. `primary` is a fill deep enough that
          // white reads on it at 7:1, because the hue itself cannot hold
          // white — 2.18:1 — and is a fill that carries ink, like amber and
          // mint. `primary-ink` is its text voice.
          primary: "#076178",
          "primary-dark": "#0c4f61",
          "primary-glow": "#00BFE9",
          "primary-ink": "#175668",
          "primary-tint": "#d3f3ff",
          "primary-tint-strong": "#a5e4fa",
          "primary-50": "#d3f3ff",
          "primary-100": "#a5e4fa",

          // Amber and mint are fills only. Neither can be read as text on any
          // light ground — 1.9:1 and 1.8:1 on white. Their text voices are the
          // `-ink` values, which clear 7:1 on their own tint and 8:1 on white.
          accent: "#FFB300",
          "accent-dark": "#E6A200",
          "accent-ink": "#694803",
          "accent-tint": "#feeacc",
          "accent-tint-strong": "#f3d4a5",
          "accent-50": "#feeacc",
          "accent-100": "#f3d4a5",

          success: "#00D68F",
          "success-dark": "#07c987",
          "success-ink": "#0f5b3c",
          "success-tint": "#d4f7e3",
          "success-tint-strong": "#b1e8ca",
          "success-50": "#d4f7e3",
          "success-100": "#b1e8ca",

          // Coral takes ink, not white: white on coral is 3.24:1.
          coral: "#FF4D5E",
          "coral-ink": "#981a2c",
          "coral-tint": "#ffe6e5",
          "coral-tint-strong": "#ffcac9",
          "coral-50": "#ffe6e5",
        },

        // Structure. `ink` is the dark; `canvas` is the page.
        ink: "#07202C",
        canvas: "#F3F7FA",
        surface: "#ffffff",
        raised: "#E6EEF3",
        line: "#D8E1E7",
        "line-strong": "#BCCAD2",

        // Text, at the ratios scripts/contrast.ts enforces.
        "ink-text": "#07202C",  // 15.55:1 on surface
        muted: "#254552",       //  9.71:1
        dim: "#3A5864",         //  6.67:1

        // The rail IS the hue, and it is written in ink.
        //
        // Three attempts got this wrong the same way. Lab Hours' assigned
        // colour is #00BFE9 — a LIGHT hue — and I kept mixing it into the ink
        // to make a dark frame. At 16% the ground had chroma 0.053 against
        // cyan's 0.137, which is why it read as a murky dark green rather than
        // as cyan. Pushing the mix further does not rescue it: at 44% a
        // near-white label is down to 7.07:1 with no headroom, muted and soft
        // collapse into one value, and the amber hot-marker falls to 3.94:1 —
        // below AA. A dark frame cannot carry a light hue.
        //
        // So the rail is the hue at full chroma and the text is dark, exactly
        // as amber and mint fills carry ink. Ink reads 7.69:1 on it, and there
        // is room for three voices instead of one.
        chrome: "#00BFE9",
        "chrome-2": "#07aad0",     // hover ground · ink 6.13:1
        "chrome-ink": "#07202C",   //  7.69:1 on chrome
        "chrome-muted": "#173b46", //  5.50:1
        "chrome-soft": "#234652",  //  4.65:1
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
        card: "0 1px 2px 0 rgba(7,32,44,0.05), 0 1px 3px 0 rgba(7,32,44,0.04)",
        glow: "0 4px 12px -2px rgba(7,32,44,0.10), 0 2px 5px -1px rgba(7,32,44,0.05)",
        "glow-accent": "0 4px 12px -2px rgba(105,72,3,0.16), 0 0 0 1px rgba(255,179,0,0.45)",
        "glow-success": "0 4px 12px -2px rgba(15,91,60,0.16), 0 0 0 1px rgba(0,214,143,0.45)",
        "glow-soft": "0 16px 32px -12px rgba(7,32,44,0.18)",
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
          "0%": { boxShadow: "0 0 0 0 rgba(0, 214, 143, 0.55)" },
          "70%": { boxShadow: "0 0 0 8px rgba(0, 214, 143, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(0, 214, 143, 0)" },
        },
        scanline: { "0%": { transform: "translateY(0)" }, "100%": { transform: "translateY(-100%)" } },
      },
    },
  },
  plugins: [],
} satisfies Config;
