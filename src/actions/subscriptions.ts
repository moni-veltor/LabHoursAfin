"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { isTechTeam } from "@/lib/tech-team";
import { isAdmin } from "@/lib/admin";
import {
  checkParticipationRule,
  getParticipationStatus,
} from "@/lib/participation";
import { promoteFromWaitlist } from "@/actions/approvals";

function isExempt(u: { email: string; role: string }) {
  return (
    u.role === "tech" ||
    u.role === "admin" ||
    isTechTeam(u.email) ||
    isAdmin(u.email)
  );
}

export async function subscribe(
  initiativeId: string,
  role: "subscriber" | "participant" = "subscriber"
) {
  const me = await requireUser();

  if (role === "participant" && !isExempt(me)) {
    const status = await getParticipationStatus(me.id);
    const verdict = checkParticipationRule(status);
    if (!verdict.ok) {
      throw new Error(`PARTICIPATION_RULE: ${verdict.message}`);
    }
  }

  await db
    .insert(subscriptions)
    .values({ userId: me.id, initiativeId, role })
    .onConflictDoUpdate({
      target: [subscriptions.userId, subscriptions.initiativeId],
      set: { role, joinedAt: new Date() },
    });
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/me");
}

export async function unsubscribe(initiativeId: string) {
  const me = await requireUser();
  await db
    .delete(subscriptions)
    .where(
      and(eq(subscriptions.userId, me.id), eq(subscriptions.initiativeId, initiativeId))
    );
  await promoteFromWaitlist(initiativeId);
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/me");
}
