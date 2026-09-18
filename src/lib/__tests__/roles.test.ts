import { describe, expect, it } from "vitest";
import { effectiveRole } from "@/lib/roles";
import { ADMIN_EMAILS } from "@/lib/admin";
import { TECH_TEAM_EMAILS } from "@/lib/tech-team";

/**
 * Roles were hardcoded and overwritten at every sign-in, so an admin could
 * not actually promote anyone. Now the database is the source of truth with
 * the founding lists as a floor. Two things must both hold: a normal edit
 * sticks, and a founder can never be locked out — which is exactly the pair a
 * "just read the DB" or a "just read the list" version would each get wrong.
 */
const FOUNDER = ADMIN_EMAILS[0];
const OUTSIDER = "jane.smith@afinbank.com";

describe("effectiveRole — the DB is truth, the lists are a floor", () => {
  it("lets an admin promote an ordinary colleague, and it sticks", () => {
    expect(effectiveRole(OUTSIDER, "tech")).toBe("tech");
    expect(effectiveRole(OUTSIDER, "admin")).toBe("admin");
  });

  it("leaves an ordinary member a member", () => {
    expect(effectiveRole(OUTSIDER, "member")).toBe("member");
  });

  it("never demotes a founding admin, whatever the row says", () => {
    expect(effectiveRole(FOUNDER, "member")).toBe("admin");
    expect(effectiveRole(FOUNDER, "tech")).toBe("admin");
    expect(effectiveRole(FOUNDER, "admin")).toBe("admin");
  });

  it("floors a founding tech email at tech but lets the DB raise it", () => {
    const tech = TECH_TEAM_EMAILS.find((e) => !ADMIN_EMAILS.includes(e as never));
    if (!tech) return; // all founders are admins in this config
    expect(effectiveRole(tech, "member")).toBe("tech");
    expect(effectiveRole(tech, "admin")).toBe("admin");
  });

  it("takes the higher of stored and floor, never the lower", () => {
    for (const stored of ["member", "tech", "admin"] as const) {
      const got = effectiveRole(FOUNDER, stored);
      expect(["admin"]).toContain(got); // founder floor is admin
    }
  });
});
