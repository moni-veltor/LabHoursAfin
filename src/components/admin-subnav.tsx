import Link from "next/link";

const LINKS: { href: string; label: string }[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/queue", label: "Queue" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminSubNav({ active }: { active: string }) {
  return (
    <div className="-mx-1 mb-4 flex flex-wrap gap-1 overflow-x-auto pb-1 text-sm">
      {LINKS.map((l) => {
        const isActive = active === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition ${
              isActive
                ? "bg-brand-accent text-ink shadow-glow-accent"
                : "border border-line bg-raised text-muted hover:text-ink-text"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
