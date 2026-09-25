"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes, ChevronsLeft, ChevronsRight, ClipboardList, FileText, Flame, Grid3x3,
  Inbox, LayoutGrid, ListChecks, Menu, Plus, ScrollText, Settings, Shapes,
  Sparkles, Trophy, UserRound, Users, X,
} from "lucide-react";
import type { IconName, NavGroup } from "@/lib/nav-items";

const ICONS: Record<IconName, React.ElementType> = {
  initiatives: LayoutGrid, hack: Flame, showcase: Sparkles, people: Users,
  board: UserRound, inbox: Inbox, owner: ClipboardList, templates: FileText,
  admin: Boxes, queue: ListChecks, categories: Shapes, audit: ScrollText,
  settings: Settings, leaderboard: Trophy,
};

const HUB =
  process.env.NEXT_PUBLIC_HUB_URL ?? "https://afin-tech-team.vercel.app";

/**
 * The left rail.
 *
 * A column, because a column has room to label things properly — twelve
 * destinations in a horizontal bar had them shrinking into mono chips to fit,
 * which is why this product left that pattern in the first place.
 *
 * What a fixed column costs is 16rem of every page forever. So it collapses
 * to its icons and remembers that you collapsed it, and while collapsed it
 * still opens on hover — the panel grows *over* the page rather than pushing
 * it, so nothing reflows under the pointer and the page beneath keeps the
 * width it had.
 *
 * The first thing in it is the way out. Lab Hours is one tile of the Afin
 * tech-team hub, and a door you cannot walk back through is not a door.
 */
