"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { interests } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

export async function toggleInterest(initiativeId: string) {
  const me = await requireUser();
  const existing = await db
    .select()
    .from(interests)
    .where(
      and(eq(interests.userId, me.id), eq(interests.initiativeId, initiativeId))
    );
  if (existing.length > 0) {
    await db
      .delete(interests)
      .where(
        and(eq(interests.userId, me.id), eq(interests.initiativeId, initiativeId))
      );
  } else {
    await db
      .insert(interests)
      .values({ userId: me.id, initiativeId })
      .onConflictDoNothing();
  }
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/me");
}
