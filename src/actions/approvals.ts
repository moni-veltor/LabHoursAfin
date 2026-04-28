"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { initiatives, subscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { isTechTeam } from "@/lib/tech-team";
import { isAdmin } from "@/lib/admin";
import {
  checkParticipationRule,
  getParticipationStatus,
} from "@/lib/participation";
import { CATEGORIES, type Category } from "@/lib/categories";

function isExempt(u: { email: string; role: string }) {
  return (
    u.role === "tech" ||
    u.role === "admin" ||
    isTechTeam(u.email) ||
    isAdmin(u.email)
  );
}

export async function requestToJoin(initiativeId: string) {
  const me = await requireUser();
  const [initiative] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId));
  if (!initiative) throw new Error("NOT_FOUND");

  if (!isExempt(me)) {
    const status = await getParticipationStatus(me.id);
    const cat = initiative.category as Category;
    const verdict = checkParticipationRule(
      status,
      cat,
      CATEGORIES[cat]?.label ?? cat
    );
    if (!verdict.ok) {
      throw new Error(`PARTICIPATION_RULE: ${verdict.message}`);
    }
  }

  const targetRole = initiative.requiresApproval ? "pending" : "participant";

  await db
    .insert(subscriptions)
    .values({ userId: me.id, initiativeId, role: targetRole })
    .onConflictDoUpdate({
      target: [subscriptions.userId, subscriptions.initiativeId],
      set: { role: targetRole, joinedAt: new Date() },
    });
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/me");
}

export async function approveParticipant(initiativeId: string, userId: string) {
  const me = await requireUser();
  const [initiative] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId));
  if (!initiative) throw new Error("NOT_FOUND");
  if (initiative.ownerId !== me.id && me.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  await db
    .update(subscriptions)
    .set({ role: "participant" })
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.initiativeId, initiativeId),
        eq(subscriptions.role, "pending")
      )
    );
  revalidatePath(`/initiatives/${initiativeId}`);
}

export async function declineParticipant(initiativeId: string, userId: string) {
  const me = await requireUser();
  const [initiative] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId));
  if (!initiative) throw new Error("NOT_FOUND");
  if (initiative.ownerId !== me.id && me.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  await db
    .delete(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.initiativeId, initiativeId),
        eq(subscriptions.role, "pending")
      )
    );
  revalidatePath(`/initiatives/${initiativeId}`);
}
