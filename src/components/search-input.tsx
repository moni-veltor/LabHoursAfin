import Link from "next/link";

export function SearchInput({ q, action = "/" }: { q?: string; action?: string }) {
  return (
    <form action={action} method="GET" className="flex w-full items-center gap-2">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-xs text-dim">
          /
        </span>
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="search initiatives, tags, areas..."
          className="w-full rounded-md border border-line bg-raised pl-7 pr-3 py-2 text-sm placeholder:text-dim focus:border-brand-primary focus:outline-none"
        />
      </div>
      {q ? (
        <Link
          href={action}
          className="rounded-md border border-line bg-raised px-3 py-2 text-sm text-muted hover:text-ink-text"
        >
          Clear
        </Link>
      ) : (
        <button className="rounded-md border border-line bg-raised px-3 py-2 text-sm text-muted hover:text-ink-text">
          Search
        </button>
      )}
    </form>
  );
}
