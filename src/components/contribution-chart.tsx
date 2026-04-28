import { CATEGORIES, type Category } from "@/lib/categories";
import { previousTermKey, termLabel } from "@/lib/participation";

type Cell = { termKey: string; label: string; categories: string[] };

export function ContributionChart({
  history,
  catMap,
}: {
  history: { termKey: string; categories: string[] }[];
  catMap: Map<string, { label: string; dot: string }>;
}) {
  const map = new Map(history.map((h) => [h.termKey, h.categories]));
  const cells: Cell[] = [];
  let cursor = history.length
    ? history[0].termKey
    : "";
  if (!cursor) {
    const now = new Date();
    cursor = `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`;
  }
  for (let i = 0; i < 6; i++) {
    cells.push({
      termKey: cursor,
      label: termLabel(cursor),
      categories: map.get(cursor) ?? [],
    });
    cursor = previousTermKey(cursor);
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        Last 6 quarters
      </h2>
      <ol className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {cells.reverse().map((c) => (
          <li
            key={c.termKey}
            className="rounded-md border border-line bg-raised p-2 text-center"
          >
            <p className="font-mono text-[10px] uppercase tracking-wider text-dim">
              {c.label}
            </p>
            <div className="mt-2 flex min-h-[24px] flex-wrap justify-center gap-1">
              {c.categories.length === 0 && (
                <span className="text-xs text-dim">—</span>
              )}
              {c.categories.map((k) => {
                const meta = catMap.get(k) ?? CATEGORIES[k as Category];
                return (
                  <span
                    key={k}
                    title={meta?.label ?? k}
                    className={`inline-block h-3 w-3 rounded-full ${
                      meta?.dot ?? "bg-stone-500"
                    }`}
                  />
                );
              })}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
