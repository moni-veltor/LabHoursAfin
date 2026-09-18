"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes, ClipboardList, FileText, Flame, House, Inbox, LayoutGrid, ListChecks, Menu,
  Plus, ScrollText, Settings, Shapes, Sparkles, UserRound, Users, X,
} from "lucide-react";
import type { IconName, NavGroup } from "@/lib/nav-items";

/** Names to components, resolved on the client — see IconName for why. */
const ICONS: Record<IconName, React.ElementType> = {
  initiatives: LayoutGrid, hack: Flame, showcase: Sparkles, people: Users,
  board: UserRound, inbox: Inbox, owner: ClipboardList, templates: FileText,
  admin: Boxes, queue: ListChecks, categories: Shapes, audit: ScrollText,
  settings: Settings,
};

/**
 * The left rail.
 *
 * Lab Board's navigation was a single horizontal row carrying twelve things —
 * six links, a hack button, an admin chip, a New button, a bell, a keyboard
 * hint and sign-out — which is more than a row can hold legibly and is why
 * items had started shrinking into mono-case chips to fit.
 *
 * A rail instead, grouped by what you are there to do, matching the Bank
 * Academy so the two products feel like one estate. Every destination that
 * was in the old bar or its mobile drawer is still here: nothing was dropped
 * to make it fit, which is the whole point of moving to a column — a column
 * has room.
 *
 * One genuine recovery: /admin/audit had no link anywhere except the old
 * mobile drawer, so on desktop the audit log was unreachable. It has a row now.
 */
export function SidebarNav({
  groups,
  primary,
  brand,
  identity,
}: {
  groups: NavGroup[];
  /** The one create action, above the groups. */
  primary?: { href: string; label: string };
  brand: React.ReactNode;
  identity: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";

  // Drawer manners, the same in all three of the estate's apps: Escape
  // closes it, and the page underneath stops scrolling while it is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const body = (
    <>
      {primary && (
        <Link
          href={primary.href}
          onClick={() => setOpen(false)}
          className="btn-press mb-5 flex items-center justify-center gap-2 rounded-lg bg-brand-success px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-brand-success-dark"
        >
          <Plus size={16} aria-hidden />
          {primary.label}
        </Link>
      )}

      {/* The way back to the collection. Labhours is one tile of the Afin
          tech-team hub, and until this link existed the hub was a door that
          only opened one way. First in the rail and in the same place in
          every app, so "home" never needs finding. */}
      <a
        href={process.env.NEXT_PUBLIC_HUB_URL ?? "https://afin-tech-team.vercel.app"}
        className="mb-5 flex items-center gap-2.5 rounded-md border border-white/15 px-2.5 py-2 text-sm font-medium text-chrome-muted transition hover:bg-white/[0.05] hover:text-chrome-ink"
      >
        <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden>
          <rect width="32" height="32" rx="7.5" fill="rgba(255,255,255,.12)" />
          <path d="M9.5 23.5 L16 8.5 L22.5 23.5" fill="none" stroke="#eef2f2" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16" cy="18.2" r="2.3" fill="#31b897" />
        </svg>
        <span className="min-w-0 flex-1 truncate">Afin Tech team</span>
        <span className="font-mono text-[9px] uppercase opacity-60">hub</span>
      </a>

      {groups.map((g) => (
        <div key={g.label} className="mb-5">
          <p className="eyebrow px-2 pb-1.5 text-chrome-muted">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active =
                it.href === "/"
                  ? pathname === "/"
                  : pathname === it.href || pathname.startsWith(it.href + "/");
              const Icon = ICONS[it.icon];
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-white/[0.10] text-white"
                        : "text-chrome-muted hover:bg-white/[0.05] hover:text-chrome-ink"
                    }`}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand-success"
                      />
                    )}
                    <Icon
                      size={17}
                      aria-hidden
                      className={it.hot ? "text-brand-accent" : undefined}
                    />
                    <span className="min-w-0 flex-1 truncate">{it.label}</span>
                    {it.badge ? (
                      <span className="shrink-0 rounded-full bg-brand-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink">
                        {it.badge > 99 ? "99+" : it.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );

  return (
    <>
      {/* ── Desktop rail ─────────────────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-chrome text-chrome-ink lg:flex">
        <div className="border-b border-white/10 px-5 py-5">{brand}</div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
          {body}
        </nav>
        <div className="border-t border-white/10 px-4 py-3">{identity}</div>
      </aside>

      {/* ── Mobile bar ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-chrome px-4 py-3 text-chrome-ink lg:hidden">
        <div className="min-w-0">{brand}</div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-2.5 py-1.5 text-xs font-medium text-chrome-ink"
        >
          <Menu size={17} aria-hidden />
          Menu
        </button>
      </header>

      {/* ── Bottom tab bar, phones only — per ESTATE.md, a real app
          navigates from the bottom of the screen. Home goes to the hub. ── */}
      <nav
        aria-label="App sections"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-chrome pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="flex items-stretch">
          <li className="flex-1">
            <a
              href={process.env.NEXT_PUBLIC_HUB_URL ?? "https://afin-tech-team.vercel.app"}
              className="flex flex-col items-center gap-0.5 py-2 text-chrome-soft transition hover:text-chrome-ink"
            >
              <House size={18} aria-hidden />
              <span className="font-mono text-[9px] font-semibold">Home</span>
            </a>
          </li>
          {groups.flatMap((g) => g.items).slice(0, 4).map((it) => {
            const active = it.href === "/" ? pathname === "/" : pathname === it.href || pathname.startsWith(it.href + "/");
            const Icon = ICONS[it.icon];
            return (
              <li key={it.href} className="flex-1">
                <Link
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex flex-col items-center gap-0.5 py-2 transition ${
                    active ? "text-white" : "text-chrome-soft hover:text-chrome-ink"
                  }`}
                >
                  {active && <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-success" />}
                  <span className="relative">
                    <Icon size={18} aria-hidden />
                    {it.badge ? <span aria-hidden className="absolute -top-1 -right-1.5 size-2 rounded-full bg-brand-accent" /> : null}
                  </span>
                  <span className="max-w-16 truncate font-mono text-[9px] font-semibold">{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-chrome text-chrome-ink shadow-glow-soft">
            <div className="flex items-start justify-between border-b border-white/10 px-5 py-5">
              <div className="min-w-0">{brand}</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="-mr-1 rounded-md p-1 text-chrome-muted hover:bg-white/10 hover:text-chrome-ink"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
              {body}
            </nav>
            <div className="border-t border-white/10 px-4 py-3">{identity}</div>
          </div>
        </div>
      )}
    </>
  );
}
