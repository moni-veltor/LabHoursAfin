"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes, ChevronDown, ClipboardList, FileText, Flame, Inbox, LayoutGrid,
  ListChecks, Menu, Plus, ScrollText, Settings, Shapes, Sparkles, Trophy,
  UserRound, Users, X,
} from "lucide-react";
import type { IconName, NavGroup } from "@/lib/nav-items";

const ICONS: Record<IconName, React.ElementType> = {
  initiatives: LayoutGrid, hack: Flame, showcase: Sparkles, people: Users,
  board: UserRound, inbox: Inbox, owner: ClipboardList, templates: FileText,
  admin: Boxes, queue: ListChecks, categories: Shapes, audit: ScrollText,
  settings: Settings, leaderboard: Trophy,
};

/**
 * The top bar.
 *
 * This was a left rail, and the rail existed for a good reason: the bar it
 * replaced carried twelve things in one row — six links, a hack button, an
 * admin chip, a New button, a bell, a keyboard hint and sign-out — which is
 * more than a row can hold, and things had started shrinking into mono chips
 * to fit. A column had room.
 *
 * But a column costs 16rem of every page forever, on a product whose pages
 * are mostly wide tables and card grids. So this is a bar again, and the old
 * objection is answered by not putting twelve things in it: the six places
 * people actually go sit in the row, and the role-gated long tail — running
 * initiatives, and the five admin screens — moves into a labelled menu.
 * Nothing was dropped. /admin/audit, which before the rail was reachable only
 * from a mobile drawer, is still one click from every page.
 *
 * On small screens the row becomes a bottom tab bar, because a thumb reaches
 * the bottom of a phone and not the top.
 */
export function TopNav({
  groups,
  primary,
  brand,
  identity,
}: {
  groups: NavGroup[];
  primary?: { href: string; label: string };
  brand: React.ReactNode;
  identity: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // "Browse" and "Yours" are where people go; "Run" and "Admin" are things a
  // few people do, so they belong behind a menu rather than in everyone's way.
  const inline = groups.filter((g) => g.label === "Browse" || g.label === "Yours");
  const tucked = groups.filter((g) => g.label !== "Browse" && g.label !== "Yours");
  const flat = inline.flatMap((g) => g.items);

  const isOn = (href: string) => {
    const base = href.split("?")[0];
    return base === "/" ? pathname === "/" : pathname.startsWith(base);
  };

  useEffect(() => {
    setMenu(false);
    setSheet(false);
  }, [pathname]);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [sheet]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-chrome text-chrome-ink">
        <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
          {brand}

          <nav className="ml-4 hidden items-center gap-0.5 md:flex">
            {flat.map((it) => {
              const Icon = ICONS[it.icon];
              const on = isOn(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  aria-current={on ? "page" : undefined}
                  className={`relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition ${
                    on
                      ? "bg-white/10 font-medium text-chrome-ink"
                      : "text-chrome-muted hover:bg-white/5 hover:text-chrome-ink"
                  }`}
                >
                  <Icon size={15} aria-hidden className={it.hot ? "text-brand-accent" : undefined} />
                  {it.label}
                  {it.badge ? (
                    <span className="ml-0.5 rounded-full bg-brand-accent px-1.5 text-[10px] font-bold tabular-nums text-ink">
                      {it.badge}
                    </span>
                  ) : null}
                  {on && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-success" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {primary && (
              <Link
                href={primary.href}
                className="btn-press hidden items-center gap-1.5 rounded-lg bg-brand-success px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-brand-success-dark sm:flex"
              >
                <Plus size={15} aria-hidden />
                {primary.label}
              </Link>
            )}

            {tucked.length > 0 && (
              <div ref={menuRef} className="relative hidden md:block">
                <button
                  onClick={() => setMenu((v) => !v)}
                  aria-expanded={menu}
                  aria-haspopup="menu"
                  className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-chrome-muted transition hover:bg-white/5 hover:text-chrome-ink"
                >
                  Manage
                  <ChevronDown size={14} aria-hidden className={menu ? "rotate-180 transition" : "transition"} />
                </button>
                {menu && (
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-1 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1.5 text-ink-text shadow-glow-soft"
                  >
                    {tucked.map((g) => (
                      <div key={g.label}>
                        <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wider text-dim">
                          {g.label}
                        </p>
                        {g.items.map((it) => {
                          const Icon = ICONS[it.icon];
                          return (
                            <Link
                              key={it.href}
                              href={it.href}
                              role="menuitem"
                              className={`flex items-center gap-2.5 px-3 py-1.5 text-sm transition hover:bg-raised ${
                                isOn(it.href) ? "font-medium text-brand-primary-ink" : ""
                              }`}
                            >
                              <Icon size={15} aria-hidden />
                              {it.label}
                            </Link>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="hidden md:block">{identity}</div>

            <button
              onClick={() => setSheet(true)}
              className="rounded-md p-2 text-chrome-muted transition hover:bg-white/5 hover:text-chrome-ink md:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {/* Phone: the five most-used, where a thumb can reach them. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-chrome pb-[env(safe-area-inset-bottom)] md:hidden">
        {flat.slice(0, 5).map((it) => {
          const Icon = ICONS[it.icon];
          const on = isOn(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition ${
                on ? "text-chrome-ink" : "text-chrome-soft"
              }`}
            >
              <Icon size={19} aria-hidden />
              <span className="max-w-full truncate px-1">{it.label}</span>
              {it.badge ? (
                <span className="absolute right-[22%] top-1 h-1.5 w-1.5 rounded-full bg-brand-accent" />
              ) : null}
              {on && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand-success" />}
            </Link>
          );
        })}
      </nav>

      {sheet && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => setSheet(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-chrome p-4 text-chrome-ink shadow-glow-soft">
            <div className="mb-3 flex items-center justify-between">
              {brand}
              <button
                onClick={() => setSheet(false)}
                className="rounded-md p-2 text-chrome-muted hover:text-chrome-ink"
                aria-label="Close menu"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            {primary && (
              <Link
                href={primary.href}
                className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-brand-success px-3 py-2.5 text-sm font-semibold text-ink"
              >
                <Plus size={16} aria-hidden />
                {primary.label}
              </Link>
            )}
            {groups.map((g) => (
              <div key={g.label} className="mb-3">
                <p className="px-1 pb-1 font-mono text-[10px] uppercase tracking-wider text-chrome-soft">
                  {g.label}
                </p>
                {g.items.map((it) => {
                  const Icon = ICONS[it.icon];
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition ${
                        isOn(it.href) ? "bg-white/10 font-medium" : "text-chrome-muted hover:bg-white/5"
                      }`}
                    >
                      <Icon size={16} aria-hidden />
                      <span className="flex-1">{it.label}</span>
                      {it.badge ? (
                        <span className="rounded-full bg-brand-accent px-1.5 text-[10px] font-bold text-ink">
                          {it.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}
            <div className="border-t border-white/10 pt-3">{identity}</div>
          </div>
        </div>
      )}
    </>
  );
}
