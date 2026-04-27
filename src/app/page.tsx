import { db } from "@/lib/db";
import { initiatives, subscriptions, users, initiativeTags, tags } from "@/db/schema";
import { eq, desc, ne, inArray, and } from "drizzle-orm";
import { InitiativeCard } from "@/components/initiative-card";
import Link from "next/link";

type Search = { status?: string; tag?: string };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;

  const where = sp.status
    ? eq(initiatives.status, sp.status as any)
    : ne(initiatives.status, "archived");

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

  const rows = await db
    .select({
      id: initiatives.id,
      title: initiatives.title,
      summary: initiatives.summary,
      status: initiatives.status,
      timeCommitment: initiatives.timeCommitment,
      capacity: initiatives.capacity,
      createdAt: initiatives.createdAt,
      ownerName: users.name,
    })
    .from(initiatives)
    .leftJoin(users, eq(users.id, initiatives.ownerId))
    .where(initiativeIds ? and(where, inArray(initiatives.id, initiativeIds)) : where)
    .orderBy(desc(initiatives.createdAt));

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lab Board</h1>
        <p className="mt-1 text-stone-600">
          Initiatives the tech team is exploring. Subscribe to the ones you want in on.
        </p>
      </div>

      <FilterBar current={sp} />

      {rows.length === 0 ? (
        <EmptyState message="No initiatives yet." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <InitiativeCard
              key={r.id}
              id={r.id}
              title={r.title}
              summary={r.summary}
              status={r.status}
              ownerName={r.ownerName}
              timeCommitment={r.timeCommitment}
              capacity={r.capacity}
              participantCount={participantCount.get(r.id) ?? 0}
              createdAt={r.createdAt}
              tags={tagsByInitiative.get(r.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBar({ current }: { current: Search }) {
  const statuses = ["open", "in_progress", "done"];
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Link
        href="/"
        className={`rounded-full px-3 py-1 ${!current.status ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-700"}`}
      >
        All
      </Link>
      {statuses.map((s) => (
        <Link
          key={s}
          href={`/?status=${s}`}
          className={`rounded-full px-3 py-1 ${current.status === s ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-700"}`}
        >
          {s.replace("_", " ")}
        </Link>
      ))}
      {current.tag && (
        <span className="ml-2 rounded-full bg-stone-100 px-3 py-1 text-stone-700">
          #{current.tag} <Link href="/" className="ml-1 text-stone-500">×</Link>
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
