/**
 * The estate's flavour band — Lab Hours' cyan, #00BFE9, per ESTATE.md.
 *
 * The hub sells this app as a cyan squircle with a flask on it; this is the
 * doorway keeping that promise: the hue as a gradient, the glyph as a
 * watermark, the name large, and the page riding up over it on a sheet.
 *
 * Written in ink, not white. Cyan is a light hue — white on it is 2.18:1,
 * and on the band's lightest stop 1.69:1 — so it takes dark text, the same
 * as amber and mint do. Ink clears 6.62:1 on the deepest stop of this
 * gradient and 9.90:1 on the lightest.
 */
export function FlavourBand() {
  return (
    <div
      aria-hidden
      className="relative h-28 shrink-0 overflow-hidden sm:h-32"
      style={{
        background:
          "linear-gradient(118deg, color-mix(in oklab, var(--afin-cyan) 92%, var(--afin-ink)) 0%, var(--afin-cyan) 55%, color-mix(in oklab, var(--afin-cyan) 70%, white) 100%)",
      }}
    >
      <svg
        className="absolute -top-5 right-6 opacity-[0.14] sm:right-10"
        width="150" height="150" viewBox="0 0 24 24" fill="none"
        stroke="var(--afin-ink)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M10 3.5h4M11 3.5v5.2L5.8 18a2.2 2.2 0 0 0 2 3.2h8.4a2.2 2.2 0 0 0 2-3.2L13 8.7V3.5" />
        <path d="M8 15h8" />
        <circle cx="12" cy="18" r="1.4" fill="var(--afin-ink)" stroke="none" />
      </svg>
      <span className="absolute bottom-8 left-5 flex items-end gap-2.5 text-ink-text sm:left-8">
        <span className="font-display text-[26px] leading-none font-semibold tracking-tight">Lab Hours</span>
      </span>
    </div>
  );
}
