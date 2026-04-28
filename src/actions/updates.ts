"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { initiatives, subscriptions, updates, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, ne } from "drizzle-orm";
import { notify } from "@/lib/notifications-server";

const UpdateSchema = z.object({
  initiativeId: z.string().uuid(),
  body: z.string().min(1).max(8000),
});

export async function postUpdate(formData: FormData) {
  const me = await requireUser();
  const parsed = UpdateSchema.parse({
    initiativeId: formData.get("initiativeId"),
    body: formData.get("body"),
  });

  const [initiative] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, parsed.initiativeId));
  if (!initiative) throw new Error("NOT_FOUND");
  if (initiative.ownerId !== me.id && me.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  await db.insert(updates).values({
    initiativeId: parsed.initiativeId,
    authorId: me.id,
    body: parsed.body,
  });

  const subs = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(
      eq(subscriptions.initiativeId, parsed.initiativeId)
    );
  for (const s of subs) {
    if (s.userId === me.id) continue;
    await notify({
      userId: s.userId,
      kind: "update",
      message: `New update on "${initiative.title}"`,
      url: `/initiatives/${initiative.id}`,
      initiativeId: initiative.id,
      sourceUserId: me.id,
    });
  }

  revalidatePath(`/initiatives/${parsed.initiativeId}`);
}
