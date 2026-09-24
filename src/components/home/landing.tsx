import Link from "next/link";
import { ArrowRight, CalendarClock, FileText, Sparkles, Star } from "lucide-react";
import { whatsNew, type NewsKind } from "@/lib/news";
import { RULES, boardWithMovement, currentTerm, pointsFor } from "@/lib/points";
import { CountUp } from "@/components/count-up";
import { termLabel } from "@/lib/participation";

function Medal({ place, size = 30 }: { place: number; size?: number }) {
  return (
    <span
      className={`medal medal-${place} shrink-0 font-display font-bold`}
      style={{ width: size, height: size, fontSize: size * 0.44 }}
      aria-label={`Position ${place}`}
    >
      {place}
    </span>
  );
}

/**
 * The board, as much of it as a landing page should carry.
 *
 * The top three and where you stand — enough to be worth a glance and to make
 * the full board worth a click, without turning the front page into it.
 */
export async function LeaderboardStrip({ userId }: { userId?: string }) {
  const term = currentTerm();
  const [board, mine] = await Promise.all([
    boardWithMovement(term),
    userId ? pointsFor(userId, term) : null,
  ]);
  if (board.length === 0) return null;
  const top = board[0].total || 1;

  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          Leaderboard · {termLabel(term)}
        </h2>
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-1 font-label text-xs font-bold text-brand-primary-ink hover:underline"
        >
          Full board <ArrowRight size={12} aria-hidden />
        </Link>
      </div>

      <ol className="mt-3 space-y-2">
        {board.slice(0, 3).map((r, i) => (
          <li key={r.userId} className="flex items-center gap-3">
            <Medal place={i + 1} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {r.userId === userId ? "You" : r.name ?? r.email}
              </span>
              <span className="bar-track mt-1 block h-1.5 w-full overflow-hidden bg-raised">
                <span
                  className="bar3d lb-bar block h-full bg-brand-primary-glow"
                  style={{ width: `${Math.max(6, (r.total / top) * 100)}%`, animationDelay: `${i * 70}ms` }}
                />
              </span>
            </span>
            <CountUp
              value={r.total}
              delay={i * 70}
              className="font-display text-lg font-bold tabular-nums"
            />
          </li>
        ))}
      </ol>

      {mine && (
        <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
          {mine.rank ? (
            <>
              You are <strong className="text-ink-text">#{mine.rank}</strong> of {mine.of} with{" "}
              <strong className="text-ink-text">{mine.total}</strong> points.
            </>
          ) : (
            <>
              You have no points this quarter. Attending a session is{" "}
              {RULES.attended.points}.
            </>
          )}
        </p>
      )}
    </section>
  );
}

const NEWS: Record<NewsKind, { icon: React.ElementType; label: string; cls: string }> = {
  soon: { icon: CalendarClock, label: "starting soon", cls: "bg-brand-accent-tint text-brand-accent-ink" },
  update: { icon: FileText, label: "update", cls: "bg-raised text-muted" },
  outcome: { icon: Sparkles, label: "outcome", cls: "bg-brand-success-tint text-brand-success-ink" },
  new: { icon: Star, label: "new", cls: "bg-brand-primary-tint text-brand-primary-ink" },
};

function when(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 0) {
    const days = Math.round(-mins / 1440);
    if (days <= 0) return "today";
    if (days === 1) return "tomorrow";
    return `in ${days} days`;
  }
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

/** What has happened lately, and what is about to. */
export async function NewsFeed() {
  const items = await whatsNew(7);
  if (items.length === 0) return null;

  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <h2 className="font-display text-sm font-semibold tracking-tight">
        What&rsquo;s happening
      </h2>
      <ul className="mt-2 divide-y divide-line">
        {items.map((n, i) => {
          const meta = NEWS[n.kind];
          const Icon = meta.icon;
          return (
            <li key={`${n.kind}-${n.href}-${i}`} className="py-2">
              <Link href={n.href} className="group flex items-start gap-2.5">
                <span className={`mt-0.5 shrink-0 rounded-md p-1 ${meta.cls}`}>
                  <Icon size={13} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="truncate text-sm font-medium group-hover:text-brand-primary-ink">
                      {n.title}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
                      {meta.label} · {when(n.at)}
                    </span>
                  </span>
                  {n.detail && (
                    <span className="mt-0.5 line-clamp-1 block text-xs text-muted">
                      {n.who ? `${n.who}: ` : ""}
                      {n.detail}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
