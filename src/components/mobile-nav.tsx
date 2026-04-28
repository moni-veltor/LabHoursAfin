"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Link = { href: string; label: string; emphasis?: "primary" | "accent" };

export function MobileNav({ links }: { links: Link[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-raised text-muted hover:text-ink-text sm:hidden"
      >
        <span className="font-mono text-base leading-none">{open ? "×" : "≡"}</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm sm:hidden"
          onClick={() => setOpen(false)}
        >
          <div
            className="ml-auto h-full w-72 border-l border-line bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
              Navigate
            </p>
            <ul className="mt-3 space-y-1">
              {links.map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    className={`block rounded-md px-3 py-2 text-sm ${
                      l.emphasis === "primary"
                        ? "bg-brand-primary text-white shadow-glow"
                        : l.emphasis === "accent"
                        ? "border border-brand-accent/40 bg-brand-accent-950 text-brand-accent"
                        : "text-muted hover:bg-raised hover:text-ink-text"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
