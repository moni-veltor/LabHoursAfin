import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { customCategories, initiatives } from "@/db/schema";
import { count, eq, desc } from "drizzle-orm";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/categories";
import {
  createCustomCategory,
  deleteCustomCategory,
} from "@/actions/categories";

const PALETTE = [
  { label: "Cyan", dot: "bg-cyan-500" },
  { label: "Pink", dot: "bg-pink-500" },
  { label: "Lime", dot: "bg-lime-500" },
  { label: "Orange", dot: "bg-orange-500" },
  { label: "Teal", dot: "bg-teal-500" },
  { label: "Violet", dot: "bg-violet-500" },
];

export default async function AdminCategoriesPage() {
  const session = await auth();
  const me = session?.user as { email?: string } | undefined;
  if (!me) redirect("/signin?callbackUrl=/admin/categories");
  if (!isAdmin(me.email)) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8">
        <h1 className="text-xl font-semibold">Admins only</h1>
      </div>
    );
  }

  const [customs, builtinCounts, customCounts] = await Promise.all([
    db.select().from(customCategories).orderBy(desc(customCategories.createdAt)),
    db
      .select({ key: initiatives.category, n: count() })
      .from(initiatives)
      .groupBy(initiatives.category),
    db
      .select({ key: initiatives.customCategorySlug, n: count() })
      .from(initiatives)
      .groupBy(initiatives.customCategorySlug),
  ]);

  const builtinMap = new Map(builtinCounts.map((b) => [b.key, Number(b.n)]));
  const customMap = new Map(
    customCounts.filter((c) => c.key).map((c) => [c.key as string, Number(c.n)])
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="mt-1 text-muted">
          The seven built-in categories are fixed. Add new ones for your
          organisation here. They become available everywhere category is selected.
        </p>
      </div>

      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Add a category
        </h2>
        <form action={createCustomCategory} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-muted">
                Label
              </label>
              <input
                name="label"
                required
                placeholder="e.g. Customer experience"
                className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-muted">
                Color
              </label>
              <select
                name="swatch"
                defaultValue="0"
                className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
              >
                {PALETTE.map((p, i) => (
                  <option key={p.label} value={i}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-muted">
              Short description (optional)
            </label>
            <input
              name="blurb"
              maxLength={160}
              placeholder="One line that explains what this category covers"
              className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
          </div>
          <button className="rounded-md bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary-dark">
            + Add category
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Built-in (locked)
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {CATEGORY_KEYS.map((k) => {
            const meta = CATEGORIES[k];
            const n = builtinMap.get(k) ?? 0;
            return (
              <li
                key={k}
                className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3"
              >
                <span className={`inline-block h-2 w-2 rounded-full ${meta.dot}`} />
                <span className="font-medium text-ink-text">{meta.label}</span>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-dim">
                  {n} initiative{n === 1 ? "" : "s"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Custom
        </h2>
        {customs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-surface py-10 text-center text-sm text-muted">
            No custom categories yet. Add one above.
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {customs.map((c) => {
              const n = customMap.get(c.slug) ?? 0;
              return (
                <li
                  key={c.slug}
                  className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3"
                >
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${c.dot ?? "bg-stone-500"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink-text">{c.label}</span>
                      <span className="font-mono text-[10px] text-dim">
                        /{c.slug}
                      </span>
                    </div>
                    {c.blurb && (
                      <p className="text-xs text-muted">{c.blurb}</p>
                    )}
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
                    {n}
                  </span>
                  <form
                    action={async () => {
                      "use server";
                      await deleteCustomCategory(c.slug);
                    }}
                  >
                    <button
                      className="rounded-md border border-line bg-raised px-2 py-1 text-xs text-muted hover:text-rose-300"
                      title={
                        n > 0
                          ? "Cannot delete: in use"
                          : "Delete this category"
                      }
                      disabled={n > 0}
                    >
                      Delete
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
