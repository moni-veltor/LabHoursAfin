import { db } from "@/lib/db";
import { initiatives, subscriptions } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { termKey, previousTermKey } from "@/lib/participation";

export async function computeStreak(userId: string) {
  const rows = await db
    .select({ joinedAt: subscriptions.joinedAt })
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

  const joinedTerms = new Set<string>();
  for (const r of rows) {
    joinedTerms.add(termKey(new Date(r.joinedAt)));
  }

  let streak = 0;
  let cursor = termKey(new Date());
  while (joinedTerms.has(cursor)) {
    streak++;
    cursor = previousTermKey(cursor);
  }
  return streak;
}
