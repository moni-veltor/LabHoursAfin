import { db } from "@/lib/db";
import { initiatives } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { isTechTeam } from "@/lib/tech-team";
import { isAdmin } from "@/lib/admin";

/**
 * Who may create an initiative.
 *
 * It used to be the tech team and admins only. But an owner — anyone who has
 * been given an initiative to run — should be able to start another without
 * asking an admin each time. So the rule is: tech, admin, or you already own
 * at least one initiative.
 *
 * The "already owns one" clause is deliberately how someone bootstraps into
 * being a maker: an admin hands them their first initiative, and from then on
 * they are self-sufficient.
 */
export function isTech(u: { role?: string | null; email?: string | null } | undefined | null) {
  return (
    u?.role === "tech" ||
    u?.role === "admin" ||
    isTechTeam(u?.email ?? undefined) ||
    isAdmin(u?.email ?? undefined)
  );
}

export async function ownsAnyInitiative(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ c: count() })
    .from(initiatives)
    .where(eq(initiatives.ownerId, userId));
  return Number(row?.c ?? 0) > 0;
}

/** The full check, DB included. */
export async function canCreateInitiative(
  u: { id?: string | null; role?: string | null; email?: string | null } | undefined | null,
): Promise<boolean> {
  if (!u?.id) return false;
  if (isTech(u)) return true;
  return ownsAnyInitiative(u.id);
}
