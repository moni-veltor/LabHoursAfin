import { describe, expect, it } from "vitest";
import { isTech } from "@/lib/can-create";

/**
 * Creating an initiative used to be tech/admin only, which stranded owners:
 * you could be handed an initiative to run and still not be able to start a
 * second. The capability is now "tech, admin, or owns at least one" — the
 * ownership half needs the database, but the tech half is pure and worth
 * pinning so a role check does not silently regress.
 */
describe("isTech", () => {
  it("is true for the tech and admin roles", () => {
    expect(isTech({ role: "tech" })).toBe(true);
    expect(isTech({ role: "admin" })).toBe(true);
  });
  it("is true for a founding admin/tech email regardless of stored role", () => {
    expect(isTech({ role: "member", email: "monica.velasquez@afinbank.com" })).toBe(true);
  });
  it("is false for an ordinary member — they qualify only by owning one", () => {
    expect(isTech({ role: "member", email: "jane.smith@afinbank.com" })).toBe(false);
    expect(isTech(undefined)).toBe(false);
    expect(isTech(null)).toBe(false);
  });
});
