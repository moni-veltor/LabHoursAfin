"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { initiatives, subscriptions, updates, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, inArray, ne } from "drizzle-orm";
import { notifyUpdate } from "@/lib/email";

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
    .where(eq(subscriptions.initiativeId, parsed.initiativeId));
  const subUserIds = subs.map((s) => s.userId).filter((id) => id !== me.id);
  if (subUserIds.length > 0) {
    const recipients = await db
      .select({ email: users.email })
      .from(users)
      .where(inArray(users.id, subUserIds));
    await notifyUpdate(
      recipients.map((r) => r.email),
      { id: initiative.id, title: initiative.title },
      { body: parsed.body, authorName: me.name ?? me.email },
      process.env.AUTH_URL ?? "http://localhost:3000"
    );
  }

  revalidatePath(`/initiatives/${parsed.initiativeId}`);
}
