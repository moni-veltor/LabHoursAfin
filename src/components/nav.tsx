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
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-6 w-6 rounded-md bg-stone-900" />
          Lab Hours
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-stone-700 hover:text-stone-950">Browse</Link>
          <Link href="/showcase" className="text-stone-700 hover:text-stone-950">Showcase</Link>
          {user && (
            <Link href="/me" className="text-stone-700 hover:text-stone-950">My board</Link>
          )}
          {adminAccess && (
            <Link href="/admin" className="text-rose-700 hover:text-rose-900">Admin</Link>
          )}
          {canPost && (
            <Link
              href="/initiatives/new"
              className="rounded-md bg-stone-900 px-3 py-1.5 text-white hover:bg-stone-800"
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
            <Link href="/signin" className="text-stone-700 hover:text-stone-950">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
