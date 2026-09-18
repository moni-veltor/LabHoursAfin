import { readFileSync } from "node:fs";

/**
 * The cascade check, shared with the Bank Academy.
 *
 *   npm run cascade
 */
/**
 * Component classes must not out-rank utilities.
 *
 * `.eyebrow` set a colour from a bare rule, which lands after Tailwind's
 * layers and therefore beat every `text-*` utility written beside it. Seven
 * call sites asked for a light tone on a dark ground and silently got the
 * dark page tone: the sidebar's group labels and the sign-in page's Email
 * and Password labels rendered at 1.27:1 — invisible — on the first screen
 * anybody sees. Nothing caught it, because the markup was right, the token
 * was right, and only the cascade was wrong.
 *
 * This reads the SOURCE stylesheet, not the compiled one: after compilation
 * a hand-written component rule and a generated utility look identical, and
 * only the source says which layer the author put it in.
 */
// Comments first: several in this file contain braces (they quote CSS), and
// a brace inside a comment throws the block matcher's depth count off enough
// to swallow the rest of the stylesheet — which is exactly how the first
// version of this check passed while the bug was still present.
const source = readFileSync("src/app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Drop every @layer / @media / @supports block, braces balanced. */
function stripBlocks(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "@" && /^@(layer|media|supports|theme)\b/.test(text.slice(i))) {
      const open = text.indexOf("{", i);
      if (open === -1) break;
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === "{") depth++;
        else if (text[j] === "}") depth--;
        j++;
      }
      i = j - 1;
      continue;
    }
    out += text[i];
  }
  return out;
}

const topLevel = stripBlocks(source);
const offenders = [...topLevel.matchAll(/(\.[a-z][\w-]*(?:[^{};]*?))\s*\{([^{}]*)\}/g)]
  .filter(([, , body]) => /(?<!-)\bcolor\s*:/.test(body))
  .map((m) => m[1].trim().split("\n").pop()!.trim());

if (offenders.length) {
  console.log("\n  Class rules setting `color` outside any layer:");
  for (const o of new Set(offenders)) {
    console.log(`  ✗ ${o} — beats any text-* utility written beside it`);
  }
  console.log(
    `\n${new Set(offenders).size} rule(s) out-rank utilities. Wrap them in @layer components.\n`,
  );
  process.exit(1);
}

console.log("  ✓ no component class out-ranks a utility\n");
