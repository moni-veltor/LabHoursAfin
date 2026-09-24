import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  RULES,
  type PointKind,
  currentTerm,
  leaderboard,
} from "@/lib/points";
import { termLabel, previousTermKey } from "@/lib/participation";

export const metadata = { title: "Leaderboard — Lab Hours" };

const ORDER: PointKind[] = ["attended", "ran", "outcome", "lessons", "demo", "award"];

/** Only the top three get a mark. Any more and it stops meaning anything. */
const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string }>;
}) {
  const { term: raw } = await searchParams;
  const now = currentTerm();
  const term = raw === "all" ? undefined : raw ?? now;

  const [board, session] = await Promise.all([leaderboard(term), auth()]);
  const meId = session?.user?.id;
  const mine = board.findIndex((r) => r.userId === meId);

  const tabs = [
    { key: now, label: termLabel(now) },
    { key: previousTermKey(now), label: termLabel(previousTermKey(now)) },
    { key: "all", label: "All time" },
  ];
  const active = raw === "all" ? "all" : raw ?? now;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Points come from turning up and from what you put back — not from
          signing up. A session only scores once its owner has taken the
          register.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === now ? "/leaderboard" : `/leaderboard?term=${t.key}`}
            className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition ${
              active === t.key
                ? "border-brand-primary/40 bg-brand-primary-tint text-brand-primary-ink"
                : "border-line bg-raised text-muted hover:border-line-strong"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {board.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
          <p className="text-muted">
            No points this quarter yet.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-dim">
            Points appear as soon as an owner takes the register on a session
            that has run. If you ran one, open it and mark who turned up.
          </p>
        </div>
      ) : (
        <ol className="space-y-1.5">
          {board.map((r, i) => {
            const isMe = r.userId === meId;
            return (
              <li
                key={r.userId}
                className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-3 ${
                  isMe
                    ? "border-brand-primary/40 bg-brand-primary-tint"
                    : "border-line bg-surface shadow-card"
                }`}
              >
                <span className="w-8 shrink-0 font-mono text-sm tabular-nums text-dim">
                  {MEDALS[i] ?? i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {r.name ?? r.email}
                    {isMe && (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-brand-primary-ink">
                        you
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-1.5">
                    {ORDER.filter((k) => r.byKind[k] > 0).map((k) => (
                      <span
                        key={k}
                        title={RULES[k].why}
                        className="rounded-full bg-raised px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted"
                      >
                        {RULES[k].label} {r.byKind[k] / RULES[k].points}×
                      </span>
                    ))}
                  </span>
                </span>
                <span className="font-display text-xl font-bold tabular-nums">
                  {r.total}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {meId && mine === -1 && board.length > 0 && (
        <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-3 text-sm text-muted">
          You are not on this board yet. Attend a session — or run one — and you
          will be.
        </p>
      )}

      <section className="rounded-xl border border-line bg-surface p-4 shadow-card">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          How points work
        </h2>
        <ul className="mt-2 divide-y divide-line text-sm">
          {ORDER.map((k) => (
            <li key={k} className="flex flex-wrap items-baseline gap-x-3 py-2">
              <span className="w-12 shrink-0 font-mono text-sm tabular-nums text-brand-primary-ink">
                +{RULES[k].points}
              </span>
              <span className="font-medium">{RULES[k].label}</span>
              <span className="w-full text-xs text-muted sm:w-auto sm:flex-1">
                {RULES[k].why}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
