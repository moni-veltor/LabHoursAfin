import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, ilike, isNull, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { Avatar } from "@/components/avatar";
import { DeleteUserButton } from "@/components/delete-user-button";
import { ResetPinButton } from "@/components/reset-pin-button";
import { UserEditor } from "@/components/user-editor";
import { isAdmin } from "@/lib/admin";
import { isTechTeam } from "@/lib/tech-team";
import { hub } from "@/lib/hub";

/**
 * Labhours accounts: who can sign in, as what, and with which PIN.
 *
 * This used to share a page with the People directory. The directory moved to
 * the hub — who somebody is belongs to the person, not to Labhours — but the
 * levers did not: a Labhours role decides who may post an initiative or run a
 * hackathon here, and that is Labhours' to set.
 */
export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  const me = session?.user as { id?: string; email?: string } | undefined;
  if (!me) redirect("/signin?callbackUrl=/admin/people");
  if (!isAdmin(me.email)) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8">
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="mt-2 text-muted">Accounts are managed by Labhours administrators.</p>
      </div>
    );
  }

  const q = (await searchParams).q?.trim() ?? "";
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      department: users.department,
      jobTitle: users.jobTitle,
    })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        q
          ? or(
              ilike(users.name, `%${q}%`),
              ilike(users.email, `%${q}%`),
              ilike(users.department, `%${q}%`),
              ilike(users.jobTitle, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(asc(users.name));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="mt-1 max-w-[62ch] text-muted">
            {rows.length} {rows.length === 1 ? "account" : "accounts"}. Roles, PINs and removal. Profiles — hobbies,
            bios, birthdays — are on{" "}
            <a href={hub("/people")} className="text-brand-primary-glow underline underline-offset-2">
              People in the hub
            </a>
            .
          </p>
        </div>
        <UserEditor mode="create" />
      </div>

      <form action="/admin/people" method="GET" className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="search name, email, department, job title..."
          className="min-w-[240px] flex-1 rounded-md border border-line bg-raised px-3 py-2 text-sm placeholder:text-dim focus:border-brand-primary focus:outline-none"
        />
        <button className="rounded-md border border-line bg-raised px-3 py-2 text-sm text-muted hover:text-ink-text">
          Search
        </button>
        {q && (
          <Link
            href="/admin/people"
            className="rounded-md border border-line bg-raised px-3 py-2 text-sm text-muted hover:text-ink-text"
          >
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface py-16 text-center text-muted">
          No matches.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-raised text-left font-mono text-[10px] uppercase tracking-wider text-dim">
                <th className="px-3 py-2 font-medium">Person</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Department</th>
                <th className="px-3 py-2 font-medium">Job title</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-line/60 last:border-0 hover:bg-raised/40">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={u.name} email={u.email} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink-text">{u.name ?? u.email}</span>
                        <span className="block truncate font-mono text-[11px] text-dim">{u.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted">{u.role}</td>
                  <td className="px-3 py-2 text-muted">{u.department ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{u.jobTitle ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <UserEditor
                        mode="edit"
                        user={{
                          id: u.id,
                          email: u.email,
                          name: u.name,
                          role: u.role,
                          department: u.department,
                          jobTitle: u.jobTitle,
                        }}
                      />
                      <ResetPinButton userId={u.id} name={u.name ?? u.email} />
                      {u.id !== me.id && !isAdmin(u.email) && !isTechTeam(u.email) && (
                        <DeleteUserButton userId={u.id} name={u.name ?? u.email} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
