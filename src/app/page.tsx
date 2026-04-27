import { db } from "@/lib/db";
import {
  initiatives,
  subscriptions,
  users,
  initiativeTags,
  tags,
} from "@/db/schema";
import { eq, desc, ne, inArray, and, or, ilike, sql } from "drizzle-orm";
import { InitiativeCard } from "@/components/initiative-card";
import Link from "next/link";
import {
  CATEGORIES,
  CATEGORY_KEYS,
  type Category,
} from "@/lib/categories";
import { SearchInput } from "@/components/search-input";

type Search = {
  status?: string;
  tag?: string;
  category?: string;
  q?: string;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;

  const filters = [ne(initiatives.status, "archived")];
  if (sp.status) filters.push(eq(initiatives.status, sp.status as any));
  if (sp.category && (CATEGORY_KEYS as string[]).includes(sp.category)) {
    filters.push(eq(initiatives.category, sp.category as any));
  }
  if (sp.q && sp.q.trim().length > 0) {
    const q = `%${sp.q.trim()}%`;
    filters.push(
      sql`(${ilike(initiatives.title, q)} OR ${ilike(initiatives.summary, q)} OR ${ilike(
        initiatives.subcategory,
        q
      )})`
    );
  }

  let initiativeIds: string[] | null = null;
  if (sp.tag) {
    const taggedRows = await db
      .select({ id: initiativeTags.initiativeId })
      .from(initiativeTags)
      .innerJoin(tags, eq(tags.id, initiativeTags.tagId))
      .where(eq(tags.slug, sp.tag));
    initiativeIds = taggedRows.map((r) => r.id);
    if (initiativeIds.length === 0) {
      return <EmptyState message={`No initiatives tagged "${sp.tag}".`} />;
    }
  }

  const where =
    initiativeIds != null
      ? and(...filters, inArray(initiatives.id, initiativeIds))
      : and(...filters);

  const rows = await db
    .select({
      id: initiatives.id,
      title: initiatives.title,
      summary: initiatives.summary,
      status: initiatives.status,
      category: initiatives.category,
      format: initiatives.format,
      difficulty: initiatives.difficulty,
      featured: initiatives.featured,
      timeCommitment: initiatives.timeCommitment,
      capacity: initiatives.capacity,
      createdAt: initiatives.createdAt,
      ownerName: users.name,
    })
    .from(initiatives)
    .leftJoin(users, eq(users.id, initiatives.ownerId))
    .where(where)
    .orderBy(desc(initiatives.featured), desc(initiatives.createdAt));

  const ids = rows.map((r) => r.id);
  const [counts, allTags] = await Promise.all([
    ids.length
      ? db
          .select({ id: subscriptions.initiativeId, role: subscriptions.role })
          .from(subscriptions)
          .where(inArray(subscriptions.initiativeId, ids))
      : Promise.resolve([]),
    ids.length
      ? db
          .select({ id: initiativeTags.initiativeId, slug: tags.slug })
          .from(initiativeTags)
          .innerJoin(tags, eq(tags.id, initiativeTags.tagId))
          .where(inArray(initiativeTags.initiativeId, ids))
      : Promise.resolve([]),
  ]);

  const participantCount = new Map<string, number>();
  for (const c of counts) {
    if (c.role === "participant" || c.role === "owner") {
      participantCount.set(c.id, (participantCount.get(c.id) ?? 0) + 1);
    }
  }
  const tagsByInitiative = new Map<string, string[]>();
  for (const t of allTags) {
    const arr = tagsByInitiative.get(t.id) ?? [];
    arr.push(t.slug);
    tagsByInitiative.set(t.id, arr);
  }

  const featured = rows.filter((r) => r.featured);
  const rest = rows.filter((r) => !r.featured);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lab Hours</h1>
        <p className="mt-1 text-stone-600">
          Initiatives the tech team is exploring. Subscribe to follow along, or
          join the ones you want in on.
        </p>
      </div>

      <SearchInput q={sp.q} />
      <CategoryTabs current={sp.category} />
      <StatusBar current={sp} />

      {featured.length > 0 && (
        <section>
          <h2 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-brand-accent-dark">
            <span>★</span> Featured
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {featured.map((r) => (
              <InitiativeCard
                key={r.id}
                id={r.id}
                title={r.title}
                summary={r.summary}
                status={r.status}
                category={r.category as Category}
                format={r.format as any}
                difficulty={r.difficulty as any}
                ownerName={r.ownerName}
                timeCommitment={r.timeCommitment}
                capacity={r.capacity}
                participantCount={participantCount.get(r.id) ?? 0}
                createdAt={r.createdAt}
                tags={tagsByInitiative.get(r.id) ?? []}
                featured
              />
            ))}
          </div>
        </section>
      )}

      {rest.length === 0 && featured.length === 0 ? (
        <EmptyState message="No initiatives match these filters." />
      ) : rest.length > 0 ? (
        <section>
          {featured.length > 0 && (
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
              All initiatives
            </h2>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {rest.map((r) => (
              <InitiativeCard
                key={r.id}
                id={r.id}
                title={r.title}
                summary={r.summary}
                status={r.status}
                category={r.category as Category}
                format={r.format as any}
                difficulty={r.difficulty as any}
                ownerName={r.ownerName}
                timeCommitment={r.timeCommitment}
                capacity={r.capacity}
                participantCount={participantCount.get(r.id) ?? 0}
                createdAt={r.createdAt}
                tags={tagsByInitiative.get(r.id) ?? []}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CategoryTabs({ current }: { current?: string }) {
  return (
    <div className="-mx-1 flex flex-wrap gap-1 overflow-x-auto pb-1 text-sm">
      <Tab href="/" active={!current}>
        All
      </Tab>
      {CATEGORY_KEYS.map((k) => (
        <Tab
          key={k}
          href={`/?category=${k}`}
          active={current === k}
          dotClass={CATEGORIES[k].dot}
        >
          {CATEGORIES[k].label}
        </Tab>
      ))}
    </div>
  );
}

function Tab({
  href,
  active,
  dotClass,
  children,
}: {
  href: string;
  active: boolean;
  dotClass?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
        active
          ? "bg-brand-primary text-white"
          : "border border-stone-200 bg-white text-stone-700 hover:border-brand-primary/40"
      }`}
    >
      {dotClass && (
        <span
          className={`inline-block h-2 w-2 rounded-full ${dotClass} ${
            active ? "opacity-90" : ""
          }`}
        />
      )}
      <span>{children}</span>
    </Link>
  );
}

function StatusBar({ current }: { current: Search }) {
  const statuses = ["open", "in_progress", "done"];
  const base = current.category ? `&category=${current.category}` : "";
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Link
        href={current.category ? `/?category=${current.category}` : "/"}
        className={`rounded-full px-3 py-1 ${
          !current.status
            ? "bg-brand-primary-100 text-brand-primary"
            : "bg-white border border-stone-200 text-stone-600"
        }`}
      >
        Any status
      </Link>
      {statuses.map((s) => (
        <Link
          key={s}
          href={`/?status=${s}${base}`}
          className={`rounded-full px-3 py-1 ${
            current.status === s
              ? "bg-brand-primary-100 text-brand-primary"
              : "bg-white border border-stone-200 text-stone-600"
          }`}
        >
          {s.replace("_", " ")}
        </Link>
      ))}
      {current.tag && (
        <span className="ml-2 rounded-full bg-stone-100 px-3 py-1 text-stone-700">
          #{current.tag}{" "}
          <Link href="/" className="ml-1 text-stone-500">
            ×
          </Link>
        </span>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white py-16 text-center">
      <p className="text-stone-500">{message}</p>
    </div>
  );
}
