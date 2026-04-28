"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { participationOverrides, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

const Schema = z.object({
  email: z.string().email(),
  termKey: z.string().regex(/^\d{4}-Q[1-4]$/),
  extraSlots: z.coerce.number().int().min(1).max(5),
  reason: z.string().max(280).optional(),
});

export async function grantParticipationOverride(formData: FormData) {
  const me = await requireAdmin();
  const parsed = Schema.parse({
    email: formData.get("email"),
    termKey: formData.get("termKey"),
    extraSlots: formData.get("extraSlots") ?? 1,
    reason: (formData.get("reason") as string) || undefined,
  });
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.email.toLowerCase()));
  if (!u) throw new Error("USER_NOT_FOUND");
  await db
    .insert(participationOverrides)
    .values({
      userId: u.id,
      termKey: parsed.termKey,
      extraSlots: parsed.extraSlots,
      grantedBy: me.id,
      reason: parsed.reason,
    })
    .onConflictDoUpdate({
      target: [participationOverrides.userId, participationOverrides.termKey],
      set: {
        extraSlots: parsed.extraSlots,
        grantedBy: me.id,
        grantedAt: new Date(),
        reason: parsed.reason,
      },
    });
  await logAudit(me.id, "rule.override", { type: "user", id: u.id }, parsed);
  revalidatePath("/admin/audit");
  revalidatePath("/admin/queue");
}
