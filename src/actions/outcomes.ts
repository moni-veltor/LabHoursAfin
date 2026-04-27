"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { initiatives } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

const OutcomeSchema = z.object({
  initiativeId: z.string().uuid(),
  body: z.string().max(8000).optional(),
  links: z.string().max(2000).optional(),
});

export async function postOutcome(formData: FormData) {
  const me = await requireUser();
  const parsed = OutcomeSchema.parse({
    initiativeId: formData.get("initiativeId"),
    body: (formData.get("body") as string) || undefined,
    links: (formData.get("links") as string) || undefined,
  });

  const [row] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, parsed.initiativeId));
  if (!row) throw new Error("NOT_FOUND");
  if (row.ownerId !== me.id && me.role !== "admin") throw new Error("FORBIDDEN");

  await db
    .update(initiatives)
    .set({
      outcomeBody: parsed.body ?? null,
      outcomeLinks: parsed.links ?? null,
      status: row.status === "open" || row.status === "in_progress" ? "done" : row.status,
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, parsed.initiativeId));

  revalidatePath(`/initiatives/${parsed.initiativeId}`);
  revalidatePath("/showcase");
}
