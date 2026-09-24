import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Can every colour Lab Hours writes text in actually be read?
 *
 * Two halves, because intention and practice are different things:
 *
 *   1. The token pairs the palette promises — body text on each ground, each
 *      ink on its own tint, the rail, the fills.
 *   2. Every pair the SOURCE actually produces. A palette can be immaculate
 *      and still be assembled wrongly; this half found 53 near-black chips
 *      left over from the dark theme, carrying near-black text at 1.25:1.
 *
 * Tailwind's config is the palette of record — a utility class is what ships.
 * globals.css mirrors it for the handful of rules that need a custom property.
 *
 *   npm run contrast
 */
const ROOT = new URL("..", import.meta.url).pathname;
const cfg = readFileSync(join(ROOT, "tailwind.config.ts"), "utf8");

/** The palette, flattened to the names a utility class can spell. */
function palette(): Record<string, string> {
  const block = cfg.slice(cfg.indexOf("colors: {"), cfg.indexOf("fontFamily:"));
  const out: Record<string, string> = { white: "#ffffff", black: "#000000" };
  const brandStart = block.indexOf("brand: {");
  const brandEnd = block.indexOf("\n        },", brandStart);
  const brand = block.slice(brandStart, brandEnd);
  for (const m of brand.matchAll(/["']?([a-z0-9-]+)["']?:\s*"(#[0-9a-fA-F]{6})"/g))
    out[`brand-${m[1]}`] = m[2].toLowerCase();
  out["brand"] = out["brand-primary"];
  for (const m of block.slice(brandEnd).matchAll(/["']?([a-z0-9-]+)["']?:\s*"(#[0-9a-fA-F]{6})"/g))
    out[m[1]] = m[2].toLowerCase();
  return out;
}
const PAL = palette();

const lin = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const p = (name: string) => {
  const v = PAL[name];
  if (!v) throw new Error(`no such colour token: ${name}`);
  return v;
};

let fail = 0;
const check = (name: string, fg: string, bg: string, min: number) => {
  const r = contrast(fg, bg);
  const ok = r >= min;
  if (!ok) fail++;
  console.log(`  ${ok ? "✓" : "✗"} ${name.padEnd(38)} ${r.toFixed(2).padStart(6)}${ok ? "" : `   needs ${min}`}`);
};

// ─── 1. what the palette promises ────────────────────────────────────────────
console.log("\nBody text, on each of the three light grounds");
for (const [tok, mins] of [["ink-text", [12, 12, 11]], ["muted", [8, 7.5, 7]], ["dim", [6, 5.5, 5]]] as const)
  (["surface", "canvas", "raised"] as const).forEach((g, i) =>
    check(`--${tok} on ${g}`, p(tok), p(g), mins[i]),
  );

console.log("\nEach ink on its own tint, and on paper");
for (const fam of ["primary", "success", "accent", "coral"]) {
  check(`${fam}-ink on ${fam}-tint`, p(`brand-${fam}-ink`), p(`brand-${fam}-tint`), 7);
  check(`${fam}-ink on ${fam}-tint-strong`, p(`brand-${fam}-ink`), p(`brand-${fam}-tint-strong`), 4.5);
  check(`${fam}-ink on surface`, p(`brand-${fam}-ink`), p("surface"), 7);
  check(`--ink-text on ${fam}-tint`, p("ink-text"), p(`brand-${fam}-tint`), 11);
}

console.log("\nThe rail — the one dark ground in the product");
check("chrome-ink on chrome", p("chrome-ink"), p("chrome"), 12);
check("chrome-muted on chrome", p("chrome-muted"), p("chrome"), 7);
check("chrome-soft on chrome", p("chrome-soft"), p("chrome"), 4.5);
check("chrome-ink on chrome-2 (hover)", p("chrome-ink"), p("chrome-2"), 10);
check("accent on chrome (the hot item)", p("brand-accent"), p("chrome"), 7);

console.log("\nText on the bright fills — the buttons");
check("white on primary", "#ffffff", p("brand-primary"), 7);
check("white on primary-dark (hover)", "#ffffff", p("brand-primary-dark"), 7);
check("ink on accent", p("ink-text"), p("brand-accent"), 7);
check("ink on accent-dark (hover)", p("ink-text"), p("brand-accent-dark"), 7);
check("ink on success", p("ink-text"), p("brand-success"), 7);
  check("ink on success-dark (hover)", p("ink-text"), p("brand-success-dark"), 7);
check("ink on coral", p("ink-text"), p("brand-coral"), 4.5);

// ─── 2. what the source actually assembles ───────────────────────────────────
const files: string[] = [];
(function walk(d: string) {
  for (const e of readdirSync(d)) {
    if (e === "node_modules" || e === ".next") continue;
    const q = join(d, e);
    if (statSync(q).isDirectory()) walk(q);
    else if (/\.tsx$/.test(q)) files.push(q);
  }
})(join(ROOT, "src"));

/** Amber, mint and coral are fills. Writing in them is the mistake this catches. */
const FILL_ONLY = ["brand-accent", "brand-success", "brand-coral", "brand-primary-glow"];
type Hit = { where: string; what: string; ratio?: number };
const pairs: Hit[] = [];
const fillsAsText: Hit[] = [];

for (const f of files) {
  const rel = f.slice(ROOT.length);
  readFileSync(f, "utf8")
    .split("\n")
    .forEach((line, i) => {
      const at = `${rel}:${i + 1}`;
      for (const tok of FILL_ONLY) {
        // The rail's hot item is the documented exception: amber on chrome.
        if (rel.endsWith("sidebar-nav.tsx") && line.includes("it.hot")) continue;
        if (new RegExp(`text-${tok}(?![a-z0-9-])`).test(line))
          fillsAsText.push({ where: at, what: `text-${tok}` });
      }
      for (const m of line.matchAll(/"([^"]*)"|`([^`]*)`/g)) {
        const cls = m[1] ?? m[2] ?? "";
        const bgs = [...cls.matchAll(/(?:^|\s)bg-([a-z0-9-]+)(?:\/(\d+))?(?=\s|$)/g)];
        const txs = [...cls.matchAll(/(?:^|\s)text-([a-z0-9-]+)(?:\/(\d+))?(?=\s|$)/g)];
        for (const b of bgs) {
          const bg = PAL[b[1]];
          if (!bg || (b[2] && Number(b[2]) < 90)) continue;
          for (const t of txs) {
            const fg = PAL[t[1]];
            if (!fg) continue;
            const r = contrast(fg, bg);
            if (r < 4.5) pairs.push({ where: at, what: `text-${t[1]} on bg-${b[1]}`, ratio: r });
          }
        }
      }
    });
}

console.log(`\nPairs the source assembles (${files.length} components scanned)`);
if (pairs.length === 0) console.log("  ✓ every background/text pair in the source clears 4.5:1");
else {
  fail += pairs.length;
  for (const h of pairs) console.log(`  ✗ ${h.ratio!.toFixed(2)}  ${h.what}  ${h.where}`);
}

/**
 * Stale colour literals.
 *
 * The sweep that moved this product onto Voltage changed tokens and utility
 * classes, and missed thirteen raw `rgba(...)` values in the stylesheet and
 * the shadow definitions — because a literal belongs to no token and so no
 * token check can see it. They sat there rendering the previous palette's
 * ink, amber and mint underneath the new one.
 *
 * Every literal in these two files should be a current palette colour at some
 * opacity. Anything else is either a leftover or a colour that should have
 * been a token in the first place.
 */
const known = new Set(
  Object.values(PAL).map((h) =>
    [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",")
  )
);
const stale: string[] = [];
for (const file of ["src/app/globals.css", "tailwind.config.ts"]) {
  const text = readFileSync(join(ROOT, file), "utf8");
  text.split("\n").forEach((line, i) => {
    // Skip the token definitions themselves.
    if (/^\s*(--|["']?[a-z0-9-]+["']?:\s*"#)/.test(line)) return;
    for (const m of line.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
      const rgb = `${m[1]},${m[2]},${m[3]}`;
      if (rgb === "0,0,0" || rgb === "255,255,255") continue;
      if (!known.has(rgb))
        stale.push(`  ✗ rgb(${rgb}) is not in the palette   ${file}:${i + 1}`);
    }
  });
}
console.log("\nColour literals in the stylesheet and the shadows");
if (stale.length === 0)
  console.log("  ✓ every raw rgba() is a current palette colour");
else {
  fail += stale.length;
  for (const l of stale) console.log(l);
}

console.log("\nFills used as text (amber, mint, coral and the teal glow)");
if (fillsAsText.length === 0) console.log("  ✓ none — the fills are only ever fills");
else {
  fail += fillsAsText.length;
  for (const h of fillsAsText) console.log(`  ✗ ${h.what}  ${h.where}`);
}

console.log(fail ? `\n${fail} problem${fail === 1 ? "" : "s"}\n` : `\nAll clear.\n`);
process.exit(fail ? 1 : 0);
