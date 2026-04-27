"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { initiatives, subscriptions, users, tags, initiativeTags } from "@/db/schema";
import { requireTech, requireUser } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { notifyNewInitiative } from "@/lib/email";

const InitiativeSchema = z.object({
  title: z.string().min(3).max(140),
  summary: z.string().min(10).max(280),
  body: z.string().max(20000).optional().default(""),
  status: z.enum(["draft", "open", "in_progress", "done", "archived"]).default("open"),
  capacity: z.coerce.number().int().min(1).max(500).optional(),
  timeCommitment: z.string().max(80).optional(),
  tags: z.string().max(200).optional(),
});

async function upsertTags(raw?: string) {
  if (!raw) return [] as { id: string; slug: string }[];
  const slugs = Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .map((s) => s.replace(/[^a-z0-9-]+/g, "-"))
    )
  );
  if (slugs.length === 0) return [];
  const result: { id: string; slug: string }[] = [];
  for (const slug of slugs) {
    const existing = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
    if (existing[0]) {
      result.push({ id: existing[0].id, slug });
    } else {
      const [row] = await db
        .insert(tags)
        .values({ slug, name: slug.replace(/-/g, " ") })
        .returning({ id: tags.id });
      result.push({ id: row.id, slug });
    }
  }
  return result;
}

export async function createInitiative(formData: FormData) {
  const me = await requireTech();
  const parsed = InitiativeSchema.parse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    body: formData.get("body") ?? "",
    status: formData.get("status") ?? "open",
    capacity: formData.get("capacity") || undefined,
    timeCommitment: formData.get("timeCommitment") || undefined,
    tags: formData.get("tags") || undefined,
  });

  const [created] = await db
    .insert(initiatives)
    .values({
      ownerId: me.id,
      title: parsed.title,
      summary: parsed.summary,
      body: parsed.body,
      status: parsed.status,
      capacity: parsed.capacity,
      timeCommitment: parsed.timeCommitment,
    })
    .returning();

  await db.insert(subscriptions).values({
    userId: me.id,
    initiativeId: created.id,
    role: "owner",
  });

  const tagRows = await upsertTags(parsed.tags);
  if (tagRows.length) {
    await db
      .insert(initiativeTags)
      .values(tagRows.map((t) => ({ initiativeId: created.id, tagId: t.id })));
  }

  if (parsed.status === "open") {
    const everyone = await db.select({ email: users.email }).from(users);
    await notifyNewInitiative(
      everyone.map((u) => u.email).filter((e) => e !== me.email),
      { id: created.id, title: created.title, summary: created.summary },
      process.env.AUTH_URL ?? "http://localhost:3000"
    );
  }

  revalidatePath("/");
  redirect(`/initiatives/${created.id}`);
}

export async function updateInitiativeStatus(
  initiativeId: string,
  status: "draft" | "open" | "in_progress" | "done" | "archived"
) {
  const me = await requireUser();
  const [row] = await db.select().from(initiatives).where(eq(initiatives.id, initiativeId));
  if (!row) throw new Error("NOT_FOUND");
  if (row.ownerId !== me.id && me.role !== "admin") throw new Error("FORBIDDEN");

  await db
    .update(initiatives)
    .set({ status, updatedAt: new Date() })
    .where(eq(initiatives.id, initiativeId));
  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/");
}

export async function deleteInitiative(initiativeId: string) {
  const me = await requireUser();
  const [row] = await db.select().from(initiatives).where(eq(initiatives.id, initiativeId));
  if (!row) throw new Error("NOT_FOUND");
  if (row.ownerId !== me.id && me.role !== "admin") throw new Error("FORBIDDEN");
  await db.delete(initiatives).where(eq(initiatives.id, initiativeId));
  revalidatePath("/");
  redirect("/");
}
