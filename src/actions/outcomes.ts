"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { initiatives, subscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { notify } from "@/lib/notifications-server";

const OutcomeSchema = z.object({
  initiativeId: z.string().uuid(),
  body: z.string().max(8000).optional(),
  links: z.string().max(2000).optional(),
  lessonsLearned: z.string().max(4000).optional(),
});

export async function postOutcome(formData: FormData) {
  const me = await requireUser();
  const parsed = OutcomeSchema.parse({
    initiativeId: formData.get("initiativeId"),
    body: (formData.get("body") as string) || undefined,
    links: (formData.get("links") as string) || undefined,
    lessonsLearned:
      (formData.get("lessonsLearned") as string) || undefined,
  });

  const [row] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, parsed.initiativeId));
  if (!row) throw new Error("NOT_FOUND");
  if (row.ownerId !== me.id && me.role !== "admin") throw new Error("FORBIDDEN");

  const newlyDone =
    row.status !== "done" &&
    (row.status === "open" || row.status === "in_progress");

  await db
    .update(initiatives)
    .set({
      outcomeBody: parsed.body ?? null,
      outcomeLinks: parsed.links ?? null,
      lessonsLearned: parsed.lessonsLearned ?? null,
      status: newlyDone ? "done" : row.status,
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, parsed.initiativeId));

  if (newlyDone) {
    const subs = await db
      .select({ userId: subscriptions.userId })
      .from(subscriptions)
      .where(eq(subscriptions.initiativeId, parsed.initiativeId));
    for (const s of subs) {
      if (s.userId === me.id) continue;
      await notify({
        userId: s.userId,
        kind: "outcome",
        message: `"${row.title}" wrapped — outcome posted`,
        url: `/initiatives/${row.id}`,
        initiativeId: row.id,
        sourceUserId: me.id,
      });
    }
  }

  revalidatePath(`/initiatives/${parsed.initiativeId}`);
  revalidatePath("/showcase");
}
