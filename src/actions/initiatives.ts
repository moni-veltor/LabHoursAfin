"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { initiatives, subscriptions, tags, initiativeTags } from "@/db/schema";
import { requireTech, requireUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import {
  CATEGORY_KEYS,
  DIFFICULTY_KEYS,
  EFFORT_KEYS,
  FORMAT_KEYS,
} from "@/lib/categories";

const InitiativeSchema = z.object({
  title: z.string().min(3).max(140),
  summary: z.string().min(10).max(280),
  body: z.string().max(20000).optional().default(""),
  status: z
    .enum(["draft", "open", "in_progress", "done", "archived"])
    .default("open"),
  category: z.enum(CATEGORY_KEYS as [string, ...string[]]),
  subcategory: z.string().max(80).optional(),
  format: z.enum(FORMAT_KEYS as [string, ...string[]]).default("open"),
  difficulty: z.enum(DIFFICULTY_KEYS as [string, ...string[]]).default("any"),
  effort: z
    .enum(EFFORT_KEYS as [string, ...string[]])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  outcomes: z.string().max(2000).optional(),
  prerequisites: z.string().max(1000).optional(),
  capacity: z.coerce.number().int().min(1).max(500).optional(),
  timeCommitment: z.string().max(80).optional(),
  tags: z.string().max(200).optional(),
  requiresApproval: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .optional()
    .transform((v) => v === "on" || v === "true"),
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
    const existing = await db
      .select()
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);
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

function emptyToUndef(v: FormDataEntryValue | null) {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

export async function createInitiative(formData: FormData) {
  const me = await requireTech();
  const parsed = InitiativeSchema.parse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    body: emptyToUndef(formData.get("body")) ?? "",
    status: emptyToUndef(formData.get("status")) ?? "open",
    category: formData.get("category"),
    subcategory: emptyToUndef(formData.get("subcategory")),
    format: emptyToUndef(formData.get("format")) ?? "open",
    difficulty: emptyToUndef(formData.get("difficulty")) ?? "any",
    effort: emptyToUndef(formData.get("effort")) ?? undefined,
    outcomes: emptyToUndef(formData.get("outcomes")),
    prerequisites: emptyToUndef(formData.get("prerequisites")),
    capacity: emptyToUndef(formData.get("capacity")),
    timeCommitment: emptyToUndef(formData.get("timeCommitment")),
    tags: emptyToUndef(formData.get("tags")),
    requiresApproval: (formData.get("requiresApproval") as any) ?? "",
  });

  const [created] = await db
    .insert(initiatives)
    .values({
      ownerId: me.id,
      title: parsed.title,
      summary: parsed.summary,
      body: parsed.body,
      status: parsed.status,
      category: parsed.category as any,
      subcategory: parsed.subcategory,
      format: parsed.format as any,
      difficulty: parsed.difficulty as any,
      effort: (parsed.effort as any) ?? null,
      outcomes: parsed.outcomes,
      prerequisites: parsed.prerequisites,
      capacity: parsed.capacity,
      timeCommitment: parsed.timeCommitment,
      requiresApproval: parsed.requiresApproval,
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

  revalidatePath("/");
  redirect(`/initiatives/${created.id}`);
}

export async function updateInitiativeStatus(
  initiativeId: string,
  status: "draft" | "open" | "in_progress" | "done" | "archived"
) {
  const me = await requireUser();
  const [row] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId));
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
  const [row] = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId));
  if (!row) throw new Error("NOT_FOUND");
  if (row.ownerId !== me.id && me.role !== "admin") throw new Error("FORBIDDEN");
  await db.delete(initiatives).where(eq(initiatives.id, initiativeId));
  revalidatePath("/");
  redirect("/");
}
