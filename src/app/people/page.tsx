import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { asc, ilike, or, sql } from "drizzle-orm";
import { Avatar } from "@/components/avatar";

type Search = { q?: string; dept?: string };

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/people");
  const sp = await searchParams;

  const where = sp.q
    ? or(
        ilike(users.name, `%${sp.q}%`),
        ilike(users.email, `%${sp.q}%`),
        ilike(users.jobTitle, `%${sp.q}%`),
        ilike(users.department, `%${sp.q}%`),
        ilike(users.hobbies, `%${sp.q}%`)
      )
    : undefined;

  const rows = await db
    .select()
    .from(users)
    .where(where as any)
    .orderBy(asc(users.name));

  const filtered = sp.dept
    ? rows.filter((u) => (u.department ?? "").toLowerCase() === sp.dept!.toLowerCase())
    : rows;

  const departments = Array.from(
    new Set(rows.map((r) => r.department).filter(Boolean) as string[])
  ).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">People</h1>
          <p className="mt-1 text-muted">
            {filtered.length} of {rows.length} colleagues. Hobbies and
            departments are searchable.
          </p>
        </div>
      </div>

      <form
        action="/people"
        method="GET"
        className="flex flex-wrap items-center gap-2"
      >
        <div className="relative flex-1 min-w-[240px]">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-xs text-dim">
            /
          </span>
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="search name, hobby, role, dept..."
            className="w-full rounded-md border border-line bg-raised pl-7 pr-3 py-2 text-sm placeholder:text-dim focus:border-brand-primary focus:outline-none"
          />
        </div>
        {sp.dept && <input type="hidden" name="dept" value={sp.dept} />}
        <button className="rounded-md border border-line bg-raised px-3 py-2 text-sm text-muted hover:text-ink-text">
          Search
        </button>
        {(sp.q || sp.dept) && (
          <Link
            href="/people"
            className="rounded-md border border-line bg-raised px-3 py-2 text-sm text-muted hover:text-ink-text"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="-mx-1 flex flex-wrap gap-1 overflow-x-auto pb-1 font-mono text-[10px] uppercase tracking-wider">
        <Link
          href={sp.q ? `/people?q=${encodeURIComponent(sp.q)}` : "/people"}
          className={`rounded-full px-3 py-1 ${
            !sp.dept
              ? "bg-brand-primary text-white shadow-glow"
              : "border border-line bg-raised text-muted hover:text-ink-text"
          }`}
        >
          all departments
        </Link>
        {departments.map((d) => {
          const params = new URLSearchParams();
          if (sp.q) params.set("q", sp.q);
          params.set("dept", d);
          const active = (sp.dept ?? "").toLowerCase() === d.toLowerCase();
          return (
            <Link
              key={d}
              href={`/people?${params.toString()}`}
              className={`rounded-full px-3 py-1 ${
                active
                  ? "bg-brand-primary text-white shadow-glow"
                  : "border border-line bg-raised text-muted hover:text-ink-text"
              }`}
            >
              {d}
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface py-16 text-center text-muted">
          No matches.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((u) => {
            const hobbies = (u.hobbies ?? "")
              .split(/[,;]/)
              .map((h) => h.trim())
              .filter(Boolean);
            return (
              <li
                key={u.id}
                className="rounded-xl border border-line bg-surface p-4 transition hover:border-brand-primary/40 hover:shadow-glow-soft"
              >
                <Link href={`/u/${u.id}`} className="flex items-start gap-3">
                  <Avatar name={u.name} email={u.email} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold tracking-tight text-ink-text">
                        {u.name ?? u.email}
                      </span>
                      <RoleBadge role={u.role} />
                    </div>
                    {u.jobTitle && (
                      <p className="text-sm text-ink-text/90">{u.jobTitle}</p>
                    )}
                    <p className="font-mono text-[11px] text-dim">
                      {u.department ?? "—"} · {u.email}
                    </p>
                    {hobbies.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {hobbies.slice(0, 8).map((h) => (
                          <li
                            key={h}
                            className="rounded-full border border-line bg-raised px-2 py-0.5 font-mono text-[10px] text-muted"
                          >
                            {h.toLowerCase()}
                          </li>
                        ))}
                        {hobbies.length > 8 && (
                          <li className="font-mono text-[10px] text-dim">
                            +{hobbies.length - 8} more
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: "border-brand-accent/40 bg-brand-accent-950 text-brand-accent",
    tech: "border-brand-primary/40 bg-brand-primary-950 text-brand-primary-glow",
    member: "border-line bg-raised text-muted",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
        map[role] ?? map.member
      }`}
    >
      {role}
    </span>
  );
}
