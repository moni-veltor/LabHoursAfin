"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { customCategories, initiatives } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";

const PALETTE = [
  { badge: "bg-cyan-500/10 text-cyan-300 border-cyan-400/30", dot: "bg-cyan-500" },
  { badge: "bg-pink-500/10 text-pink-300 border-pink-400/30", dot: "bg-pink-500" },
  { badge: "bg-lime-500/10 text-lime-300 border-lime-400/30", dot: "bg-lime-500" },
  { badge: "bg-orange-500/10 text-orange-300 border-orange-400/30", dot: "bg-orange-500" },
  { badge: "bg-teal-500/10 text-teal-300 border-teal-400/30", dot: "bg-teal-500" },
  { badge: "bg-violet-500/10 text-violet-300 border-violet-400/30", dot: "bg-violet-500" },
];

const CategorySchema = z.object({
  label: z.string().min(2).max(48),
  blurb: z.string().max(160).optional(),
  swatch: z.coerce.number().int().min(0).max(PALETTE.length - 1).default(0),
});

function slugify(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function createCustomCategory(formData: FormData) {
  const me = await requireAdmin();
  const parsed = CategorySchema.parse({
    label: formData.get("label"),
    blurb: (formData.get("blurb") as string) || undefined,
    swatch: formData.get("swatch") ?? 0,
  });
  const slug = slugify(parsed.label);
  if (!slug) throw new Error("INVALID_LABEL");
  const palette = PALETTE[parsed.swatch];
  await db
    .insert(customCategories)
    .values({
      slug,
      label: parsed.label,
      blurb: parsed.blurb,
      badge: palette.badge,
      dot: palette.dot,
      createdBy: me.id,
    })
    .onConflictDoNothing();
  await logAudit(me.id, "category.create", { type: "category", id: slug }, parsed);
  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function deleteCustomCategory(slug: string) {
  const me = await requireAdmin();
  const inUse = await db
    .select({ id: initiatives.id })
    .from(initiatives)
    .where(eq(initiatives.customCategorySlug, slug))
    .limit(1);
  if (inUse.length > 0) {
    throw new Error("CATEGORY_IN_USE");
  }
  await db.delete(customCategories).where(eq(customCategories.slug, slug));
  await logAudit(me.id, "category.delete", { type: "category", id: slug });
  revalidatePath("/admin/categories");
  revalidatePath("/");
}
