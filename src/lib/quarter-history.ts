import { db } from "@/lib/db";
import { initiatives, subscriptions } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { termKey } from "@/lib/participation";

export async function getQuarterHistory(userId: string) {
  const rows = await db
    .select({
      joinedAt: subscriptions.joinedAt,
      category: initiatives.category,
      custom: initiatives.customCategorySlug,
    })
    .from(subscriptions)
    .innerJoin(initiatives, eq(initiatives.id, subscriptions.initiativeId))
    .where(
      and(
        eq(subscriptions.userId, userId),
        or(
          eq(subscriptions.role, "participant"),
          eq(subscriptions.role, "owner")
        )
      )
    );
  const byTerm = new Map<string, Set<string>>();
  for (const r of rows) {
    const key = termKey(new Date(r.joinedAt));
    const k = r.custom ?? r.category;
    if (!byTerm.has(key)) byTerm.set(key, new Set());
    byTerm.get(key)!.add(k);
  }
  return Array.from(byTerm.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([termKey, set]) => ({ termKey, categories: Array.from(set) }));
}
