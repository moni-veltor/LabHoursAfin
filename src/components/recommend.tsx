import Link from "next/link";
import { db } from "@/lib/db";
import { initiatives, subscriptions, users } from "@/db/schema";
import { and, desc, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { CATEGORIES, type Category } from "@/lib/categories";

export async function RecommendStrip({ userId }: { userId: string }) {
  const mySubs = await db
    .select({
      initiativeId: subscriptions.initiativeId,
      category: initiatives.category,
    })
    .from(subscriptions)
    .leftJoin(initiatives, eq(initiatives.id, subscriptions.initiativeId))
    .where(eq(subscriptions.userId, userId));

  const subscribedIds = mySubs.map((s) => s.initiativeId);
  const myCategoryCounts = new Map<string, number>();
  for (const s of mySubs) {
    if (s.category)
      myCategoryCounts.set(s.category, (myCategoryCounts.get(s.category) ?? 0) + 1);
  }
  const preferredCats = Array.from(myCategoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);

  const baseFilters = [
    eq(initiatives.status, "open"),
  ];
  if (subscribedIds.length > 0) {
    baseFilters.push(notInArray(initiatives.id, subscribedIds));
  }

  const recs = await db
    .select({
      id: initiatives.id,
      title: initiatives.title,
      summary: initiatives.summary,
      category: initiatives.category,
      ownerName: users.name,
    })
    .from(initiatives)
    .leftJoin(users, eq(users.id, initiatives.ownerId))
    .where(and(...baseFilters))
    .orderBy(
      preferredCats.length
        ? sql`CASE WHEN ${initiatives.category}::text = ANY(${preferredCats}) THEN 0 ELSE 1 END, ${initiatives.createdAt} DESC`
        : desc(initiatives.createdAt)
    )
    .limit(3);

  if (recs.length === 0) return null;

  return (
    <section className="rounded-xl border border-brand-primary-100 bg-brand-primary-50 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-primary">
          For you
        </h2>
        <span className="text-xs text-brand-primary/70">
          Based on what you've joined
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {recs.map((r) => {
          const cat = CATEGORIES[r.category as Category];
          return (
            <Link
              key={r.id}
              href={`/initiatives/${r.id}`}
              className="group block rounded-lg bg-white p-3 transition hover:shadow-sm"
            >
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.badge}`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${cat.dot}`} />
                {cat.label}
              </span>
              <h3 className="mt-2 line-clamp-2 text-sm font-semibold tracking-tight group-hover:text-brand-primary">
                {r.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-stone-600">{r.summary}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
