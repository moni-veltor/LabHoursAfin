import Link from "next/link";
import { db } from "@/lib/db";
import { initiatives, users } from "@/db/schema";
import { and, desc, eq, isNotNull, or } from "drizzle-orm";
import { CATEGORIES, type Category } from "@/lib/categories";
import { formatDate } from "@/lib/utils";

export default async function ShowcasePage() {
  const rows = await db
    .select({
      id: initiatives.id,
      title: initiatives.title,
      summary: initiatives.summary,
      category: initiatives.category,
      outcomeBody: initiatives.outcomeBody,
      outcomeLinks: initiatives.outcomeLinks,
      updatedAt: initiatives.updatedAt,
      ownerId: initiatives.ownerId,
      ownerName: users.name,
    })
    .from(initiatives)
    .leftJoin(users, eq(users.id, initiatives.ownerId))
    .where(
      and(
        eq(initiatives.status, "done"),
        or(isNotNull(initiatives.outcomeBody), isNotNull(initiatives.outcomeLinks))
      )
    )
    .orderBy(desc(initiatives.updatedAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Showcase</h1>
        <p className="mt-1 text-muted">
          What we shipped, learned, or wrapped up. The wall of done.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface py-16 text-center text-muted">
          Nothing on the wall yet — owners post outcomes when they wrap an initiative.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const cat = CATEGORIES[r.category as Category];
            const links = (r.outcomeLinks ?? "")
              .split(/[\n,]+/)
              .map((s) => s.trim())
              .filter((s) => s.startsWith("http"));
            return (
              <Link
                key={r.id}
                href={`/initiatives/${r.id}`}
                className="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 transition hover:border-line hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${cat.dot}`} />
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cat.badge}`}>
                    {cat.label}
                  </span>
                  <span className="ml-auto text-xs text-dim">
                    {formatDate(r.updatedAt)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight group-hover:underline">
                  {r.title}
                </h3>
                <p className="text-sm text-muted line-clamp-3">{r.summary}</p>
                {r.outcomeBody && (
                  <p className="rounded-md border-l-2 border-brand-success bg-brand-success-950 px-3 py-2 text-xs text-ink-text line-clamp-4">
                    {r.outcomeBody}
                  </p>
                )}
                {links.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {links.slice(0, 3).map((l) => (
                      <span
                        key={l}
                        className="truncate rounded-md bg-raised px-2 py-0.5 text-xs text-muted"
                      >
                        {new URL(l).hostname}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-auto text-xs text-muted">
                  by {r.ownerName ?? "—"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
