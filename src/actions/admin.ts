"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { initiatives } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function toggleFeatured(initiativeId: string) {
  await requireAdmin();
  const [row] = await db
    .select({ featured: initiatives.featured })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId));
  if (!row) throw new Error("NOT_FOUND");
  await db
    .update(initiatives)
    .set({ featured: !row.featured, updatedAt: new Date() })
    .where(eq(initiatives.id, initiativeId));
  revalidatePath("/");
  revalidatePath(`/initiatives/${initiativeId}`);
}
