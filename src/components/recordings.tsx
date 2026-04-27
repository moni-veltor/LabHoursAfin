function hostname(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

export function Recordings({ raw }: { raw: string | null }) {
  if (!raw) return null;
  const links = raw
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("http"));
  if (links.length === 0) return null;
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
        Recordings & resources
      </h2>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l}>
            <a
              href={l}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm transition hover:border-brand-primary/40 hover:text-brand-primary"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-brand-primary" />
              <span className="font-medium">{hostname(l)}</span>
              <span className="truncate text-xs text-stone-500">{l}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
