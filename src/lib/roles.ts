export const ROLES = ["member", "tech", "admin"] as const;
export type Role = (typeof ROLES)[number];

/**
 * The role somebody arrives with, as the hub says.
 *
 * People, on the hub, controls access: it sends `labhoursRole` on every
 * crossing, and that is the role — raised or lowered, applied as sent. A hub
 * that predates the field sends only its own role, which maps down as it
 * always did (ADMIN → admin, LEAD → tech, anyone else → member).
 *
 * There is no floor any more. It used to be "the higher of the stored role and
 * an email list", which meant a list in this app could outrank the hub. Now
 * nothing here can: changing somebody's Labhours role is done in People.
 */
export function roleFromHub(handoff: { hubRole?: string; labhoursRole?: string }): Role {
  if (handoff.labhoursRole && (ROLES as readonly string[]).includes(handoff.labhoursRole)) {
    return handoff.labhoursRole as Role;
  }
  return handoff.hubRole === "ADMIN" ? "admin" : handoff.hubRole === "LEAD" ? "tech" : "member";
}
