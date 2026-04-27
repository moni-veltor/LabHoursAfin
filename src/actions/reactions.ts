"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { reactions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

const ALLOWED_EMOJIS = ["🎉", "❤️", "👍", "🔥", "💡"] as const;
type Emoji = (typeof ALLOWED_EMOJIS)[number];

export async function toggleReaction(
  targetType: "update" | "comment",
  targetId: string,
  emoji: string,
  initiativeId: string
) {
  const me = await requireUser();
  if (!ALLOWED_EMOJIS.includes(emoji as Emoji)) throw new Error("BAD_EMOJI");

  const existing = await db
    .select()
    .from(reactions)
    .where(
      and(
        eq(reactions.userId, me.id),
        eq(reactions.targetType, targetType),
        eq(reactions.targetId, targetId),
        eq(reactions.emoji, emoji)
      )
    );

  if (existing.length > 0) {
    await db
      .delete(reactions)
      .where(
        and(
          eq(reactions.userId, me.id),
          eq(reactions.targetType, targetType),
          eq(reactions.targetId, targetId),
          eq(reactions.emoji, emoji)
        )
      );
  } else {
    await db.insert(reactions).values({
      userId: me.id,
      targetType,
      targetId,
      emoji,
    });
  }

  revalidatePath(`/initiatives/${initiativeId}`);
}
