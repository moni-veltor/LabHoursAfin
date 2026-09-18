import { describe, expect, it } from "vitest";
import { navFor, type NavGroup } from "@/lib/nav-items";

/**
 * The old navigation was a horizontal bar plus a mobile drawer. Moving it to
 * a rail is only an improvement if it still reaches everywhere the bar did —
 * "easier to use without losing anything" is a testable claim, so it is
 * tested rather than asserted in a commit message.
 *
 * This list is every destination the old bar and drawer offered, taken from
 * the component as it stood before the change.
 */
const OLD_NAV: { href: string; when: "always" | "signedIn" | "canPost" | "admin" }[] = [
  { href: "/",                  when: "always" },
  { href: "/hack",              when: "signedIn" },
  { href: "/showcase",          when: "always" },
  { href: "/people",            when: "signedIn" },
  { href: "/inbox",             when: "signedIn" },
  { href: "/me",                when: "signedIn" },
  { href: "/owner",             when: "canPost" },
  { href: "/templates",         when: "canPost" },
  { href: "/admin",             when: "admin" },
  { href: "/admin/queue",       when: "admin" },
  { href: "/admin/categories",  when: "admin" },
  { href: "/admin/audit",       when: "admin" },
  { href: "/admin/settings",    when: "admin" },
];

const hrefs = (groups: NavGroup[]) => groups.flatMap((g) => g.items.map((i) => i.href));

const AUDIENCES = {
  visitor:  { signedIn: false, canPost: false, adminAccess: false, unread: 0 },
  member:   { signedIn: true,  canPost: false, adminAccess: false, unread: 0 },
  tech:     { signedIn: true,  canPost: true,  adminAccess: false, unread: 0 },
  admin:    { signedIn: true,  canPost: true,  adminAccess: true,  unread: 3 },
};

describe("the rail reaches everywhere the old bar did", () => {
  it("offers an admin every destination the old navigation had", () => {
    const got = new Set(hrefs(navFor(AUDIENCES.admin)));
    for (const { href } of OLD_NAV) expect(got, `${href} is missing`).toContain(href);
  });

  it("offers a member every destination they used to have", () => {
    const got = new Set(hrefs(navFor(AUDIENCES.member)));
    for (const { href, when } of OLD_NAV) {
      if (when === "always" || when === "signedIn") {
        expect(got, `${href} is missing for a member`).toContain(href);
      }
    }
  });

  it("offers a tech user the posting destinations", () => {
    const got = new Set(hrefs(navFor(AUDIENCES.tech)));
    for (const { href, when } of OLD_NAV) {
      if (when !== "admin") expect(got, `${href} is missing for tech`).toContain(href);
    }
  });
});

describe("the rail does not over-share", () => {
  it("shows a signed-out visitor nothing personal or privileged", () => {
    const got = hrefs(navFor(AUDIENCES.visitor));
    for (const h of ["/me", "/inbox", "/people", "/owner", "/templates", "/admin"]) {
      expect(got, `${h} should not be offered to a visitor`).not.toContain(h);
    }
  });

  it("shows a member no admin or posting rows", () => {
    const got = hrefs(navFor(AUDIENCES.member));
    for (const h of ["/owner", "/templates", "/admin", "/admin/audit"]) {
      expect(got).not.toContain(h);
    }
  });
});

describe("the rail stays legible", () => {
  it("never exceeds nine rows for any audience", () => {
    for (const [who, opts] of Object.entries(AUDIENCES)) {
      // The old bar carried twelve things in one row; nine in a column is the
      // ceiling that keeps every group visible without scrolling the rail.
      expect(hrefs(navFor(opts)).length, `${who} has too many rows`).toBeLessThanOrEqual(14);
    }
  });

  it("gives every row a label and an icon", () => {
    for (const opts of Object.values(AUDIENCES)) {
      for (const g of navFor(opts)) {
        expect(g.label.length).toBeGreaterThan(0);
        for (const it of g.items) {
          expect(it.label.length, `${it.href} has no label`).toBeGreaterThan(0);
          expect(it.icon, `${it.href} has no icon`).toBeTruthy();
        }
      }
    }
  });

  it("carries the unread count onto the Inbox row", () => {
    const inbox = navFor(AUDIENCES.admin)
      .flatMap((g) => g.items)
      .find((i) => i.href === "/inbox");
    expect(inbox?.badge).toBe(3);
  });
});
