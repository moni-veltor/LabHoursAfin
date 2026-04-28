"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { setSetting } from "@/lib/settings-server";
import { logAudit } from "@/lib/audit";

export async function setPrePublishReview(formData: FormData) {
  const me = await requireAdmin();
  const enabled = formData.get("enabled") === "on";
  await setSetting("prepublish_review", String(enabled));
  await logAudit(me.id, "settings.prepublish", undefined, { enabled });
  revalidatePath("/admin/settings");
}

export async function approveInitiative(initiativeId: string) {
  const me = await requireAdmin();
  const { db } = await import("@/lib/db");
  const { initiatives } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  await db
    .update(initiatives)
    .set({ awaitingReview: false, status: "open", updatedAt: new Date() })
    .where(eq(initiatives.id, initiativeId));
  await logAudit(me.id, "initiative.approve", {
    type: "initiative",
    id: initiativeId,
  });
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/admin/queue");
}
