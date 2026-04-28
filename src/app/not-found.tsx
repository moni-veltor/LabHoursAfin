import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-8 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-accent">
        404
      </p>
      <h1 className="mt-2 text-xl font-semibold">This page is off the map.</h1>
      <p className="mt-2 text-sm text-muted">
        The thing you were looking for isn't here. Maybe try one of these.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
        <Link
          href="/"
          className="rounded-md bg-brand-primary px-3 py-1.5 font-medium text-white hover:bg-brand-primary-dark"
        >
          Browse
        </Link>
        <Link
          href="/showcase"
          className="rounded-md border border-line bg-raised px-3 py-1.5 hover:bg-line"
        >
          Showcase
        </Link>
        <Link
          href="/me"
          className="rounded-md border border-line bg-raised px-3 py-1.5 hover:bg-line"
        >
          My board
        </Link>
      </div>
    </div>
  );
}
