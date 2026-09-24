"use client";

import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import { DIFFICULTIES, FORMATS, type Difficulty, type Format } from "@/lib/categories";

type CategoryMeta = { label: string; badge: string; dot: string };

type Props = {
  id: string;
  title: string;
  summary: string;
  status: string;
  category: CategoryMeta;
  format: Format;
  difficulty: Difficulty;
  ownerName: string | null;
  timeCommitment: string | null;
  capacity: number | null;
  participantCount: number;
  createdAt: Date;
  /** When the session actually runs. The most important fact on the card. */
  startsAt?: Date | string | null;
  tags: string[];
  featured?: boolean;
  coverImage?: string | null;
  crossTeam?: boolean;
  locked?: boolean;
  closedToMembers?: boolean;
  /**
   * How the card is set on the page.
   *
   * The Wire's idea, and the reason its front page reads like one: a page is
   * made of sizes. One thing leads, a few are worth a picture, the rest are
   * lines you skim. Thirty identical cards is a feed, not a front page.
   */
  setting?: Setting;
};

export type Setting = "lead" | "tile" | "row";

/**
 * The tail of the page: a line you skim, not a card you study.
 */
function InitiativeRow(p: Props) {
  const when = startsLabel(p.startsAt);
  const full = p.capacity != null && p.participantCount >= p.capacity;
  return (
    <article className="group relative flex items-center gap-3 border-b border-line py-2.5 last:border-0">
      <span
        aria-hidden
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDot[p.status]?.dot ?? "bg-dim"}`}
      />
      <span className="min-w-0 flex-1">
        <Link
          href={`/initiatives/${p.id}`}
          className="truncate text-sm font-medium after:absolute after:inset-0 after:content-[''] group-hover:text-brand-primary-ink"
        >
          {p.title}
        </Link>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[10px] uppercase tracking-wider text-dim">
          <span>{p.category.label}</span>
          <span className="text-line-strong">·</span>
          <span>{FORMATS[p.format].label.toLowerCase()}</span>
          {p.ownerName && (
            <>
              <span className="text-line-strong">·</span>
              <span>{p.ownerName}</span>
            </>
          )}
        </span>
      </span>
      {full && (
        <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-dim">
          full
        </span>
      )}
      {when && (
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-brand-primary-ink">
          {when}
        </span>
      )}
    </article>
  );
}

/** "tomorrow", "in 3 days", "Tue 14 Oct" — or nothing, if it has no date. */
function startsLabel(at: Date | string | null | undefined): string | null {
  if (!at) return null;
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.round((d.getTime() - Date.now()) / 86400000);
  if (days < -1) return null; // already happened; the status dot says so
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 14) return `in ${days} days`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const statusDot: Record<string, { dot: string; live?: boolean }> = {
  open: { dot: "bg-brand-success", live: true },
  in_progress: { dot: "bg-brand-primary-glow", live: true },
  done: { dot: "bg-dim" },
  draft: { dot: "bg-brand-accent" },
  archived: { dot: "bg-dim" },
};

export function InitiativeCard(p: Props) {
  if ((p.setting ?? "tile") === "row") return <InitiativeRow {...p} />;
  const lead = p.setting === "lead";
  const cat = p.category;
  const s = statusDot[p.status] ?? { dot: "bg-dim" };
  const taken = p.capacity ? p.participantCount / p.capacity : 0;
  const full = p.capacity != null && p.participantCount >= p.capacity;
  const nearlyFull = !full && taken >= 0.75;
  // When it runs beats when it was posted: a session next Tuesday is a
  // different proposition from one that was posted last Tuesday.
  const when = startsLabel(p.startsAt);
  const soon = when === "today" || when === "tomorrow" || (when ?? "").startsWith("in ");
  return (
    <article
      className={`group relative overflow-hidden rounded-xl border bg-surface transition ${
        p.featured
          ? "border-brand-accent/40 shadow-glow-accent"
          : "border-line hover:border-brand-primary/40 hover:shadow-glow-soft"
      } ${p.locked ? "opacity-50" : ""}`}
      title={p.locked ? "Category locked for you this term" : undefined}
    >
      {p.coverImage ? (
        <div className={`relative w-full overflow-hidden ${lead ? "h-56" : "h-32"}`}>
          <div
            className={`absolute inset-0 bg-cover bg-center ${lead ? "kenburns" : "transition-transform duration-500 group-hover:scale-105"}`}
            style={{ backgroundImage: `url(${p.coverImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
        </div>
      ) : lead ? (
        // No picture to drift, so the telegraph runs instead — the same
        // substitution The Wire makes for a story that arrives without one.
        <div
          className="relative h-20 w-full overflow-hidden"
          style={{
            background:
              "linear-gradient(118deg, color-mix(in oklab, var(--afin-cyan) 92%, var(--afin-ink)), var(--afin-cyan))",
          }}
        >
          <span className="wire-line absolute inset-x-0 top-1/2 block" aria-hidden />
        </div>
      ) : null}
      <div className={lead ? "p-6" : "p-5"}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cat.badge}`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${cat.dot}`} />
            {cat.label}
          </span>
          {p.featured && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-accent/40 bg-brand-accent-tint px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-accent-ink">
              ★ featured
            </span>
          )}
          {p.crossTeam && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-success/30 bg-brand-success-tint px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-success-ink">
              cross-team
            </span>
          )}
          {p.locked && (
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-raised px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-dim">
              locked
            </span>
          )}
          <span
            className={`ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider ${
              p.closedToMembers ? "text-brand-accent-ink" : "text-muted"
            }`}
          >
            <span className="relative inline-flex h-1.5 w-1.5">
              <span
                className={`relative h-1.5 w-1.5 rounded-full ${
                  p.closedToMembers ? "bg-brand-accent" : s.dot
                }`}
              />
              {s.live && !p.closedToMembers && (
                <span
                  className={`absolute inset-0 rounded-full ${s.dot} animate-pulse-soft opacity-60`}
                />
              )}
            </span>
            {p.closedToMembers ? "Closed" : p.status.replace("_", " ")}
            {soon && (
              <span
                aria-hidden
                className="live-dot ml-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-primary-glow"
              />
            )}
          </span>
        </div>

        <h3 className={`mt-3 font-semibold tracking-tight text-ink-text group-hover:text-brand-primary-ink ${lead ? "font-display text-2xl" : "text-lg"}`}>
          {/* The card used to be one big <a> with the tag links inside it —
              nested anchors, which is invalid and which browsers resolve
              however they like. The link lives on the title now and stretches
              over the card with ::after, so the whole card is still one click
              and one tab stop, and the tags are independently clickable
              because they sit above it. */}
          <Link
            href={`/initiatives/${p.id}`}
            className="line-clamp-2 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {p.title}
          </Link>
        </h3>
        <p className={`mt-1 text-muted ${lead ? "line-clamp-3 text-base" : "line-clamp-2 text-sm"}`}>
          {p.summary}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-dim">
          <span>{FORMATS[p.format].label.toLowerCase()}</span>
          {p.difficulty !== "any" && (
            <>
              <span className="text-line-strong">·</span>
              <span>{DIFFICULTIES[p.difficulty].label.toLowerCase()}</span>
            </>
          )}
          {p.timeCommitment && (
            <>
              <span className="text-line-strong">·</span>
              <span>{p.timeCommitment}</span>
            </>
          )}
          <span className="ml-auto">{when ?? timeAgo(p.createdAt)}</span>
        </div>

        {p.capacity != null && (
          <div className="mt-3">
            <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wider">
              <span className={full ? "text-brand-accent-ink" : "text-dim"}>
                {full
                  ? "Full"
                  : nearlyFull
                  ? `${p.capacity - p.participantCount} place${p.capacity - p.participantCount === 1 ? "" : "s"} left`
                  : `${p.participantCount} of ${p.capacity}`}
              </span>
              {!full && nearlyFull && (
                <span className="text-brand-accent-ink">filling up</span>
              )}
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-raised">
              <div
                className={`h-full rounded-full ${
                  full ? "bg-brand-accent" : "bg-brand-success"
                }`}
                style={{ width: `${Math.min(100, Math.round(taken * 100))}%` }}
              />
            </div>
          </div>
        )}

        {p.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.tags.slice(0, 4).map((t) => (
              <Link
                key={t}
                href={`/t/${t}`}
                className="relative z-10 rounded-md border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted hover:border-line-strong hover:text-ink-text"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
