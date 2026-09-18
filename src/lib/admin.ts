/**
 * Who may administer Labhours, and who may run things in it.
 *
 * Both are the role the hub hands over on every crossing. People, on the
 * tech-team hub, controls access to the whole estate — Labhours included —
 * so the role in this app's session is the hub's decision, not this app's.
 *
 * There used to be email lists here that made three people admin, and the
 * same three "tech team", whatever their row said. With People in charge a
 * list in this app would be a second, quieter access control that the hub
 * could not see or undo, so the lists are gone: an admin here is somebody
 * People made one.
 */
type Someone = object | null | undefined;

const roleOf = (u: Someone) => (u && "role" in u ? u.role : undefined);

export function isAdmin(u: Someone): boolean {
  return roleOf(u) === "admin";
}

/** May post initiatives and run hackathons: tech, or admin. */
export function isTech(u: Someone): boolean {
  const r = roleOf(u);
  return r === "tech" || r === "admin";
}
