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
import { customCategories } from "@/db/schema";
import { getBoolSetting } from "@/lib/settings-server";
import { slugify } from "@/lib/slug";

async function uniqueSlug(base: string, excludeId?: string) {
  const candidate = base || "initiative";
  const existing = await db
    .select({ id: initiatives.id, slug: initiatives.slug })
    .from(initiatives);
  const taken = new Set(
    existing
      .filter((r) => r.id !== excludeId && r.slug)
      .map((r) => r.slug as string)
  );
  if (!taken.has(candidate)) return candidate;
  for (let i = 2; i < 100; i++) {
    const next = `${candidate}-${i}`;
    if (!taken.has(next)) return next;
  }
  return `${candidate}-${Date.now()}`;
}

const InitiativeSchema = z.object({
  title: z.string().min(3).max(140),
  summary: z.string().min(10).max(280),
  body: z.string().max(20000).optional().default(""),
  status: z
    .enum(["draft", "open", "in_progress", "done", "archived"])
    .default("open"),
  categoryKey: z.string().min(1),
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
  crossTeam: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .optional()
    .transform((v) => v === "on" || v === "true"),
  coverImage: z.string().max(500).optional(),
  recordings: z.string().max(2000).optional(),
  lessonsLearned: z.string().max(4000).optional(),
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
    categoryKey: formData.get("category"),
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
    crossTeam: (formData.get("crossTeam") as any) ?? "",
    coverImage: emptyToUndef(formData.get("coverImage")),
    recordings: emptyToUndef(formData.get("recordings")),
    lessonsLearned: emptyToUndef(formData.get("lessonsLearned")),
  });

  let category: string = "other";
  let customCategorySlug: string | null = null;
  if ((CATEGORY_KEYS as string[]).includes(parsed.categoryKey)) {
    category = parsed.categoryKey;
  } else {
    const [c] = await db
      .select()
      .from(customCategories)
      .where(eq(customCategories.slug, parsed.categoryKey));
    if (!c) throw new Error("UNKNOWN_CATEGORY");
    customCategorySlug = c.slug;
    category = "other";
  }

  const requirePrePublish = await getBoolSetting(
    "prepublish_review",
    false
  );
  const status =
    requirePrePublish && parsed.status === "open" ? "draft" : parsed.status;
  const awaitingReview = requirePrePublish && parsed.status === "open";
  const slug = await uniqueSlug(slugify(parsed.title));

  const [created] = await db
    .insert(initiatives)
    .values({
      ownerId: me.id,
      title: parsed.title,
      summary: parsed.summary,
      body: parsed.body,
      status,
      slug,
      category: category as any,
      customCategorySlug,
      subcategory: parsed.subcategory,
      format: parsed.format as any,
      difficulty: parsed.difficulty as any,
      effort: (parsed.effort as any) ?? null,
      outcomes: parsed.outcomes,
      prerequisites: parsed.prerequisites,
      capacity: parsed.capacity,
      timeCommitment: parsed.timeCommitment,
      requiresApproval: parsed.requiresApproval,
      crossTeam: parsed.crossTeam,
      awaitingReview,
      coverImage: parsed.coverImage,
      recordings: parsed.recordings,
      lessonsLearned: parsed.lessonsLearned,
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

export async function updateInitiative(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get("id"));
  const [row] = await db.select().from(initiatives).where(eq(initiatives.id, id));
  if (!row) throw new Error("NOT_FOUND");
  if (row.ownerId !== me.id && me.role !== "admin") throw new Error("FORBIDDEN");

  const parsed = InitiativeSchema.parse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    body: emptyToUndef(formData.get("body")) ?? "",
    status: emptyToUndef(formData.get("status")) ?? row.status,
    categoryKey: formData.get("category"),
    subcategory: emptyToUndef(formData.get("subcategory")),
    format: emptyToUndef(formData.get("format")) ?? row.format,
    difficulty: emptyToUndef(formData.get("difficulty")) ?? row.difficulty,
    effort: emptyToUndef(formData.get("effort")) ?? undefined,
    outcomes: emptyToUndef(formData.get("outcomes")),
    prerequisites: emptyToUndef(formData.get("prerequisites")),
    capacity: emptyToUndef(formData.get("capacity")),
    timeCommitment: emptyToUndef(formData.get("timeCommitment")),
    tags: emptyToUndef(formData.get("tags")),
    requiresApproval: (formData.get("requiresApproval") as any) ?? "",
    crossTeam: (formData.get("crossTeam") as any) ?? "",
    coverImage: emptyToUndef(formData.get("coverImage")),
    recordings: emptyToUndef(formData.get("recordings")),
    lessonsLearned: emptyToUndef(formData.get("lessonsLearned")),
  });

  let category: string = "other";
  let customCategorySlug: string | null = null;
  if ((CATEGORY_KEYS as string[]).includes(parsed.categoryKey)) {
    category = parsed.categoryKey;
  } else {
    const [c] = await db
      .select()
      .from(customCategories)
      .where(eq(customCategories.slug, parsed.categoryKey));
    if (!c) throw new Error("UNKNOWN_CATEGORY");
    customCategorySlug = c.slug;
    category = "other";
  }

  const newOwnerId = emptyToUndef(formData.get("ownerId"));
  let ownerId = row.ownerId;
  if (newOwnerId && newOwnerId !== row.ownerId) {
    if (me.role !== "admin") throw new Error("ONLY_ADMIN_CAN_REASSIGN");
    ownerId = newOwnerId;
  }

  const slug =
    row.slug && row.title === parsed.title
      ? row.slug
      : await uniqueSlug(slugify(parsed.title), id);

  await db
    .update(initiatives)
    .set({
      ownerId,
      title: parsed.title,
      summary: parsed.summary,
      body: parsed.body,
      status: parsed.status,
      slug,
      category: category as any,
      customCategorySlug,
      subcategory: parsed.subcategory ?? null,
      format: parsed.format as any,
      difficulty: parsed.difficulty as any,
      effort: (parsed.effort as any) ?? null,
      outcomes: parsed.outcomes ?? null,
      prerequisites: parsed.prerequisites ?? null,
      capacity: parsed.capacity ?? null,
      timeCommitment: parsed.timeCommitment ?? null,
      requiresApproval: parsed.requiresApproval,
      crossTeam: parsed.crossTeam,
      coverImage: parsed.coverImage ?? null,
      recordings: parsed.recordings ?? null,
      lessonsLearned: parsed.lessonsLearned ?? null,
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, id));

  if (newOwnerId && newOwnerId !== row.ownerId) {
    await db
      .insert(subscriptions)
      .values({ userId: newOwnerId, initiativeId: id, role: "owner" })
      .onConflictDoUpdate({
        target: [subscriptions.userId, subscriptions.initiativeId],
        set: { role: "owner" },
      });
  }

  revalidatePath(`/initiatives/${id}`);
  revalidatePath("/owner");
  redirect(`/initiatives/${id}`);
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
