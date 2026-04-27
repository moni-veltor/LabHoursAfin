"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { comments } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const CommentSchema = z.object({
  initiativeId: z.string().uuid(),
  body: z.string().min(1).max(4000),
  parentId: z.string().uuid().optional(),
});

export async function addComment(formData: FormData) {
  const me = await requireUser();
  const parsed = CommentSchema.parse({
    initiativeId: formData.get("initiativeId"),
    body: formData.get("body"),
    parentId: formData.get("parentId") || undefined,
  });
  await db.insert(comments).values({
    initiativeId: parsed.initiativeId,
    authorId: me.id,
    body: parsed.body,
    parentId: parsed.parentId,
  });
  revalidatePath(`/initiatives/${parsed.initiativeId}`);
}
