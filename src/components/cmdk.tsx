"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Item = { id: string; title: string; category: string };

const STATIC_LINKS = [
  { href: "/", label: "Browse initiatives" },
  { href: "/showcase", label: "Showcase" },
  { href: "/me", label: "My board" },
  { href: "/me/portfolio", label: "My portfolio" },
  { href: "/templates", label: "Templates" },
  { href: "/initiatives/new", label: "New initiative" },
  { href: "/admin", label: "Admin" },
];

export function CmdK({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const meta = isMac ? e.metaKey : e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
    else setQ("");
  }, [open]);

  const filteredInitiatives = useMemo(() => {
    if (!q) return items.slice(0, 8);
    const needle = q.toLowerCase();
    return items
      .filter((i) => i.title.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [q, items]);

  const filteredLinks = useMemo(() => {
    if (!q) return STATIC_LINKS;
    const needle = q.toLowerCase();
    return STATIC_LINKS.filter((l) => l.label.toLowerCase().includes(needle));
  }, [q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-stone-900/30 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-stone-200 px-3">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search initiatives, jump anywhere..."
            className="w-full bg-transparent py-3 text-sm focus:outline-none"
          />
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {filteredLinks.length > 0 && (
            <Group title="Navigate">
              {filteredLinks.map((l) => (
                <Row
                  key={l.href}
                  onSelect={() => {
                    setOpen(false);
                    router.push(l.href);
                  }}
                >
                  {l.label}
                </Row>
              ))}
            </Group>
          )}
          {filteredInitiatives.length > 0 && (
            <Group title="Initiatives">
              {filteredInitiatives.map((i) => (
                <Row
                  key={i.id}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/initiatives/${i.id}`);
                  }}
                >
                  <span className="truncate">{i.title}</span>
                  <span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                    {i.category.replace(/_/g, " ")}
                  </span>
                </Row>
              ))}
            </Group>
          )}
          {filteredInitiatives.length === 0 && filteredLinks.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-stone-500">No matches.</p>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">
          <span>↑↓ navigate · enter open · esc close</span>
          <span className="font-mono">⌘K</span>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-3 pt-2 text-xs font-medium uppercase tracking-wide text-stone-400">
        {title}
      </div>
      <ul className="py-1">{children}</ul>
    </div>
  );
}

function Row({
  onSelect,
  children,
}: {
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        onClick={onSelect}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-primary-50 hover:text-brand-primary"
      >
        {children}
      </button>
    </li>
  );
}
