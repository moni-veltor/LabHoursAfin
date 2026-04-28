"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { comments, initiatives } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

async function ensureOwnerOrAdmin(initiativeId: string) {
  const me = await requireUser();
  const [i] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId));
  if (!i) throw new Error("NOT_FOUND");
  const allowed = i.ownerId === me.id || me.role === "admin" || isAdmin(me.email);
  if (!allowed) throw new Error("FORBIDDEN");
  return { me, initiative: i };
}

export async function pinComment(initiativeId: string, commentId: string) {
  const { me } = await ensureOwnerOrAdmin(initiativeId);
  await db
    .update(initiatives)
    .set({ pinnedCommentId: commentId, updatedAt: new Date() })
    .where(eq(initiatives.id, initiativeId));
  await logAudit(me.id, "comment.pin", {
    type: "comment",
    id: commentId,
  });
  revalidatePath(`/initiatives/${initiativeId}`);
}

export async function unpinComment(initiativeId: string) {
  const { me } = await ensureOwnerOrAdmin(initiativeId);
  await db
    .update(initiatives)
    .set({ pinnedCommentId: null, updatedAt: new Date() })
    .where(eq(initiatives.id, initiativeId));
  await logAudit(me.id, "comment.unpin", { type: "initiative", id: initiativeId });
  revalidatePath(`/initiatives/${initiativeId}`);
}

export async function toggleCommentsLock(initiativeId: string) {
  const { me, initiative } = await ensureOwnerOrAdmin(initiativeId);
  await db
    .update(initiatives)
    .set({ commentsLocked: !initiative.commentsLocked, updatedAt: new Date() })
    .where(eq(initiatives.id, initiativeId));
  await logAudit(me.id, "comments.toggle_lock", {
    type: "initiative",
    id: initiativeId,
  });
  revalidatePath(`/initiatives/${initiativeId}`);
}
