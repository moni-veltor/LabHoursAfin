"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq, isNull } from "drizzle-orm";

export async function markNotificationRead(id: string) {
  const me = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, me.id)));
  revalidatePath("/inbox");
}

export async function markAllNotificationsRead() {
  const me = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, me.id), isNull(notifications.readAt)));
  revalidatePath("/inbox");
}
