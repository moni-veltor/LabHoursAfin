import { describe, expect, it } from "vitest";
import { roleFromHub } from "@/lib/roles";
import { isAdmin, isTech } from "@/lib/admin";

/**
 * People on the hub controls access. These pin down the two ways that could
 * quietly stop being true: a role Labhours decides for itself, and an email
 * that counts for more than the role the hub sent.
 */
describe("the role comes from the hub", () => {
  it("applies the Labhours role People sends, up or down", () => {
    expect(roleFromHub({ hubRole: "MEMBER", labhoursRole: "tech" })).toBe("tech");
    expect(roleFromHub({ hubRole: "ADMIN", labhoursRole: "member" })).toBe("member");
  });

  it("maps the hub role down when no Labhours role is sent", () => {
    expect(roleFromHub({ hubRole: "ADMIN" })).toBe("admin");
    expect(roleFromHub({ hubRole: "LEAD" })).toBe("tech");
    expect(roleFromHub({ hubRole: "MEMBER" })).toBe("member");
  });

  it("does not trust a Labhours role it does not know", () => {
    expect(roleFromHub({ hubRole: "MEMBER", labhoursRole: "superuser" })).toBe("member");
  });
});

describe("an email is not a permission", () => {
  it("does not make a founder an admin without the role", () => {
    const founder = { email: "monica.velasquez@afinbank.com", role: "member" };
    expect(isAdmin(founder)).toBe(false);
    expect(isTech(founder)).toBe(false);
  });

  it("follows the role", () => {
    expect(isAdmin({ role: "admin" })).toBe(true);
    expect(isTech({ role: "tech" })).toBe(true);
    expect(isTech({ role: "admin" })).toBe(true);
    expect(isAdmin(null)).toBe(false);
  });
});
