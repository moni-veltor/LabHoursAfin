import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  RULES,
  type PointKind,
  type Ranked,
  boardWithMovement,
  currentTerm,
  recentAwards,
  teamBoard,
} from "@/lib/points";
import { termLabel, previousTermKey } from "@/lib/participation";
import { CountUp } from "@/components/count-up";
import { LiveRefresh } from "@/components/live-refresh";

export const metadata = { title: "Leaderboard — Lab Hours" };

const ORDER: PointKind[] = ["attended", "ran", "outcome", "lessons", "demo", "award"];
/**
 * A medal as a struck disc — a radial highlight where the light lands, a
 * rim, and a contact shadow. Emoji were doing this job and rendered as three
 * different designs across three platforms.
 */
function Medal({ place, size = 34 }: { place: number; size?: number }) {
  if (place > 3)
    return (
      <span className="w-8 shrink-0 text-center font-mono text-sm tabular-nums text-dim">
        {place}
      </span>
    );
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

/** How long ago, in the fewest characters that still say it. */
function ago(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** ▲2 / ▼1 / new — the reason to look twice. */
function Movement({ row }: { row: Ranked }) {
  if (row.isNew)
    return (
      <span className="rounded-full bg-brand-accent-tint px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-accent-ink">
        new
      </span>
    );
  if (row.moved == null || row.moved === 0) return null;
  const up = row.moved > 0;
  return (
    <span
      title={`Was #${row.was} last quarter`}
      className={`font-mono text-[10px] tabular-nums ${
        up ? "text-brand-success-ink" : "text-dim"
      }`}
    >
      {up ? "▲" : "▼"}
      {Math.abs(row.moved)}
    </span>
  );
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string; view?: string }>;
}) {
  const { term: raw, view } = await searchParams;
  const teams = view === "teams";
  const now = currentTerm();
  const term = raw === "all" ? undefined : raw ?? now;

  const [board, byTeam, pulse, session] = await Promise.all([
    boardWithMovement(term),
    teamBoard(term),
    recentAwards(6),
    auth(),
  ]);
  const meId = session?.user?.id;
  const mine = board.find((r) => r.userId === meId) ?? null;
  const top = board[0]?.total ?? 1;

  const tabs = [
    { key: now, label: termLabel(now) },
    { key: previousTermKey(now), label: termLabel(previousTermKey(now)) },
    { key: "all", label: "All time" },
  ];
  const active = raw === "all" ? "all" : raw ?? now;
  const podium = teams ? [] : board.slice(0, 3);
  const rest = teams ? [] : board.slice(3);

  return (
    <div className="space-y-6">
      <LiveRefresh />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Points come from turning up and from what you put back — not from
          signing up. A session only scores once its owner has taken the
          register.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/leaderboard?term=${t.key}${teams ? "&view=teams" : ""}`}
            className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition ${
              active === t.key
                ? "border-brand-primary/40 bg-brand-primary-tint text-brand-primary-ink"
                : "border-line bg-raised text-muted hover:border-line-strong"
            }`}
          >
            {t.label}
          </Link>
        ))}
        <span className="ml-auto flex gap-1.5">
          {[
            { key: "people", label: "People" },
            { key: "teams", label: "Teams" },
          ].map((v) => (
            <Link
              key={v.key}
              href={`/leaderboard?term=${active}${v.key === "teams" ? "&view=teams" : ""}`}
              className={`rounded-md border px-3 py-1.5 text-sm transition ${
                (v.key === "teams") === teams
                  ? "border-line-strong bg-surface font-medium shadow-card"
                  : "border-transparent text-muted hover:text-ink-text"
              }`}
            >
              {v.label}
            </Link>
          ))}
        </span>
      </div>

      {teams ? (
        byTeam.length === 0 ? (
          <Empty>
            No teams on the board yet. A person counts toward a team once their
            department is set on their profile.
          </Empty>
        ) : (
          <>
            <ol className="space-y-1.5">
              {byTeam.map((t, i) => (
                <li
                  key={t.team}
                  className="lb-row flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surface px-4 py-3 shadow-card"
                  style={{ animationDelay: `${i * 55}ms` }}
                >
                  <Medal place={i + 1} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{t.team}</span>
                    <span className="text-xs text-muted">
                      {t.people} scoring · {t.total} between them · {t.top} leading
                    </span>
                    <span className="bar-track mt-2 block h-2 w-full overflow-hidden bg-raised">
                      <span
                        className="lb-bar bar3d block h-full bg-brand-primary-glow"
                        style={{
                          width: `${Math.max(6, (t.each / (byTeam[0]?.each || 1)) * 100)}%`,
                          animationDelay: `${i * 55 + 120}ms`,
                        }}
                      />
                    </span>
                  </span>
                  <span className="text-right">
                    <CountUp
                      value={t.each}
                      delay={i * 55}
                      className="block font-display text-xl font-bold tabular-nums"
                    />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
                      each
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-dim">
              Ranked on points per person, not total — otherwise the largest
              department wins every quarter by existing.
            </p>
          </>
        )
      ) : board.length === 0 ? (
        <Empty>
          No points this quarter yet. Points appear as soon as an owner takes
          the register on a session that has run.
        </Empty>
      ) : (
        <>
          {/* The podium. Heights are the actual scores, so second place looks
              close when it is close and distant when it is not. */}
          {podium.length >= 2 && (
            <ol className="flex items-end justify-center gap-2 sm:gap-4">
              {[1, 0, 2].map((slot, i) => {
                const r = podium[slot];
                if (!r) return null;
                const h = Math.max(46, Math.round((r.total / top) * 128));
                const gold = slot === 0;
                return (
                  <li
                    key={r.userId}
                    className="lb-row flex w-full max-w-[10rem] flex-col items-center"
                    style={{ animationDelay: `${i * 110}ms` }}
                  >
                    <Medal place={slot + 1} size={gold ? 44 : 36} />
                    <span className="mt-1 w-full truncate text-center text-sm font-medium">
                      {r.userId === meId ? "You" : r.name ?? r.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <CountUp
                        value={r.total}
                        delay={i * 110}
                        className="font-display text-2xl font-bold tabular-nums"
                      />
                      <Movement row={r} />
                    </span>
                    <span
                      className={`lb-podium pod mt-2 w-full ${
                        gold ? "pod-gold" : r.userId === meId ? "pod-mine" : "pod-plain"
                      }`}
                      style={{ height: `${h}px`, animationDelay: `${i * 110 + 90}ms` }}
                    />
                  </li>
                );
              })}
            </ol>
          )}

          <ol className="space-y-1.5">
            {(podium.length >= 2 ? rest : board).map((r, i) => {
              const isMe = r.userId === meId;
              return (
                <li
                  key={r.userId}
                  className={`lb-row flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-3 ${
                    isMe
                      ? "border-brand-primary/40 bg-brand-primary-tint"
                      : "border-line bg-surface shadow-card"
                  }`}
                  style={{ animationDelay: `${300 + i * 45}ms` }}
                >
                  <Medal place={r.place} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 truncate font-medium">
                        {r.name ?? r.email}
                        {isMe && (
                          <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-brand-primary-ink">
                            you
                          </span>
                        )}
                      </span>
                      <Movement row={r} />
                    </span>
                    <span className="bar-track mt-2 block h-2 w-full overflow-hidden bg-raised">
                      <span
                        className="lb-bar bar3d block h-full bg-brand-primary-glow"
                        style={{
                          width: `${Math.max(4, (r.total / top) * 100)}%`,
                          animationDelay: `${360 + i * 45}ms`,
                        }}
                      />
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
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
                  <CountUp
                    value={r.total}
                    delay={300 + i * 45}
                    className="font-display text-xl font-bold tabular-nums"
                  />
                </li>
              );
            })}
          </ol>
        </>
      )}

      {!teams && meId && !mine && board.length > 0 && (
        <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-3 text-sm text-muted">
          You are not on this board yet. Attend a session — or run one — and you
          will be.
        </p>
      )}

      {pulse.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-4 shadow-card">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
            <span className="lh-live relative inline-block h-1.5 w-1.5 rounded-full bg-brand-success" />
            Just earned
          </h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {pulse.map((a, i) => (
              <li
                key={`${a.who}-${a.title}-${i}`}
                className="lb-row flex flex-wrap items-baseline gap-x-2 py-1.5"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="font-medium">{a.who}</span>
                <span className="text-muted">{RULES[a.kind].label.toLowerCase()}</span>
                <span className="min-w-0 flex-1 truncate text-muted">
                  — {a.title}
                </span>
                <span className="font-mono text-[10px] tabular-nums text-brand-success-ink">
                  +{RULES[a.kind].points}
                </span>
                <span className="font-mono text-[10px] text-dim">{ago(a.at)}</span>
              </li>
            ))}
          </ul>
        </section>
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

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
      <p className="mx-auto max-w-md text-muted">{children}</p>
    </div>
  );
}
