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
import { zodiacFromDate, chineseZodiacFromDate } from "@/lib/zodiac";

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
  revalidatePath("/admin/people");
  revalidatePath("/admin/audit");
}

export async function reactivateUser(userId: string) {
  const me = await requireAdmin();
  await db
    .update(users)
    .set({ deletedAt: null })
    .where(eq(users.id, userId));
  await logAudit(me.id, "user.reactivate", { type: "user", id: userId });
  revalidatePath("/admin/people");
  revalidatePath("/admin/audit");
}


/**
 * A date of birth, and the two signs it implies — or nothing at all when no
 * date was offered. The admin editor no longer offers one (birthdays moved to
 * People on the hub), and an edit that did not mention the birthday must not
 * erase it: before, saving a name change blanked the date and both signs.
 *
 *
 * Zodiac and Chinese sign are never entered by hand — they are a function of
 * the birth date, so the admin sets the date and these are derived. Parsed as
 * UTC midnight so the day the person typed is the day the sign is read from;
 * a local parse would shift a 1 January birthday into the previous year for
 * anyone west of UTC.
 */
function bornFields(dob: string | null | undefined) {
  if (dob === undefined) return {};
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return { dateOfBirth: null, zodiac: null, chineseZodiac: null };
  }
  const d = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    return { dateOfBirth: null, zodiac: null, chineseZodiac: null };
  }
  return { dateOfBirth: d, zodiac: zodiacFromDate(d), chineseZodiac: chineseZodiacFromDate(d) };
}

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN?.toLowerCase();
const ROLES = ["member", "tech", "admin"] as const;
type Role = (typeof ROLES)[number];

function cleanEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("BAD_EMAIL");
  if (ALLOWED_DOMAIN && !email.endsWith(`@${ALLOWED_DOMAIN}`)) throw new Error("WRONG_DOMAIN");
  return email;
}

/**
 * Create a person and hand back their first PIN once.
 *
 * Sign-in is pre-provisioned — no self sign-up — so somebody has to make the
 * account, and until now that was a database task. The PIN is generated,
 * stored only as a hash, and returned in plaintext this one time for the
 * admin to pass on, exactly as a reset does.
 */
export async function createUser(input: {
  email: string;
  name: string;
  role: Role;
  department?: string | null;
  jobTitle?: string | null;
  dateOfBirth?: string | null;
}): Promise<{ id: string; pin: string }> {
  const me = await requireAdmin();
  const email = cleanEmail(input.email);
  const name = input.name.trim().slice(0, 120);
  if (!name) throw new Error("MISSING_NAME");
  const role: Role = ROLES.includes(input.role) ? input.role : "member";

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    // A soft-deleted account still holds the unique email; steer the admin to
    // reactivate rather than silently colliding.
    throw new Error(existing.deletedAt ? "EXISTS_DELETED" : "EXISTS");
  }

  const pin = generatePin();
  const [created] = await db
    .insert(users)
    .values({
      email,
      name,
      role,
      pinHash: hashPin(pin),
      department: input.department?.trim().slice(0, 120) || null,
      jobTitle: input.jobTitle?.trim().slice(0, 120) || null,
      ...bornFields(input.dateOfBirth),
    })
    .returning({ id: users.id });

  await logAudit(me.id, "user.create", { type: "user", id: created.id }, { email, name, role });
  revalidatePath("/admin/people");
  revalidatePath("/admin/audit");
  return { id: created.id, pin };
}

/**
 * Edit a person's details and role.
 *
 * Role is a real edit now, not decoration: the sign-in flow reads the stored
 * role and only ever raises it to the founding-admin floor, so a change here
 * persists. An admin cannot drop their own admin, which is how somebody locks
 * themselves out of the thing they are standing in.
 */
export async function updateUser(input: {
  userId: string;
  name: string;
  role: Role;
  department?: string | null;
  jobTitle?: string | null;
  dateOfBirth?: string | null;
}): Promise<void> {
  const me = await requireAdmin();
  if (!input.userId) throw new Error("MISSING_USER_ID");
  const [target] = await db.select().from(users).where(eq(users.id, input.userId));
  if (!target) throw new Error("NOT_FOUND");

  const name = input.name.trim().slice(0, 120);
  if (!name) throw new Error("MISSING_NAME");
  const role: Role = ROLES.includes(input.role) ? input.role : target.role;

  if (input.userId === me.id && role !== "admin") throw new Error("CANT_DEMOTE_SELF");
  // The founding admins are admin by floor regardless, so pretending to demote
  // them in the UI would be a lie — block it and say why.
  if (isAdmin(target.email) && role !== "admin") throw new Error("CANT_DEMOTE_FOUNDER");

  await db
    .update(users)
    .set({
      name,
      role,
      department: input.department?.trim().slice(0, 120) || null,
      jobTitle: input.jobTitle?.trim().slice(0, 120) || null,
      ...bornFields(input.dateOfBirth),
    })
    .where(eq(users.id, input.userId));

  await logAudit(
    me.id, "user.update", { type: "user", id: input.userId },
    { email: target.email, role, from: target.role },
  );
  revalidatePath("/admin/people");
  revalidatePath("/admin/audit");
}
