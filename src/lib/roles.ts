import { isAdmin } from "@/lib/admin";
import { isTechTeam } from "@/lib/tech-team";

export const ROLES = ["member", "tech", "admin"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = { member: 0, tech: 1, admin: 2 };

/**
 * The role an account signs in as.
 *
 * The database is the source of truth, so an admin can promote a colleague
 * in-app and have it persist. The founding lists are a FLOOR, not the whole
 * story: those emails can never be demoted or locked out, whatever the row
 * says. The rule is simply "the higher of the stored role and the guaranteed
 * one" — which also means an admin editing a row can raise a role but a
 * founder's floor still wins on their own account.
 */
export function effectiveRole(email: string, stored: Role): Role {
  const floor: Role = isAdmin(email) ? "admin" : isTechTeam(email) ? "tech" : "member";
  return RANK[stored] >= RANK[floor] ? stored : floor;
}
