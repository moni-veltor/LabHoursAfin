import Link from "next/link";

export function SearchInput({ q, action = "/" }: { q?: string; action?: string }) {
  return (
    <form action={action} method="GET" className="flex w-full items-center gap-2">
      <input
        name="q"
        defaultValue={q ?? ""}
        placeholder="Search initiatives..."
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
      />
      {q ? (
        <Link
          href={action}
          className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
        >
          Clear
        </Link>
      ) : (
        <button className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
          Search
        </button>
      )}
    </form>
  );
}
