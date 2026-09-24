import { addAttendee, markAllPresent, markPresent } from "@/actions/attendance";
import { RULES, type RegisterEntry } from "@/lib/points";

/**
 * The register, as the owner sees it after their session.
 *
 * Deliberately the least ceremonious thing on the page: a row per person and
 * one button that covers the common case, because a register that takes more
 * than a few seconds does not get taken, and points nobody awards are points
 * nobody earns.
 *
 * The list is who was in the room, not who booked — so it carries walk-ins
 * too, and the owner can add anybody.
 */
export function AttendanceRegister({
  initiativeId,
  roster,
  candidates,
  startsAt,
}: {
  initiativeId: string;
  roster: RegisterEntry[];
  /** People not yet on the register, for the add box. */
  candidates: { id: string; name: string | null; email: string }[];
  startsAt: Date | null;
}) {
  const notYet = startsAt != null && startsAt.getTime() > Date.now();
  const presentCount = roster.filter((p) => p.present === true).length;
  const unmarked = roster.filter((p) => p.signedUp && p.present === null);

  if (roster.length === 0 && candidates.length === 0) return null;

  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          Register
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-wider text-dim">
          {presentCount} here
          {presentCount > 0 &&
            ` · +${presentCount * RULES.attended.points} pts awarded`}
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
        {roster.map((p) => (
          <li
            key={p.userId}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm">
              {p.name ?? p.email}
              {!p.signedUp && (
                <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-dim">
                  walk-in
                </span>
              )}
            </span>
            {p.present === true && (
              <span className="rounded-full bg-brand-success-tint px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-success-ink">
                here · +{RULES.attended.points}
              </span>
            )}
            {p.present === false && (
              <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-dim">
                did not come
              </span>
            )}
            {!notYet && (
              <span className="flex gap-1">
                {p.present !== true && (
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
                {p.present !== false && (
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
        ))}
      </ul>

      {!notYet && candidates.length > 0 && (
        <form
          className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3"
          action={async (formData: FormData) => {
            "use server";
            const userId = String(formData.get("userId") ?? "");
            if (userId) await addAttendee(initiativeId, userId);
          }}
        >
          <label
            htmlFor="add-attendee"
            className="font-mono text-[10px] uppercase tracking-wider text-dim"
          >
            Came but never signed up
          </label>
          <select
            id="add-attendee"
            name="userId"
            required
            defaultValue=""
            className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1.5 text-sm"
          >
            <option value="" disabled>
              Choose someone…
            </option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.email}
              </option>
            ))}
          </select>
          <button className="rounded-md border border-line bg-raised px-3 py-1.5 text-sm hover:border-line-strong">
            Add as present
          </button>
        </form>
      )}
    </section>
  );
}
