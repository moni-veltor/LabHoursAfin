"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { initiatives, subscriptions, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq, asc, count } from "drizzle-orm";
import { isTechTeam } from "@/lib/tech-team";
import { isAdmin } from "@/lib/admin";
import {
  checkParticipationRule,
  getParticipationStatus,
} from "@/lib/participation";
import { CATEGORIES, type Category } from "@/lib/categories";
import { getCategoryMap, categoryKeyOf } from "@/lib/categories-server";
import { notify } from "@/lib/notifications-server";
import { logAudit } from "@/lib/audit";

function isExempt(u: { email: string; role: string }) {
  return (
    u.role === "tech" ||
    u.role === "admin" ||
    isTechTeam(u.email) ||
    isAdmin(u.email)
  );
}

export async function requestToJoin(initiativeId: string, note?: string) {
  const me = await requireUser();
  const [initiative] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId));
  if (!initiative) throw new Error("NOT_FOUND");

  if (!isExempt(me)) {
    const catKey = categoryKeyOf(initiative);
    const map = await getCategoryMap();
    const status = await getParticipationStatus(me.id);
    const verdict = checkParticipationRule(
      status,
      catKey,
      map.get(catKey)?.label ?? catKey
    );
    if (!verdict.ok) {
      throw new Error(`PARTICIPATION_RULE: ${verdict.message}`);
    }
  }

  // Capacity check: if full and approval required, queue as pending; if no approval and not full → participant
  const participantCount = await db
    .select({ c: count() })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.initiativeId, initiativeId),
        eq(subscriptions.role, "participant")
      )
    );
  const filled = Number(participantCount[0]?.c ?? 0);
  const capacityFull =
    initiative.capacity != null && filled >= initiative.capacity;

  let targetRole: "pending" | "participant";
  if (initiative.requiresApproval || capacityFull) targetRole = "pending";
  else targetRole = "participant";

  await db
    .insert(subscriptions)
    .values({
      userId: me.id,
      initiativeId,
      role: targetRole,
      applicationNote: note?.slice(0, 280),
    })
    .onConflictDoUpdate({
      target: [subscriptions.userId, subscriptions.initiativeId],
      set: {
        role: targetRole,
        joinedAt: new Date(),
        applicationNote: note?.slice(0, 280),
        declineReason: null,
      },
    });

  if (targetRole === "pending") {
    await notify({
      userId: initiative.ownerId,
      kind: "application",
      message: `${me.name ?? me.email} applied to "${initiative.title}"`,
      url: `/initiatives/${initiative.id}`,
      initiativeId: initiative.id,
      sourceUserId: me.id,
    });
  }

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
    .set({ role: "participant", declineReason: null })
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.initiativeId, initiativeId),
        eq(subscriptions.role, "pending")
      )
    );
  await notify({
    userId,
    kind: "approved",
    message: `Your application to "${initiative.title}" was approved`,
    url: `/initiatives/${initiative.id}`,
    initiativeId: initiative.id,
    sourceUserId: me.id,
  });
  await logAudit(me.id, "application.approve", {
    type: "subscription",
    id: `${initiativeId}:${userId}`,
  });
  revalidatePath(`/initiatives/${initiativeId}`);
}

export async function declineParticipant(formData: FormData) {
  const me = await requireUser();
  const initiativeId = String(formData.get("initiativeId"));
  const userId = String(formData.get("userId"));
  const reason = String(formData.get("reason") ?? "").slice(0, 280) || null;
  const [initiative] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId));
  if (!initiative) throw new Error("NOT_FOUND");
  if (initiative.ownerId !== me.id && me.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  if (reason) {
    await db
      .update(subscriptions)
      .set({ role: "subscriber", declineReason: reason })
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.initiativeId, initiativeId),
          eq(subscriptions.role, "pending")
        )
      );
  } else {
    await db
      .delete(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.initiativeId, initiativeId),
          eq(subscriptions.role, "pending")
        )
      );
  }
  await notify({
    userId,
    kind: "declined",
    message: reason
      ? `Your application to "${initiative.title}" was declined: ${reason}`
      : `Your application to "${initiative.title}" was declined`,
    url: `/initiatives/${initiative.id}`,
    initiativeId: initiative.id,
    sourceUserId: me.id,
  });
  await logAudit(me.id, "application.decline", {
    type: "subscription",
    id: `${initiativeId}:${userId}`,
  });
  revalidatePath(`/initiatives/${initiativeId}`);
}

export async function promoteFromWaitlist(initiativeId: string) {
  const [initiative] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId));
  if (!initiative || initiative.capacity == null) return;
  if (initiative.requiresApproval) return;
  const filled = await db
    .select({ c: count() })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.initiativeId, initiativeId),
        eq(subscriptions.role, "participant")
      )
    );
  if (Number(filled[0]?.c ?? 0) >= initiative.capacity) return;
  const [next] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.initiativeId, initiativeId),
        eq(subscriptions.role, "pending")
      )
    )
    .orderBy(asc(subscriptions.joinedAt))
    .limit(1);
  if (!next) return;
  await db
    .update(subscriptions)
    .set({ role: "participant" })
    .where(
      and(
        eq(subscriptions.userId, next.userId),
        eq(subscriptions.initiativeId, initiativeId)
      )
    );
  await notify({
    userId: next.userId,
    kind: "promoted",
    message: `A spot opened in "${initiative.title}" — you're in.`,
    url: `/initiatives/${initiative.id}`,
    initiativeId: initiative.id,
  });
}
