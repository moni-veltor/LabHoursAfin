"use client";

import { useEffect, useState } from "react";

export function Countdown({ to }: { to: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / (24 * 3600 * 1000));
  const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
  const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
  const secs = Math.floor((diff % (60 * 1000)) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="inline-flex items-center gap-1 font-mono text-lg tracking-wider text-brand-accent">
      <Cell label="d">{pad(days)}</Cell>
      <Sep />
      <Cell label="h">{pad(hours)}</Cell>
      <Sep />
      <Cell label="m">{pad(mins)}</Cell>
      <Sep />
      <Cell label="s">{pad(secs)}</Cell>
    </span>
  );
}

function Cell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex flex-col items-center rounded-md border border-brand-accent/40 bg-brand-accent-950 px-2 py-1">
      <span className="text-base font-semibold text-brand-accent">{children}</span>
      <span className="text-[8px] uppercase tracking-[0.2em] text-brand-accent/70">
        {label}
      </span>
    </span>
  );
}

function Sep() {
  return <span className="text-brand-accent/70">:</span>;
}
