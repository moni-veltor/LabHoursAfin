/**
 * The rail's shape, built on the server.
 *
 * `icon` is a NAME, not a component. Lucide icons are functions, and a
 * function cannot be handed from a server component to a client one — React
 * has to serialise the props and there is no wire format for a function. The
 * client resolves the name against its own map.
 */
export type IconName =
  | "initiatives" | "hack" | "showcase" | "people"
  | "board" | "inbox" | "owner" | "templates"
  | "admin" | "queue" | "categories" | "audit" | "settings"
  | "leaderboard";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Unread or pending count, shown as a badge. */
  badge?: number;
  /** Draws the eye — used once, for Hack. */
  hot?: boolean;
};
export type NavGroup = { label: string; items: NavItem[] };

/**
 * The rail's contents, given who is looking.
 *
 * Four groups. Browse is what everyone can see, Yours is what is addressed to
 * you, Run is for people who post, Admin is for people who govern. That is
 * the same four-part shape the Academy uses, and it means somebody who works
 * in both products only learns one menu.
 */
export function navFor(opts: {
  signedIn: boolean;
  canPost: boolean;
  adminAccess: boolean;
  unread: number;
}): NavGroup[] {
  const { signedIn, canPost, adminAccess, unread } = opts;
  const groups: NavGroup[] = [
    {
      label: "Browse",
      items: [
        { href: "/", label: "Initiatives", icon: "initiatives" },
        { href: "/hack", label: "Hack", icon: "hack", hot: true },
        { href: "/showcase", label: "Showcase", icon: "showcase" },
        { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard" },
      ],
    },
  ];

  if (signedIn) {
    groups.push({
      label: "Yours",
      items: [
        { href: "/me", label: "My board", icon: "board" },
        { href: "/inbox", label: "Inbox", icon: "inbox", badge: unread },
      ],
    });
  }

  if (canPost) {
    groups.push({
      label: "Run",
      items: [
        { href: "/owner", label: "Owner dashboard", icon: "owner" },
        { href: "/templates", label: "Templates", icon: "templates" },
      ],
    });
  }

  if (adminAccess) {
    groups.push({
      label: "Admin",
      items: [
        { href: "/admin", label: "Overview", icon: "admin" },
        { href: "/admin/queue", label: "Queue", icon: "queue" },
        { href: "/admin/categories", label: "Categories", icon: "categories" },
        // Was reachable only from the old mobile drawer.
        { href: "/admin/audit", label: "Audit log", icon: "audit" },
        { href: "/admin/settings", label: "Settings", icon: "settings" },
      ],
    });
  }

  return groups;
}
