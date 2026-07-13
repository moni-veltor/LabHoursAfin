import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { and, asc, desc, ilike, isNull, or } from "drizzle-orm";
import { Avatar } from "@/components/avatar";
import { DeleteUserButton } from "@/components/delete-user-button";
import { ResetPinButton } from "@/components/reset-pin-button";
import { isAdmin } from "@/lib/admin";
import { isTechTeam } from "@/lib/tech-team";
import { ZODIAC_EMOJI, CHINESE_EMOJI } from "@/lib/zodiac";

function formatDob(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function sign(value: string | null, emoji: Record<string, string>) {
  if (!value) return "—";
  const e = emoji[value];
  return e ? `${e} ${value}` : value;
}

const PAGE_SIZE = 24;

type Search = {
  q?: string;
  dept?: string;
  hobby?: string;
  sort?: string;
  page?: string;
};

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await auth();
  const me = session?.user as { id?: string; email?: string } | undefined;
  if (!me) redirect("/signin?callbackUrl=/people");
  const adminAccess = isAdmin(me.email);
  const sp = await searchParams;

  const filters: any[] = [isNull(users.deletedAt)];
  if (sp.q) {
    filters.push(
      or(
        ilike(users.name, `%${sp.q}%`),
        ilike(users.email, `%${sp.q}%`),
        ilike(users.jobTitle, `%${sp.q}%`),
        ilike(users.department, `%${sp.q}%`),
        ilike(users.hobbies, `%${sp.q}%`)
      )
    );
  }
  if (sp.hobby) filters.push(ilike(users.hobbies, `%${sp.hobby}%`));

  const sort = sp.sort ?? "name";
  const orderBy =
    sort === "newest"
      ? [desc(users.createdAt)]
      : sort === "department"
      ? [asc(users.department), asc(users.name)]
      : sort === "role"
      ? [asc(users.role), asc(users.name)]
      : [asc(users.name)];

  const all = await db
    .select()
    .from(users)
    .where(and(...filters))
    .orderBy(...orderBy);

  const filtered = sp.dept
    ? all.filter((u) => (u.department ?? "").toLowerCase() === sp.dept!.toLowerCase())
    : all;

  const departments = Array.from(
    new Set(all.map((r) => r.department).filter(Boolean) as string[])
  ).sort();

  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const paged = filtered.slice(offset, offset + PAGE_SIZE);
  const hasNext = filtered.length > offset + PAGE_SIZE;
  const popularHobbies = computePopularHobbies(all);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">People</h1>
          <p className="mt-1 text-muted">
            {filtered.length} of {all.length} colleagues. Hobbies, departments,
            and roles are searchable.
          </p>
        </div>
        {adminAccess && (
          <a
            href="/api/people/csv"
            className="rounded-md border border-line bg-raised px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink-text"
          >
            ↓ csv
          </a>
        )}
      </div>

      <form action="/people" method="GET" className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
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
        {sp.hobby && <input type="hidden" name="hobby" value={sp.hobby} />}
        {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
        <button className="rounded-md border border-line bg-raised px-3 py-2 text-sm text-muted hover:text-ink-text">
          Search
        </button>
        {(sp.q || sp.dept || sp.hobby) && (
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
          href={preserveQs(sp, { dept: undefined })}
          className={`rounded-full px-3 py-1 ${
            !sp.dept
              ? "bg-brand-primary text-white shadow-glow"
              : "border border-line bg-raised text-muted hover:text-ink-text"
          }`}
        >
          all departments
        </Link>
        {departments.map((d) => (
          <Link
            key={d}
            href={preserveQs(sp, { dept: d })}
            className={`rounded-full px-3 py-1 ${
              (sp.dept ?? "").toLowerCase() === d.toLowerCase()
                ? "bg-brand-primary text-white shadow-glow"
                : "border border-line bg-raised text-muted hover:text-ink-text"
            }`}
          >
            {d}
          </Link>
        ))}
      </div>

      {popularHobbies.length > 0 && (
        <div className="-mx-1 flex flex-wrap gap-1 overflow-x-auto pb-1 font-mono text-[10px]">
          <span className="px-2 py-1 uppercase tracking-wider text-dim">
            hobbies ·
          </span>
          {popularHobbies.map((h) => (
            <Link
              key={h}
              href={preserveQs(sp, { hobby: sp.hobby === h ? undefined : h })}
              className={`rounded-full px-2.5 py-1 ${
                (sp.hobby ?? "").toLowerCase() === h.toLowerCase()
                  ? "bg-brand-accent text-ink shadow-glow-accent"
                  : "border border-line bg-raised text-muted hover:text-brand-accent"
              }`}
            >
              {h}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
        <span className="text-dim">sort ·</span>
        {[
          { k: "name", l: "name" },
          { k: "department", l: "department" },
          { k: "role", l: "role" },
          { k: "newest", l: "newest" },
        ].map((s) => (
          <Link
            key={s.k}
            href={preserveQs(sp, { sort: s.k })}
            className={`rounded-full px-2.5 py-1 ${
              (sp.sort ?? "name") === s.k
                ? "border border-brand-primary/40 bg-brand-primary-950 text-brand-primary-glow"
                : "border border-line bg-raised text-muted hover:text-ink-text"
            }`}
          >
            {s.l}
          </Link>
        ))}
      </div>

      {paged.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface py-16 text-center text-muted">
          No matches.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-raised text-left font-mono text-[10px] uppercase tracking-wider text-dim">
                <th className="px-3 py-2 font-medium">Person</th>
                <th className="px-3 py-2 font-medium">Department</th>
                <th className="px-3 py-2 font-medium">Job title</th>
                <th className="px-3 py-2 font-medium">Born</th>
                <th className="px-3 py-2 font-medium">Zodiac</th>
                <th className="px-3 py-2 font-medium">Chinese sign</th>
                {adminAccess && (
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {paged.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-line/60 last:border-0 hover:bg-raised/40"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/u/${u.id}`}
                      className="flex items-center gap-2.5"
                    >
                      <Avatar name={u.name} email={u.email} size={32} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium text-ink-text hover:text-brand-primary-glow">
                            {u.name ?? u.email}
                          </span>
                          <RoleBadge role={u.role} />
                        </span>
                        <span className="block truncate font-mono text-[11px] text-dim">
                          {u.email}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {u.department ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {u.jobTitle ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted">
                    {formatDob(u.dateOfBirth)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-ink-text">
                    {sign(u.zodiac, ZODIAC_EMOJI)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-ink-text">
                    {sign(u.chineseZodiac, CHINESE_EMOJI)}
                  </td>
                  {adminAccess && (
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <ResetPinButton
                          userId={u.id}
                          name={u.name ?? u.email}
                        />
                        {u.id !== me.id &&
                          !isAdmin(u.email) &&
                          !isTechTeam(u.email) && (
                            <DeleteUserButton
                              userId={u.id}
                              name={u.name ?? u.email}
                            />
                          )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} hasNext={hasNext} sp={sp} />
    </div>
  );
}

function computePopularHobbies(rows: { hobbies: string | null }[]) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    for (const raw of (r.hobbies ?? "").split(/[,;]/)) {
      const h = raw.trim().toLowerCase();
      if (!h || h.length > 30) continue;
      counts.set(h, (counts.get(h) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([h]) => h);
}

function preserveQs(sp: Search, patch: Partial<Search>) {
  const p = new URLSearchParams();
  const merged = { ...sp, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (k === "page") continue;
    if (v == null || v === "") continue;
    p.set(k, String(v));
  }
  const qs = p.toString();
  return qs ? `/people?${qs}` : "/people";
}

function Pagination({
  page,
  hasNext,
  sp,
}: {
  page: number;
  hasNext: boolean;
  sp: Search;
}) {
  if (page === 1 && !hasNext) return null;
  function url(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "page" || v == null || v === "") continue;
      params.set(k, String(v));
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/people?${qs}` : "/people";
  }
  return (
    <nav className="flex items-center justify-between font-mono text-xs">
      <span className="text-dim">page {page}</span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={url(page - 1)}
            className="rounded-md border border-line bg-raised px-3 py-1.5 text-muted hover:text-ink-text"
          >
            ← prev
          </Link>
        ) : (
          <span className="rounded-md border border-line bg-surface px-3 py-1.5 text-dim">
            ← prev
          </span>
        )}
        {hasNext ? (
          <Link
            href={url(page + 1)}
            className="rounded-md border border-line bg-raised px-3 py-1.5 text-muted hover:text-ink-text"
          >
            next →
          </Link>
        ) : (
          <span className="rounded-md border border-line bg-surface px-3 py-1.5 text-dim">
            next →
          </span>
        )}
      </div>
    </nav>
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
