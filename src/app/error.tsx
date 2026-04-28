"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[lab-hours] error boundary:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-rose-400">
        500 · server exception
      </p>
      <h1 className="mt-3 text-xl font-semibold">Something broke our way.</h1>
      <p className="mt-2 text-sm text-muted">
        The page hit an unexpected error. We've logged it. You can try again, or head
        back to the home page.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[10px] text-dim">
          digest: {error.digest}
        </p>
      )}
      <div className="mt-5 flex gap-2">
        <button
          onClick={reset}
          className="rounded-md bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary-dark"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-md border border-line bg-raised px-3 py-1.5 text-sm text-ink-text hover:bg-line"
        >
          Home
        </a>
      </div>
    </div>
  );
}
