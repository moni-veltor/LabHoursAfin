"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { announcements } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

const Schema = z.object({
  body: z.string().min(2).max(280),
});

export async function postAnnouncement(formData: FormData) {
  const me = await requireAdmin();
  const parsed = Schema.parse({ body: formData.get("body") });
  await db
    .update(announcements)
    .set({ active: false })
    .where(eq(announcements.active, true));
  await db.insert(announcements).values({
    body: parsed.body,
    createdBy: me.id,
  });
  await logAudit(me.id, "announcement.create", undefined, parsed);
  revalidatePath("/", "layout");
}

export async function dismissAnnouncement(id: string) {
  const me = await requireAdmin();
  await db
    .update(announcements)
    .set({ active: false })
    .where(eq(announcements.id, id));
  await logAudit(me.id, "announcement.dismiss", { type: "announcement", id });
  revalidatePath("/", "layout");
}
