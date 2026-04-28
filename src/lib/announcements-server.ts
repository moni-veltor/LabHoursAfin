import { db } from "@/lib/db";
import { announcements } from "@/db/schema";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";

export async function getActiveAnnouncement() {
  const now = new Date();
  const [row] = await db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.active, true),
        or(isNull(announcements.expiresAt), gt(announcements.expiresAt, now))
      )
    )
    .orderBy(desc(announcements.createdAt))
    .limit(1);
  return row ?? null;
}
