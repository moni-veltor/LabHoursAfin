import { describe, expect, it } from "vitest";
import { navFor } from "@/lib/nav-items";

/**
 * People moved to the hub, but Labhours accounts did not: roles, PINs and
 * removal are on /admin/people. The move is only safe if an admin can still
 * reach those levers — and nobody else can.
 */
const hrefs = (o: Parameters<typeof navFor>[0]) => navFor(o).flatMap((g) => g.items.map((i) => i.href));

describe("account management after People moved to the hub", () => {
  it("is in an admin's rail", () => {
    expect(hrefs({ signedIn: true, canPost: true, adminAccess: true, unread: 0 })).toContain("/admin/people");
  });

  it("is not in anyone else's", () => {
    for (const canPost of [false, true])
      expect(hrefs({ signedIn: true, canPost, adminAccess: false, unread: 0 })).not.toContain("/admin/people");
  });
});
