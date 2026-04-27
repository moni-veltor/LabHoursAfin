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
    <section className="rounded-xl border border-line bg-surface p-6">
      <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
        Recordings &amp; resources
      </h2>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l}>
            <a
              href={l}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-2 rounded-md border border-line bg-raised px-3 py-2 text-sm transition hover:border-brand-primary/40 hover:bg-brand-primary-950"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-brand-primary group-hover:bg-brand-primary-glow" />
              <span className="font-medium text-ink-text">{hostname(l)}</span>
              <span className="ml-auto truncate font-mono text-[10px] text-dim">
                {l}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
