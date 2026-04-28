"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { comments, initiatives, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import {
  findUserIdsForMentions,
  notify,
} from "@/lib/notifications-server";
import { rateLimit } from "@/lib/rate-limit";

const CommentSchema = z.object({
  initiativeId: z.string().uuid(),
  body: z.string().min(1).max(4000),
  parentId: z.string().uuid().optional(),
});

export async function addComment(formData: FormData) {
  const me = await requireUser();
  const rl = rateLimit(`comment:${me.id}`, 30, 60_000);
  if (!rl.ok) throw new Error("RATE_LIMITED");
  const parsed = CommentSchema.parse({
    initiativeId: formData.get("initiativeId"),
    body: formData.get("body"),
    parentId: (formData.get("parentId") as string) || undefined,
  });
  const [target] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, parsed.initiativeId));
  if (!target) throw new Error("NOT_FOUND");
  if (target.commentsLocked && target.ownerId !== me.id && me.role !== "admin") {
    throw new Error("COMMENTS_LOCKED");
  }
  const [created] = await db
    .insert(comments)
    .values({
      initiativeId: parsed.initiativeId,
      authorId: me.id,
      body: parsed.body,
      parentId: parsed.parentId,
    })
    .returning();

  const [initiative] = await db
    .select({ id: initiatives.id, title: initiatives.title })
    .from(initiatives)
    .where(eq(initiatives.id, parsed.initiativeId));

  if (parsed.parentId) {
    const [parent] = await db
      .select({ authorId: comments.authorId })
      .from(comments)
      .where(eq(comments.id, parsed.parentId));
    if (parent && parent.authorId && parent.authorId !== me.id) {
      await notify({
        userId: parent.authorId,
        kind: "reply",
        message: `${me.name ?? me.email} replied to you on "${initiative?.title ?? "an initiative"}"`,
        url: `/initiatives/${parsed.initiativeId}`,
        initiativeId: parsed.initiativeId,
        sourceUserId: me.id,
      });
    }
  }

  const mentioned = await findUserIdsForMentions(parsed.body);
  for (const u of mentioned) {
    if (u.id === me.id) continue;
    await notify({
      userId: u.id,
      kind: "mention",
      message: `${me.name ?? me.email} mentioned you on "${initiative?.title ?? "an initiative"}"`,
      url: `/initiatives/${parsed.initiativeId}`,
      initiativeId: parsed.initiativeId,
      sourceUserId: me.id,
    });
  }

  revalidatePath(`/initiatives/${parsed.initiativeId}`);
}
