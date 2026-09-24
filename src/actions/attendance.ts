"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { attendance, initiatives, subscriptions, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { notify } from "@/lib/notifications-server";
import { RULES } from "@/lib/points";
import { ensureAttendance } from "@/lib/ensure-attendance";

/**
 * Taking the register.
 *
 * Only the person who ran the session, or an admin, can say who was there —
 * self-reported attendance is not attendance, and points that anyone can award
 * themselves are not worth having.
 */
async function guard(initiativeId: string) {
  if (!(await ensureAttendance())) throw new Error("ATTENDANCE_TABLE_MISSING");
  const me = await requireUser();
  const [init] = await db
    .select({ id: initiatives.id, ownerId: initiatives.ownerId, title: initiatives.title })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId));
  if (!init) throw new Error("NO_SUCH_INITIATIVE");
  if (init.ownerId !== me.id && !isAdmin(me)) throw new Error("NOT_YOURS");
  return { me, init };
}

export async function markPresent(
  initiativeId: string,
  userId: string,
  present: boolean
) {
  const { me, init } = await guard(initiativeId);

  const [existing] = await db
    .select({ present: attendance.present })
    .from(attendance)
    .where(
      and(
        eq(attendance.initiativeId, initiativeId),
        eq(attendance.userId, userId)
      )
    );

  if (existing) {
    await db
      .update(attendance)
      .set({ present, markedById: me.id, markedAt: new Date() })
      .where(
        and(
          eq(attendance.initiativeId, initiativeId),
          eq(attendance.userId, userId)
        )
      );
  } else {
    await db
      .insert(attendance)
      .values({ initiativeId, userId, present, markedById: me.id });
  }

  // Tell them the first time they are marked in, not on every correction.
  if (present && !existing?.present) {
    await notify({
      userId,
      kind: "attendance",
      message: `You were marked present at "${init.title}" — +${RULES.attended.points} points.`,
      url: "/leaderboard",
      initiativeId,
      sourceUserId: me.id,
    });
  }

  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/leaderboard");
  revalidatePath("/me");
}

/**
 * Everyone who signed up turned up — the common case, and the reason a register
 * gets taken at all rather than skipped.
 */
export async function markAllPresent(initiativeId: string) {
  const { me, init } = await guard(initiativeId);

  const signed = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.initiativeId, initiativeId),
        eq(subscriptions.role, "participant")
      )
    );
  const already = await db
    .select({ userId: attendance.userId })
    .from(attendance)
    .where(eq(attendance.initiativeId, initiativeId));
  const seen = new Set(already.map((a) => a.userId));

  const fresh = signed.filter((s) => !seen.has(s.userId));
  if (fresh.length > 0) {
    await db.insert(attendance).values(
      fresh.map((s) => ({
        initiativeId,
        userId: s.userId,
        present: true,
        markedById: me.id,
      }))
    );
    for (const s of fresh) {
      await notify({
        userId: s.userId,
        kind: "attendance",
        message: `You were marked present at "${init.title}" — +${RULES.attended.points} points.`,
        url: "/leaderboard",
        initiativeId,
        sourceUserId: me.id,
      });
    }
  }

  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/leaderboard");
  revalidatePath("/me");
}

/**
 * Somebody was in the room who never signed up.
 *
 * The common case this exists for: a colleague gets pulled in at the last
 * minute, or somebody wanders over because the topic caught their eye. They
 * were there for the hour, so they earn what anybody else in the hour earns.
 *
 * Deliberately does NOT create a subscription. They did not join the
 * initiative, they attended one session of it, and recording the second as
 * the first would quietly inflate the sign-up numbers the owner uses to plan
 * capacity — and would put them on the participant list for everything that
 * follows, which is not what anybody agreed to.
 */
export async function addAttendee(initiativeId: string, userId: string) {
  const { me, init } = await guard(initiativeId);

  const [person] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
  if (!person) throw new Error("NO_SUCH_PERSON");

  const [existing] = await db
    .select({ present: attendance.present })
    .from(attendance)
    .where(
      and(
        eq(attendance.initiativeId, initiativeId),
        eq(attendance.userId, userId)
      )
    );
  if (existing) {
    // Already on the register — treat this as marking them in.
    await markPresent(initiativeId, userId, true);
    return;
  }

  await db
    .insert(attendance)
    .values({ initiativeId, userId, present: true, markedById: me.id });

  await notify({
    userId,
    kind: "attendance",
    message: `You were marked present at "${init.title}" — +${RULES.attended.points} points.`,
    url: "/leaderboard",
    initiativeId,
    sourceUserId: me.id,
  });

  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/leaderboard");
  revalidatePath("/me");
}
