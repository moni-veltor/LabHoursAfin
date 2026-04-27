"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

export async function subscribe(initiativeId: string, role: "subscriber" | "participant" = "subscriber") {
  const me = await requireUser();
  await db
    .insert(subscriptions)
    .values({ userId: me.id, initiativeId, role })
    .onConflictDoUpdate({
      target: [subscriptions.userId, subscriptions.initiativeId],
      set: { role },
    });
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/me");
}

export async function unsubscribe(initiativeId: string) {
  const me = await requireUser();
  await db
    .delete(subscriptions)
    .where(
      and(eq(subscriptions.userId, me.id), eq(subscriptions.initiativeId, initiativeId))
    );
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/me");
}
