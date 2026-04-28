"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { initiatives, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { count, eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";
import { isTechTeam } from "@/lib/tech-team";

export async function deleteUser(formData: FormData) {
  const me = await requireAdmin();
  const userId = String(formData.get("userId"));
  if (!userId) throw new Error("MISSING_USER_ID");
  if (userId === me.id) throw new Error("CANT_DELETE_SELF");

  const [target] = await db.select().from(users).where(eq(users.id, userId));
  if (!target) throw new Error("NOT_FOUND");
  if (isAdmin(target.email)) throw new Error("CANT_DELETE_ADMIN");
  if (isTechTeam(target.email)) throw new Error("CANT_DELETE_TECH");

  const owned = await db
    .select({ c: count() })
    .from(initiatives)
    .where(eq(initiatives.ownerId, userId));
  if (Number(owned[0]?.c ?? 0) > 0) {
    throw new Error("HAS_INITIATIVES");
  }

  await db.delete(users).where(eq(users.id, userId));
  await logAudit(
    me.id,
    "user.delete",
    { type: "user", id: userId },
    { email: target.email, name: target.name }
  );

  revalidatePath("/people");
  revalidatePath("/admin/audit");
}
