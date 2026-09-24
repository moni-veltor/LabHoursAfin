import Link from "next/link";
import { RULES, type PointKind } from "@/lib/points";
import { termLabel } from "@/lib/participation";

type Score = {
  total: number;
  allTime: number;
  rank: number | null;
  of: number;
  attended: number;
  byKind: Record<PointKind, number>;
  best: { term: string; points: number } | null;
  history: { term: string; points: number }[];
};

/**
 * Your quarter — the other ninety per cent's view of the leaderboard.
 *
 * A ranking is motivating if you are near the top of it and discouraging if
 * you are not, which is most people most of the time. This says what you did
 * rather than who you beat: sessions attended, what you put back, and whether
 * this quarter is better than your last. Rank is here, but small, and last.
 */
export function YourQuarter({ score, term }: { score: Score; term: string }) {
  const put =
    score.byKind.ran + score.byKind.outcome + score.byKind.lessons;
  const prev = score.history.find((h) => h.term !== term);
  const delta = prev ? score.total - prev.points : null;
  const isBest = score.best?.term === term && score.total > 0;

  if (score.allTime === 0)
    return (
      <section className="rounded-xl border border-dashed border-line bg-surface px-4 py-5">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          No points yet
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Points come from turning up, not from signing up. Attend a session and
          you will have {RULES.attended.points}; run one people come to and you
          will have {RULES.ran.points}.{" "}
          <Link href="/leaderboard" className="font-medium underline underline-offset-2">
            How points work
          </Link>
        </p>
      </section>
    );

  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          Your {termLabel(term)}
        </h2>
        {score.rank && (
          <Link
            href="/leaderboard"
            className="font-mono text-[10px] uppercase tracking-wider text-dim hover:text-ink-text"
          >
            #{score.rank} of {score.of} →
          </Link>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="font-display text-3xl font-bold tabular-nums">
            {score.total}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-dim">
            points this quarter
          </p>
        </div>
        <div>
          <p className="font-display text-3xl font-bold tabular-nums">
            {score.attended}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-dim">
            {score.attended === 1 ? "session attended" : "sessions attended"}
          </p>
        </div>
        {put > 0 && (
          <div>
            <p className="font-display text-3xl font-bold tabular-nums">{put}</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-dim">
              from what you put back
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 text-sm text-muted">
        {isBest ? (
          <span className="font-medium text-brand-success-ink">
            Your best quarter yet.
          </span>
        ) : delta != null && delta > 0 ? (
          <>
            Up {delta} on {termLabel(prev!.term)}.
          </>
        ) : score.best ? (
          <>
            Your best was {score.best.points} in {termLabel(score.best.term)}.
          </>
        ) : null}{" "}
        {score.allTime !== score.total && (
          <>{score.allTime} points all time.</>
        )}
      </p>
    </section>
  );
}
