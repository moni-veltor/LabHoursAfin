import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isTechTeam } from "@/lib/tech-team";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { initiatives, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { CATEGORIES, FORMATS, type Category, type Format } from "@/lib/categories";
import { unsaveAsTemplate } from "@/actions/templates";

export default async function TemplatesPage() {
  const session = await auth();
  const me = session?.user as { email?: string; role?: string } | undefined;
  if (!me) redirect("/signin?callbackUrl=/templates");
  const allowed =
    me.role === "tech" ||
    me.role === "admin" ||
    isTechTeam(me.email) ||
    isAdmin(me.email);
  if (!allowed) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-semibold">Tech team only</h1>
        <p className="mt-2 text-stone-600">
          Templates are for the tech team to reuse cohort patterns.
        </p>
      </div>
    );
  }

  const rows = await db
    .select({
      id: initiatives.id,
      title: initiatives.title,
      summary: initiatives.summary,
      category: initiatives.category,
      format: initiatives.format,
      timeCommitment: initiatives.timeCommitment,
      ownerName: users.name,
    })
    .from(initiatives)
    .leftJoin(users, eq(users.id, initiatives.ownerId))
    .where(eq(initiatives.isTemplate, true))
    .orderBy(desc(initiatives.updatedAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
        <p className="mt-1 text-stone-600">
          Patterns that worked. Clone one to start a new cohort with the same shape.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white py-16 text-center text-stone-500">
          No templates yet. Open any initiative you've shipped and click "Save as template".
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => {
            const cat = CATEGORIES[r.category as Category];
            return (
              <li
                key={r.id}
                className="rounded-xl border border-stone-200 bg-white p-5"
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${cat.dot}`} />
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${cat.badge}`}
                  >
                    {cat.label}
                  </span>
                  <span className="ml-auto rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                    {FORMATS[r.format as Format].label}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">{r.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-stone-600">{r.summary}</p>
                <p className="mt-2 text-xs text-stone-500">
                  by {r.ownerName ?? "—"}
                  {r.timeCommitment && <> · {r.timeCommitment}</>}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={`/initiatives/new?template=${r.id}`}
                    className="rounded-md bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary-dark"
                  >
                    Use this template
                  </Link>
                  <Link
                    href={`/initiatives/${r.id}`}
                    className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
                  >
                    Preview
                  </Link>
                  <form
                    className="ml-auto"
                    action={async () => {
                      "use server";
                      await unsaveAsTemplate(r.id);
                    }}
                  >
                    <button className="text-xs text-stone-500 hover:text-stone-900">
                      Remove from templates
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
