import { cache } from "react";
import { db } from "@/lib/db";
import { customCategories } from "@/db/schema";
import { CATEGORIES, type Category } from "@/lib/categories";

export type CategoryMeta = {
  key: string;
  label: string;
  blurb: string;
  badge: string;
  dot: string;
  isCustom: boolean;
  sortOrder: number;
};

const DEFAULT_BADGE = "bg-stone-500/10 text-stone-300 border-stone-400/30";
const DEFAULT_DOT = "bg-stone-500";

export const loadAllCategories = cache(async (): Promise<CategoryMeta[]> => {
  const rows = await db.select().from(customCategories);
  const builtins = (Object.keys(CATEGORIES) as Category[]).map((k, i) => ({
    key: k,
    label: CATEGORIES[k].label,
    blurb: CATEGORIES[k].blurb,
    badge: CATEGORIES[k].badge,
    dot: CATEGORIES[k].dot,
    isCustom: false,
    sortOrder: i,
  }));
  const customs = rows.map((r) => ({
    key: r.slug,
    label: r.label,
    blurb: r.blurb ?? "",
    badge: r.badge ?? DEFAULT_BADGE,
    dot: r.dot ?? DEFAULT_DOT,
    isCustom: true,
    sortOrder: r.sortOrder ?? 100,
  }));
  return [...builtins, ...customs].sort((a, b) => a.sortOrder - b.sortOrder);
});

export const getCategoryMap = cache(async () => {
  const all = await loadAllCategories();
  const m = new Map<string, CategoryMeta>();
  for (const c of all) m.set(c.key, c);
  return m;
});

export function categoryKeyOf(initiative: {
  category: string;
  customCategorySlug?: string | null;
}) {
  return initiative.customCategorySlug ?? initiative.category;
}
