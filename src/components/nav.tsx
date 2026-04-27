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
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <BrandMark />
          Lab Hours
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-stone-700 hover:text-brand-primary">Browse</Link>
          <Link href="/showcase" className="text-stone-700 hover:text-brand-primary">Showcase</Link>
          {user && (
            <Link href="/me" className="text-stone-700 hover:text-brand-primary">My board</Link>
          )}
          {adminAccess && (
            <Link
              href="/admin"
              className="rounded-md bg-brand-accent-50 px-2 py-1 font-medium text-brand-accent-dark hover:bg-brand-accent-100"
            >
              Admin
            </Link>
          )}
          {canPost && (
            <Link
              href="/initiatives/new"
              className="rounded-md bg-brand-primary px-3 py-1.5 text-white hover:bg-brand-primary-dark"
            >
              New initiative
            </Link>
          )}
          {user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/signin" });
              }}
            >
              <button className="text-stone-500 hover:text-stone-900">Sign out</button>
            </form>
          ) : (
            <Link href="/signin" className="text-stone-700 hover:text-brand-primary">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function BrandMark() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary">
      <span className="h-2 w-2 rounded-full bg-brand-accent" />
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand-success ring-2 ring-white" />
    </span>
  );
}
