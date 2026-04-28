"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { reports } from "@/db/schema";
import { requireUser, requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const Schema = z.object({
  targetType: z.enum(["comment", "update", "initiative"]),
  targetId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export async function reportTarget(formData: FormData) {
  const me = await requireUser();
  const rl = rateLimit(`report:${me.id}`, 5, 60_000);
  if (!rl.ok) throw new Error("RATE_LIMITED");
  const parsed = Schema.parse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    reason: (formData.get("reason") as string) || undefined,
  });
  await db.insert(reports).values({
    targetType: parsed.targetType,
    targetId: parsed.targetId,
    reporterId: me.id,
    reason: parsed.reason,
  });
  revalidatePath("/admin/queue");
}

export async function resolveReport(id: string) {
  const me = await requireAdmin();
  await db
    .update(reports)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(reports.id, id));
  await logAudit(me.id, "report.resolve", { type: "report", id });
  revalidatePath("/admin/queue");
}
