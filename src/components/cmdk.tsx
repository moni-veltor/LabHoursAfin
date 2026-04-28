"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; title: string; category: string };

const STATIC_LINKS = [
  { href: "/", label: "Browse initiatives" },
  { href: "/showcase", label: "Showcase" },
  { href: "/people", label: "People" },
  { href: "/inbox", label: "Inbox" },
  { href: "/me", label: "My board" },
  { href: "/me/edit", label: "Edit my profile" },
  { href: "/me/portfolio", label: "My portfolio" },
  { href: "/owner", label: "Owner dashboard" },
  { href: "/templates", label: "Templates" },
  { href: "/initiatives/new", label: "New initiative" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/queue", label: "Admin queue" },
  { href: "/admin/categories", label: "Admin categories" },
  { href: "/admin/audit", label: "Admin audit" },
  { href: "/admin/settings", label: "Admin settings" },
];

const COMMANDS = [
  { id: "surprise", label: "✦ Surprise me", action: "/?surprise=1" },
  { id: "theme", label: "◐ Toggle theme", action: "theme" },
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
    return items.filter((i) => i.title.toLowerCase().includes(needle)).slice(0, 8);
  }, [q, items]);

  const filteredLinks = useMemo(() => {
    if (!q) return STATIC_LINKS;
    const needle = q.toLowerCase();
    return STATIC_LINKS.filter((l) => l.label.toLowerCase().includes(needle));
  }, [q]);

  const filteredCommands = useMemo(() => {
    if (!q) return COMMANDS;
    const needle = q.toLowerCase();
    return COMMANDS.filter(
      (c) => c.label.toLowerCase().includes(needle) || c.id.includes(needle)
    );
  }, [q]);

  function runCommand(c: (typeof COMMANDS)[number]) {
    if (c.action === "theme") {
      const cur = localStorage.getItem("lh-theme") ?? "dark";
      const next = cur === "dark" ? "light" : "dark";
      localStorage.setItem("lh-theme", next);
      document.documentElement.classList.toggle("light", next === "light");
      setOpen(false);
    } else {
      setOpen(false);
      router.push(c.action);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/70 px-4 pt-[12vh] backdrop-blur-md"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-glow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line bg-raised px-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-brand-primary-glow">$</span>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="type a command or initiative..."
              className="w-full bg-transparent py-3 text-sm text-ink-text placeholder:text-dim focus:outline-none"
            />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-auto py-1">
          {filteredCommands.length > 0 && (
            <Group title="commands">
              {filteredCommands.map((c) => (
                <Row key={c.id} onSelect={() => runCommand(c)}>
                  <span className="font-mono text-xs text-brand-accent">▸</span>
                  <span>{c.label}</span>
                </Row>
              ))}
            </Group>
          )}
          {filteredLinks.length > 0 && (
            <Group title="navigate">
              {filteredLinks.map((l) => (
                <Row
                  key={l.href}
                  onSelect={() => {
                    setOpen(false);
                    router.push(l.href);
                  }}
                >
                  <span className="font-mono text-xs text-dim">↗</span>
                  <span>{l.label}</span>
                </Row>
              ))}
            </Group>
          )}
          {filteredInitiatives.length > 0 && (
            <Group title="initiatives">
              {filteredInitiatives.map((i) => (
                <Row
                  key={i.id}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/initiatives/${i.id}`);
                  }}
                >
                  <span className="font-mono text-xs text-dim">›</span>
                  <span className="truncate">{i.title}</span>
                  <span className="ml-auto rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted">
                    {i.category.replace(/_/g, " ")}
                  </span>
                </Row>
              ))}
            </Group>
          )}
          {filteredInitiatives.length === 0 && filteredLinks.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted">No matches.</p>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line bg-raised px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-dim">
          <span>↑↓ navigate · ↵ open · esc close</span>
          <span className="text-brand-primary-glow">⌘K</span>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-3 pt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
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
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted hover:bg-brand-primary-950 hover:text-ink-text"
      >
        {children}
      </button>
    </li>
  );
}
