import { db } from "@/lib/db";
import { attendance, initiatives, subscriptions } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { termKey, previousTermKey } from "@/lib/participation";
import { ensureAttendance } from "@/lib/ensure-attendance";

/**
 * How many quarters in a row you have actually shown up.
 *
 * This used to count `subscription.joined_at` — the moment you signed up. That
 * made the streak a measure of intent rather than attendance, and somebody who
 * booked eight sessions and went to none carried an eight-quarter streak.
 *
 * It now counts attendance. But it deliberately does NOT punish you for
 * somebody else's admin: if you joined a session and its owner never took the
 * register, that quarter still counts. Nobody should lose a streak because
 * their host forgot to tick a box. As registers become the norm — the
 * take-register nudge exists for exactly this — the fallback quietly stops
 * mattering, and the number means what it says.
 */
export async function computeStreak(userId: string) {
  await ensureAttendance();

  const [joined, present, registers] = await Promise.all([
    // Sessions you were part of, and when they ran.
    db
      .select({
        initiativeId: subscriptions.initiativeId,
        joinedAt: subscriptions.joinedAt,
        startsAt: initiatives.startsAt,
      })
      .from(subscriptions)
      .innerJoin(initiatives, eq(initiatives.id, subscriptions.initiativeId))
      .where(
        and(
          eq(subscriptions.userId, userId),
          or(
            eq(subscriptions.role, "participant"),
            eq(subscriptions.role, "owner")
          )
        )
      ),
    // Sessions you were marked present at.
    db
      .select({ initiativeId: attendance.initiativeId })
      .from(attendance)
      .where(and(eq(attendance.userId, userId), eq(attendance.present, true))),
    // Every session that has a register at all, so we can tell "you did not
    // come" apart from "nobody checked".
    db.selectDistinct({ initiativeId: attendance.initiativeId }).from(attendance),
  ]);

  const wasThere = new Set(present.map((p) => p.initiativeId));
  const checked = new Set(registers.map((r) => r.initiativeId));

  const terms = new Set<string>();
  for (const j of joined) {
    const counts = wasThere.has(j.initiativeId) || !checked.has(j.initiativeId);
    if (!counts) continue;
    terms.add(termKey(new Date(j.startsAt ?? j.joinedAt)));
  }

  let streak = 0;
  let cursor = termKey(new Date());
  while (terms.has(cursor)) {
    streak++;
    cursor = previousTermKey(cursor);
  }
  return streak;
}
