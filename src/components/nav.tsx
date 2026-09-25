import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { unreadCount } from "@/lib/notifications-server";
import { SidebarNav } from "@/components/sidebar-nav";
import { navFor } from "@/lib/nav-items";
import { isTech, ownsAnyInitiative } from "@/lib/can-create";

/**
 * The rail, assembled server-side.
 *
 * Everything navFor returns has a labelled row, and above them the way back
 * to the hub this app is a tile of.
 */
export async function Nav() {
  const session = await auth();
  const user = session?.user as
    | { id?: string; name?: string; email?: string; role?: "member" | "tech" | "admin" }
    | undefined;

  // Tech, admin, or anyone who already owns an initiative can post.
  const canPost = isTech(user) || (user?.id ? await ownsAnyInitiative(user.id) : false);
  const adminAccess = isAdmin(user);
  const unread = user?.id ? await unreadCount(user.id) : 0;

  const groups = navFor({
    signedIn: !!user,
    canPost,
    adminAccess,
    unread,
  });

  const brand = (
    <Link href="/" className="group flex items-center gap-2.5">
      <BrandMark />
      <span className="min-w-0">
        <span className="block font-semibold tracking-tight text-chrome-ink">Lab Hours</span>
        <span className="block font-mono text-[10px] text-chrome-soft">Afin Bank · v0.6</span>
      </span>
    </Link>
  );

  const identity = user ? (
    <div className="space-y-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-chrome-ink">
          {user.name ?? user.email}
        </p>
        <p className="truncate text-xs capitalize text-chrome-soft">{user.role ?? "member"}</p>
      </div>
      <div className="flex h-7 items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-md border border-ink/25 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-chrome-soft">
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <button className="text-xs font-medium text-chrome-muted transition hover:text-chrome-ink">
            Sign out
          </button>
        </form>
      </div>
    </div>
  ) : (
    <Link
      href="/signin"
      className="block rounded-md border border-ink/25 px-3 py-2 text-center text-sm font-medium text-chrome-ink transition hover:bg-ink/10"
    >
      Sign in
    </Link>
  );

  return (
    <SidebarNav
      groups={groups}
      primary={canPost ? { href: "/initiatives/new", label: "New initiative" } : undefined}
      brand={brand}
      brandMark={<BrandMark />}
      identity={identity}
    />
  );
}

function BrandMark() {
  return (
    <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink">
      <span className="h-2 w-2 rounded-full bg-chrome" />
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand-accent ring-2 ring-ink" />
    </span>
  );
}
