import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { initiatives, initiativeTags, tags, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { InitiativeCard } from "@/components/initiative-card";
import { categoryKeyOf, getCategoryMap } from "@/lib/categories-server";

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [tag] = await db.select().from(tags).where(eq(tags.slug, slug));
  if (!tag) notFound();

  const rows = await db
    .select({
      id: initiatives.id,
      title: initiatives.title,
      summary: initiatives.summary,
      status: initiatives.status,
      category: initiatives.category,
      customCategorySlug: initiatives.customCategorySlug,
      format: initiatives.format,
      difficulty: initiatives.difficulty,
      coverImage: initiatives.coverImage,
      crossTeam: initiatives.crossTeam,
      timeCommitment: initiatives.timeCommitment,
      capacity: initiatives.capacity,
      featured: initiatives.featured,
      createdAt: initiatives.createdAt,
      ownerName: users.name,
    })
    .from(initiativeTags)
    .innerJoin(initiatives, eq(initiatives.id, initiativeTags.initiativeId))
    .leftJoin(users, eq(users.id, initiatives.ownerId))
    .where(eq(initiativeTags.tagId, tag.id))
    .orderBy(desc(initiatives.createdAt));

  const map = await getCategoryMap();

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          tag
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">#{tag.name}</h1>
        <p className="mt-1 text-muted">
          {rows.length} initiative{rows.length === 1 ? "" : "s"}
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface py-12 text-center text-muted">
          Nothing tagged with #{tag.name}.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <InitiativeCard
              key={r.id}
              id={r.id}
              title={r.title}
              summary={r.summary}
              status={r.status}
              category={categoryKeyOf(r) as any}
              format={r.format as any}
              difficulty={r.difficulty as any}
              coverImage={r.coverImage}
              crossTeam={r.crossTeam}
              ownerName={r.ownerName}
              timeCommitment={r.timeCommitment}
              capacity={r.capacity}
              participantCount={0}
              createdAt={r.createdAt}
              tags={[]}
              featured={r.featured}
            />
          ))}
        </div>
      )}
    </div>
  );
}
