import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export async function Nav() {
  const session = await auth();
  const user = session?.user as
    | { id?: string; name?: string; email?: string; role?: "member" | "tech" | "admin" }
    | undefined;
  const canPost = user?.role === "tech" || user?.role === "admin";
  const adminAccess = isAdmin(user?.email);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-semibold tracking-tight"
        >
          <BrandMark />
          <span className="text-ink-text">Lab Hours</span>
          <span className="font-mono text-xs text-dim group-hover:text-muted">
            v0.4
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/">Browse</NavLink>
          <NavLink href="/showcase">Showcase</NavLink>
          {canPost && <NavLink href="/templates">Templates</NavLink>}
          {user && <NavLink href="/me">My board</NavLink>}
          {adminAccess && (
            <Link
              href="/admin"
              className="rounded-md border border-brand-accent/40 bg-brand-accent-950 px-2.5 py-1 font-mono text-xs uppercase tracking-wide text-brand-accent hover:bg-brand-accent-900"
            >
              admin
            </Link>
          )}
          {canPost && (
            <Link
              href="/initiatives/new"
              className="ml-1 rounded-md bg-brand-primary px-3 py-1.5 text-sm font-medium text-white shadow-glow transition hover:bg-brand-primary-dark"
            >
              + New initiative
            </Link>
          )}
          <span className="ml-2 hidden items-center gap-1 rounded-md border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-dim sm:inline-flex">
            <kbd>⌘</kbd>
            <kbd>K</kbd>
          </span>
          {user ? (
            <form
              className="ml-1"
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/signin" });
              }}
            >
              <button className="px-2 py-1 text-sm text-muted hover:text-ink-text">
                Sign out
              </button>
            </form>
          ) : (
            <NavLink href="/signin">Sign in</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2.5 py-1.5 text-muted transition hover:bg-raised hover:text-ink-text"
    >
      {children}
    </Link>
  );
}

function BrandMark() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary shadow-glow">
      <span className="h-2 w-2 rounded-full bg-brand-accent" />
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand-success ring-2 ring-ink" />
    </span>
  );
}