export function SidebarNav({
  groups,
  primary,
  brand,
  brandMark,
  identity,
}: {
  groups: NavGroup[];
  /** The one create action, above the groups. */
  primary?: { href: string; label: string };
  brand: React.ReactNode;
  /** The mark alone, for when the rail is down to its icons. */
  brandMark: React.ReactNode;
  identity: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const [collapsed, setCollapsed] = useState(false);
  const [peek, setPeek] = useState(false);
  const [drawer, setDrawer] = useState(false);

  /**
   * Read the stored preference after mount, never during render: localStorage
   * does not exist on the server, and the first client paint has to match the
   * markup the server sent or React will complain about both.
   */
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("rail-collapsed") === "1");
    } catch {
      /* private mode, blocked storage — the default is fine */
    }
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("rail-collapsed", next ? "1" : "0");
      } catch {
        /* not worth failing for */
      }
      return next;
    });
    setPeek(false);
  };

  useEffect(() => setDrawer(false), [pathname]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  /** Narrow only when collapsed and the pointer is elsewhere. */
  const narrow = collapsed && !peek;

  const isOn = (href: string) => {
    const base = href.split("?")[0];
    return base === "/" ? pathname === "/" : pathname.startsWith(base);
  };

  const panel = (opts: { thin: boolean; close?: boolean }) => (
    <>
      <div
        className={`flex items-center gap-2 border-b border-ink/10 py-4 ${
          opts.thin ? "justify-center px-2" : "px-4"
        }`}
      >
        <div className="min-w-0 flex-1">{opts.thin ? brandMark : brand}</div>
        {opts.close && (
          <button
            onClick={() => setDrawer(false)}
            className="rounded-md p-2 text-chrome-muted hover:text-chrome-ink"
            aria-label="Close menu"
          >
            <X size={18} aria-hidden />
          </button>
        )}
      </div>

      <nav
        aria-label="Main"
        className={`flex-1 overflow-y-auto overflow-x-hidden py-4 ${
          opts.thin ? "px-2" : "px-3"
        }`}
      >
        {/* The way back to the collection, first and visually apart from the
            rows below it — everything else here stays inside Lab Hours, and
            this one leaves. */}
        <a
          href={HUB}
          title="All apps"
          className={`mb-4 flex items-center gap-2.5 rounded-lg border border-ink/20 py-2 text-sm font-medium text-chrome-muted transition hover:border-ink/40 hover:bg-ink/[0.07] hover:text-chrome-ink ${
            opts.thin ? "justify-center px-0" : "px-2.5"
          }`}
        >
          <Grid3x3 size={16} aria-hidden className="shrink-0" />
          {!opts.thin && (
            <>
              <span className="min-w-0 flex-1 truncate">All apps</span>
              <span className="font-mono text-[9px] uppercase opacity-60">hub</span>
            </>
          )}
        </a>

        {primary && (
          <Link
            href={primary.href}
            title={primary.label}
            className={`btn-press mb-5 flex items-center justify-center gap-2 rounded-lg bg-ink py-2.5 text-sm font-semibold text-white transition hover:bg-chrome-muted ${
              opts.thin ? "px-0" : "px-3"
            }`}
          >
            <Plus size={16} aria-hidden className="shrink-0" />
            {!opts.thin && primary.label}
          </Link>
        )}

        {groups.map((g) => (
          <div key={g.label} className="mb-5">
            <p
              className={`eyebrow px-2 pb-1.5 text-chrome-muted ${
                opts.thin ? "sr-only" : ""
              }`}
            >
              {g.label}
            </p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const Icon = ICONS[it.icon];
                const on = isOn(it.href);
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      title={it.label}
                      aria-current={on ? "page" : undefined}
                      className={`relative flex items-center gap-2.5 rounded-md py-2 text-sm transition ${
                        opts.thin ? "justify-center px-0" : "px-2.5"
                      } ${
                        on
                          ? "bg-surface font-semibold text-chrome-ink shadow-card"
                          : "text-chrome-muted hover:bg-ink/[0.06] hover:text-chrome-ink"
                      }`}
                    >
                      {on && (
                        <span
                          aria-hidden
                          className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-ink"
                        />
                      )}
                      <span className="relative shrink-0">
                        <Icon
                          size={17}
                          aria-hidden
                          // Coral, not amber: on a cyan ground amber is
                          // 1.22:1 and simply is not there. This is an icon,
                          // not text, so it answers to WCAG's 3:1 for
                          // non-text content rather than 4.5 — it clears
                          // 3.82:1 — and being cyan's complement it is what
                          // actually draws the eye here.
                          className={it.hot ? "text-brand-coral-ink" : undefined}
                        />
                        {opts.thin && it.badge ? (
                          <span
                            aria-hidden
                            className="absolute -right-1 -top-1 size-2 rounded-full bg-brand-accent"
                          />
                        ) : null}
                      </span>
                      {!opts.thin && (
                        <>
                          <span className="min-w-0 flex-1 truncate">{it.label}</span>
                          {it.badge ? (
                            <span className="shrink-0 rounded-full bg-brand-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink">
                              {it.badge}
                            </span>
                          ) : null}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={`border-t border-ink/10 py-3 ${opts.thin ? "hidden" : "px-4"}`}>
        {identity}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop. Collapsed, the aside keeps a 3.5rem footprint and the panel
          inside it grows over the page on hover — widening the aside itself
          would reflow the whole page under the pointer. */}
      <aside
        onMouseEnter={() => collapsed && setPeek(true)}
        onMouseLeave={() => setPeek(false)}
        style={{ width: collapsed ? "3.5rem" : "16rem" }}
        className="sticky top-0 hidden h-screen shrink-0 lg:block"
      >
        <div
          className={`flex h-screen flex-col bg-chrome text-chrome-ink transition-[width] duration-200 ease-instrument ${
            collapsed && peek
              ? "absolute inset-y-0 left-0 z-50 w-64 shadow-glow-soft"
              : "w-full"
          }`}
        >
          {panel({ thin: narrow })}
          <button
            onClick={toggle}
            aria-label={collapsed ? "Pin the menu open" : "Collapse the menu"}
            title={collapsed ? "Pin the menu open" : "Collapse the menu"}
            className={`flex items-center gap-2 border-t border-ink/10 py-2 text-chrome-soft transition hover:bg-ink/[0.06] hover:text-chrome-ink ${
              narrow ? "justify-center px-0" : "px-4"
            }`}
          >
            {collapsed ? (
              <ChevronsRight size={16} aria-hidden />
            ) : (
              <ChevronsLeft size={16} aria-hidden />
            )}
            {!narrow && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Phone: a bar the thumb reaches, and the same rail in a drawer. */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-chrome px-4 py-3 text-chrome-ink lg:hidden">
        {brand}
        <div className="flex items-center gap-1">
          <a
            href={HUB}
            aria-label="All apps"
            className="rounded-md p-2 text-chrome-muted transition hover:bg-ink/[0.06] hover:text-chrome-ink"
          >
            <Grid3x3 size={19} aria-hidden />
          </a>
          <button
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            className="rounded-md p-2 text-chrome-muted transition hover:bg-ink/[0.06] hover:text-chrome-ink"
          >
            <Menu size={20} aria-hidden />
          </button>
        </div>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-chrome text-chrome-ink shadow-glow-soft">
            {panel({ thin: false, close: true })}
          </div>
        </div>
      )}
    </>
  );
}
