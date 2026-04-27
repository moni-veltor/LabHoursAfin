"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { initiatives } from "@/db/schema";
import { requireTech } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function saveAsTemplate(initiativeId: string) {
  await requireTech();
  await db
    .update(initiatives)
    .set({ isTemplate: true, updatedAt: new Date() })
    .where(eq(initiatives.id, initiativeId));
  revalidatePath("/templates");
  revalidatePath(`/initiatives/${initiativeId}`);
}

export async function unsaveAsTemplate(initiativeId: string) {
  await requireTech();
  await db
    .update(initiatives)
    .set({ isTemplate: false, updatedAt: new Date() })
    .where(eq(initiatives.id, initiativeId));
  revalidatePath("/templates");
  revalidatePath(`/initiatives/${initiativeId}`);
}
