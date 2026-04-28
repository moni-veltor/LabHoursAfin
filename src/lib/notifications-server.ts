import { db } from "@/lib/db";
import { notifications, users } from "@/db/schema";
import { and, count, eq, isNull } from "drizzle-orm";

export async function notify(input: {
  userId: string;
  kind: string;
  message: string;
  url?: string;
  initiativeId?: string;
  sourceUserId?: string;
}) {
  if (input.userId === input.sourceUserId) return;
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      kind: input.kind,
      message: input.message,
      url: input.url,
      initiativeId: input.initiativeId,
      sourceUserId: input.sourceUserId,
    });
  } catch (e) {
    console.error("[notify] failed:", e);
  }
}

export async function unreadCount(userId: string) {
  const r = await db
    .select({ c: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return Number(r[0]?.c ?? 0);
}

export async function findUserIdsForMentions(text: string) {
  const handles = Array.from(
    new Set(
      Array.from(text.matchAll(/(?:^|\s)@([a-zA-Z][a-zA-Z0-9._-]{1,40})/g)).map(
        (m) => m[1].toLowerCase()
      )
    )
  );
  if (handles.length === 0) return [] as { id: string; email: string }[];
  const all = await db.select({ id: users.id, email: users.email }).from(users);
  return all.filter((u) => {
    const handle = u.email.split("@")[0].toLowerCase();
    return handles.includes(handle);
  });
}
