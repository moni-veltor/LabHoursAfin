"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { initiatives, updates, users } from "@/db/schema";
import { requireTech, requireUser } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { aiSummariseUpdates, aiDraftOutcome } from "@/lib/ai";

export async function generateAiSummary(initiativeId: string) {
  const me = await requireUser();
  const [row] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId));
  if (!row) throw new Error("NOT_FOUND");
  if (row.ownerId !== me.id && me.role !== "admin") throw new Error("FORBIDDEN");

  const ups = await db
    .select({
      body: updates.body,
      createdAt: updates.createdAt,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(updates)
    .leftJoin(users, eq(users.id, updates.authorId))
    .where(eq(updates.initiativeId, initiativeId))
    .orderBy(desc(updates.createdAt));

  const summary = await aiSummariseUpdates({
    title: row.title,
    summary: row.summary,
    updates: ups.map((u) => ({
      author: u.authorName ?? u.authorEmail ?? "unknown",
      body: u.body,
      at: u.createdAt.toISOString().slice(0, 10),
    })),
  });

  if (summary) {
    await db
      .update(initiatives)
      .set({ aiSummary: summary, aiSummaryAt: new Date() })
      .where(eq(initiatives.id, initiativeId));
  }
  revalidatePath(`/initiatives/${initiativeId}`);
}

export async function draftOutcomeWithAi(initiativeId: string) {
  const me = await requireUser();
  const [row] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId));
  if (!row) throw new Error("NOT_FOUND");
  if (row.ownerId !== me.id && me.role !== "admin") throw new Error("FORBIDDEN");

  const ups = await db
    .select({
      body: updates.body,
      createdAt: updates.createdAt,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(updates)
    .leftJoin(users, eq(users.id, updates.authorId))
    .where(eq(updates.initiativeId, initiativeId))
    .orderBy(desc(updates.createdAt));

  const draft = await aiDraftOutcome({
    title: row.title,
    outcomes: row.outcomes,
    updates: ups.map((u) => ({
      author: u.authorName ?? u.authorEmail ?? "unknown",
      body: u.body,
      at: u.createdAt.toISOString().slice(0, 10),
    })),
  });

  await db
    .update(initiatives)
    .set({
      outcomeBody: draft.body || row.outcomeBody,
      outcomeLinks: draft.links || row.outcomeLinks,
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  revalidatePath(`/initiatives/${initiativeId}`);
}
