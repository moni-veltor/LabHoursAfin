/**
 * Placeholders that hold the shape of what is coming.
 *
 * Every page in this product does its database work before it renders
 * anything, so until now a click did nothing visible until the whole page was
 * ready — on a slow query that reads as a broken link rather than a wait.
 * These are what Next shows in the meantime, and they are built to the
 * geometry of the real page so the content does not jump when it lands.
 */
export function Sk({ className = "" }: { className?: string }) {
  return <span className={`sk block ${className}`} aria-hidden />;
}

/** A page's title block. */
export function SkHeader({ lede = true }: { lede?: boolean }) {
  return (
    <div>
      <Sk className="h-8 w-56 rounded-lg" />
      {lede && <Sk className="mt-2 h-4 w-full max-w-xl" />}
    </div>
  );
}

/** One initiative card, at the height the real one settles to. */
export function SkCard() {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="flex gap-2">
        <Sk className="h-4 w-20 rounded-full" />
        <Sk className="h-4 w-16 rounded-full" />
      </div>
      <Sk className="mt-3 h-5 w-3/4" />
      <Sk className="mt-2 h-3.5 w-full" />
      <Sk className="mt-1.5 h-3.5 w-5/6" />
      <div className="mt-4 flex items-center gap-2">
        <Sk className="h-6 w-6 rounded-full" />
        <Sk className="h-3 w-24" />
        <Sk className="ml-auto h-3 w-12" />
      </div>
    </div>
  );
}

/** A grid of cards, at the page's own column count. */
export function SkCardGrid({ n = 6 }: { n?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: n }, (_, i) => (
        <SkCard key={i} />
      ))}
    </div>
  );
}

/** A list row — the leaderboard, the inbox, a register. */
export function SkRow({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
      <Sk className="h-4 w-6" />
      <div className="min-w-0 flex-1">
        <Sk className={`h-4 ${wide ? "w-1/3" : "w-40"}`} />
        <Sk className="mt-2 h-1 w-2/3 rounded-full" />
      </div>
      <Sk className="h-6 w-10" />
    </div>
  );
}

export function SkRows({ n = 6, wide = false }: { n?: number; wide?: boolean }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: n }, (_, i) => (
        <SkRow key={i} wide={wide} />
      ))}
    </div>
  );
}

/** A bordered panel with a few lines in it. */
export function SkPanel({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <Sk className="h-4 w-32" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <Sk key={i} className="h-3.5 w-full" />
        ))}
      </div>
    </div>
  );
}
