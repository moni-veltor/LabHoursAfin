import { readFileSync } from "node:fs";

/**
 * Does every colour Lab Hours writes text in survive being read?
 *
 * The same check the Bank Academy runs, on the same palette, at the same
 * thresholds — that is most of what "the two products share a design" means
 * in practice. AA's 4.5:1 is the floor at which text stops being a failure,
 * not the point at which it is comfortable, so the tokens carrying the bulk
 * of the interface are held higher.
 *
 *   npm run contrast
 */
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function token(name: string, depth = 0): string {
  const m = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`no such colour token: ${name}`);
  const value = m[1].trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  const ref = value.match(/var\((--[a-z0-9-]+)\)/);
  if (ref && depth < 4) return token(ref[1], depth + 1);
  throw new Error(`${name} does not resolve to a hex: ${value}`);
}

const lin = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const SURFACE = token("--surface");
const CANVAS = token("--canvas");
const RAISED = token("--raised");
const CHROME = "#0c2d3b";

/** Chrome values live in the Tailwind config, not the stylesheet. */
const CHROME_TOKENS = { "chrome-ink": "#eef2f2", "chrome-muted": "#c0cfd3", "chrome-soft": "#9fb1b8" };

type Case = { name: string; fg: string; bg: string; min: number };

const CASES: Case[] = [
  // Body text, on each of the three light grounds it can land on.
  { name: "--ink-text on surface", fg: token("--ink-text"), bg: SURFACE, min: 10 },
  { name: "--ink-text on canvas",  fg: token("--ink-text"), bg: CANVAS,  min: 10 },
  { name: "--ink-text on raised",  fg: token("--ink-text"), bg: RAISED,  min: 9 },
  { name: "--muted on surface",    fg: token("--muted"),    bg: SURFACE, min: 7 },
  { name: "--muted on raised",     fg: token("--muted"),    bg: RAISED,  min: 6.5 },
  { name: "--dim on surface",      fg: token("--dim"),      bg: SURFACE, min: 6 },
  { name: "--dim on raised",       fg: token("--dim"),      bg: RAISED,  min: 5 },

  // Links and the accent's text voice.
  { name: "--brand-primary on surface", fg: token("--brand-primary"), bg: SURFACE, min: 7 },
  { name: "--brand-primary on canvas",  fg: token("--brand-primary"), bg: CANVAS,  min: 7 },
  { name: "--afin-goldenrod on surface", fg: token("--afin-goldenrod"), bg: SURFACE, min: 5.5 },

  // Text on the tints, which is where a status is read.
  { name: "--ink-text on mint tint",  fg: token("--ink-text"), bg: token("--mint-tint"),  min: 10 },
  { name: "--ink-text on coral tint", fg: token("--ink-text"), bg: token("--coral-tint"), min: 10 },
  { name: "--ink-text on amber tint", fg: token("--ink-text"), bg: token("--amber-tint"), min: 10 },

  // The rail. Its text sits on ink, so it is checked against ink.
  { name: "chrome-ink on the rail",   fg: CHROME_TOKENS["chrome-ink"],   bg: CHROME, min: 10 },
  { name: "chrome-muted on the rail", fg: CHROME_TOKENS["chrome-muted"], bg: CHROME, min: 7 },
  { name: "chrome-soft on the rail",  fg: CHROME_TOKENS["chrome-soft"],  bg: CHROME, min: 4.5 },

  // Dark text on the bright brand fills — the buttons.
  { name: "--afin-ink on mint fill",  fg: token("--afin-ink"), bg: token("--afin-mint"),  min: 4.5 },
  { name: "--afin-ink on amber fill", fg: token("--afin-ink"), bg: token("--afin-amber"), min: 4.5 },
  { name: "white on teal fill",       fg: "#ffffff",           bg: token("--afin-teal"),  min: 7 },
];

let fail = 0;
for (const c of CASES) {
  const ratio = contrast(c.fg, c.bg);
  const ok = ratio >= c.min;
  if (!ok) fail++;
  console.log(
    `  ${ok ? "✓" : "✗"} ${c.name.padEnd(32)} ${c.fg}  ${ratio.toFixed(2).padStart(6)}` +
      (ok ? "" : `   needs ${c.min}`),
  );
}

console.log(
  fail
    ? `\n${fail} of ${CASES.length} below the ratio they need\n`
    : `\n${CASES.length}/${CASES.length} pass, at or above their required ratio\n`,
);
process.exit(fail ? 1 : 0);
