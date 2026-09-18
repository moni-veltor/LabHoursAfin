/**
 * The estate's flavour band — Labhours' teal, per ESTATE.md.
 *
 * The hub sells this app as a teal squircle with a flask on it; this is the
 * doorway keeping that promise: the hue as a gradient, the glyph as a
 * watermark, the name large, and the page riding up over it on a sheet.
 */
export function FlavourBand() {
  return (
    <div
      aria-hidden
      className="relative h-28 shrink-0 overflow-hidden sm:h-32"
      style={{
        background:
          "linear-gradient(118deg, color-mix(in oklab, #1a4a54 82%, #0c2d3b) 0%, #1a4a54 62%, color-mix(in oklab, #1a4a54 72%, white) 100%)",
      }}
    >
      <svg
        className="absolute -top-5 right-6 opacity-[0.16] sm:right-10"
        width="150" height="150" viewBox="0 0 24 24" fill="none"
        stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M10 3.5h4M11 3.5v5.2L5.8 18a2.2 2.2 0 0 0 2 3.2h8.4a2.2 2.2 0 0 0 2-3.2L13 8.7V3.5" />
        <path d="M8 15h8" />
        <circle cx="12" cy="18" r="1.4" fill="#ffffff" stroke="none" />
      </svg>
      <span className="absolute bottom-8 left-5 flex items-end gap-2.5 text-white sm:left-8">
        <span className="font-display text-[26px] leading-none font-semibold tracking-tight">Lab Hours</span>
      </span>
    </div>
  );
}
