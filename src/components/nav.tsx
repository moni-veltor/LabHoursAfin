import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export async function Nav() {
  const session = await auth();
  const user = session?.user as
    | { name?: string; email?: string; role?: "member" | "tech" | "admin" }
    | undefined;
  const isTech = user?.role === "tech" || user?.role === "admin";

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-6 w-6 rounded-md bg-stone-900" />
          Lab Board
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-stone-700 hover:text-stone-950">Browse</Link>
          {user && <Link href="/me" className="text-stone-700 hover:text-stone-950">My board</Link>}
          {isTech && (
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
