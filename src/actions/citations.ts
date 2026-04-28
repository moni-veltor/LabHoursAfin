"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { initiativeCitations, initiatives } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

const Schema = z.object({
  initiativeId: z.string().uuid(),
  citesId: z.string().uuid(),
  note: z.string().max(280).optional(),
});

export async function addCitation(formData: FormData) {
  const me = await requireUser();
  const parsed = Schema.parse({
    initiativeId: formData.get("initiativeId"),
    citesId: formData.get("citesId"),
    note: (formData.get("note") as string) || undefined,
  });
  const [target] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, parsed.initiativeId));
  if (!target) throw new Error("NOT_FOUND");
  if (target.ownerId !== me.id && me.role !== "admin") throw new Error("FORBIDDEN");
  if (parsed.initiativeId === parsed.citesId) throw new Error("SELF_CITE");
  await db
    .insert(initiativeCitations)
    .values({
      initiativeId: parsed.initiativeId,
      citesId: parsed.citesId,
      note: parsed.note,
    })
    .onConflictDoNothing();
  revalidatePath(`/initiatives/${parsed.initiativeId}`);
}

export async function removeCitation(initiativeId: string, citesId: string) {
  const me = await requireUser();
  const [target] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId));
  if (!target) throw new Error("NOT_FOUND");
  if (target.ownerId !== me.id && me.role !== "admin") throw new Error("FORBIDDEN");
  await db
    .delete(initiativeCitations)
    .where(
      and(
        eq(initiativeCitations.initiativeId, initiativeId),
        eq(initiativeCitations.citesId, citesId)
      )
    );
  revalidatePath(`/initiatives/${initiativeId}`);
}
