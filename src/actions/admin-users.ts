"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { initiatives, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { count, eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";
import { isTechTeam } from "@/lib/tech-team";
import { generatePin, hashPin } from "@/lib/pin";

// Reset a user's sign-in PIN to a fresh random 4-digit code. Returns the new
// PIN in plaintext once so the admin can hand it over — it's only stored hashed.
export async function resetUserPin(userId: string): Promise<string> {
  const me = await requireAdmin();
  if (!userId) throw new Error("MISSING_USER_ID");
  const [target] = await db.select().from(users).where(eq(users.id, userId));
  if (!target) throw new Error("NOT_FOUND");

  const pin = generatePin();
  await db
    .update(users)
    .set({ pinHash: hashPin(pin) })
    .where(eq(users.id, userId));
  await logAudit(
    me.id,
    "user.reset_pin",
    { type: "user", id: userId },
    { email: target.email }
  );
  return pin;
}

export async function softDeleteUser(formData: FormData) {
  const me = await requireAdmin();
  const userId = String(formData.get("userId"));
  const reason = String(formData.get("reason") ?? "").slice(0, 280) || null;
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

  await db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(eq(users.id, userId));
  await logAudit(
    me.id,
    "user.soft_delete",
    { type: "user", id: userId },
    { email: target.email, name: target.name, reason }
  );
  revalidatePath("/people");
  revalidatePath("/admin/audit");
}

export async function reactivateUser(userId: string) {
  const me = await requireAdmin();
  await db
    .update(users)
    .set({ deletedAt: null })
    .where(eq(users.id, userId));
  await logAudit(me.id, "user.reactivate", { type: "user", id: userId });
  revalidatePath("/people");
  revalidatePath("/admin/audit");
}
