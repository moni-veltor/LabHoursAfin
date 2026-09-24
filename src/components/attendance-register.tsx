import { markAllPresent, markPresent } from "@/actions/attendance";
import { RULES } from "@/lib/points";

type Person = { userId: string; name: string | null; email: string | null };

/**
 * The register, as the owner sees it after their session.
 *
 * Deliberately the least ceremonious thing on the page: a row per person and
 * one button that covers the common case, because a register that takes more
 * than a few seconds does not get taken, and points nobody awards are points
 * nobody earns.
 */
export function AttendanceRegister({
  initiativeId,
  people,
  marked,
  startsAt,
}: {
  initiativeId: string;
  people: Person[];
  /** userId → present. Absent from the map means "not yet marked". */
  marked: Map<string, boolean>;
  startsAt: Date | null;
}) {
  const notYet = startsAt != null && startsAt.getTime() > Date.now();
  const presentCount = people.filter((p) => marked.get(p.userId) === true).length;
  const unmarked = people.filter((p) => !marked.has(p.userId));

  if (people.length === 0) return null;

  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          Register
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-wider text-dim">
          {presentCount} of {people.length} here
          {presentCount > 0 && ` · +${presentCount * RULES.attended.points} pts awarded`}
        </p>
      </div>

      <p className="mt-1 text-xs text-muted">
        {notYet
          ? "You can take this once the session has run. Everyone you mark present earns points."
          : `Everyone you mark present earns ${RULES.attended.points} points, and you earn ${RULES.ran.points} for running it.`}
      </p>

      {!notYet && unmarked.length > 0 && (
        <form
          className="mt-3"
          action={async () => {
            "use server";
            await markAllPresent(initiativeId);
          }}
        >
          <button className="rounded-md bg-brand-success px-3 py-1.5 text-sm font-medium text-ink-text hover:bg-brand-success-dark">
            Everyone turned up ({unmarked.length} to mark)
          </button>
        </form>
      )}

      <ul className="mt-3 divide-y divide-line">
        {people.map((p) => {
          const state = marked.get(p.userId);
          return (
            <li
              key={p.userId}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                {p.name ?? p.email}
              </span>
              {state === true && (
                <span className="rounded-full bg-brand-success-tint px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-success-ink">
                  here · +{RULES.attended.points}
                </span>
              )}
              {state === false && (
                <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-dim">
                  did not come
                </span>
              )}
              {!notYet && (
                <span className="flex gap-1">
                  {state !== true && (
                    <form
                      action={async () => {
                        "use server";
                        await markPresent(initiativeId, p.userId, true);
                      }}
                    >
                      <button className="rounded-md border border-brand-success/40 bg-brand-success-tint px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-brand-success-ink hover:bg-brand-success-tint-strong">
                        here
                      </button>
                    </form>
                  )}
                  {state !== false && (
                    <form
                      action={async () => {
                        "use server";
                        await markPresent(initiativeId, p.userId, false);
                      }}
                    >
                      <button className="rounded-md border border-line bg-raised px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-dim hover:border-line-strong">
                        no
                      </button>
                    </form>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
