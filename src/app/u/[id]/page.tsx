import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { initiatives, subscriptions, users, comments, updates } from "@/db/schema";
import { eq, and, desc, inArray, count } from "drizzle-orm";
import { InitiativeCard } from "@/components/initiative-card";
import { Avatar } from "@/components/avatar";
import { SkillBadges } from "@/components/skill-badges";
import Link from "next/link";
import { categoryKeyOf, getCategoryMap } from "@/lib/categories-server";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) notFound();

  const mySubs = await db
    .select({ id: subscriptions.initiativeId, role: subscriptions.role })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id));

  const ids = mySubs.map((s) => s.id);

  const rows = ids.length
    ? await db
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
          featured: initiatives.featured,
          outcomeBody: initiatives.outcomeBody,
          timeCommitment: initiatives.timeCommitment,
          capacity: initiatives.capacity,
          createdAt: initiatives.createdAt,
          ownerName: users.name,
        })
        .from(initiatives)
        .leftJoin(users, eq(users.id, initiatives.ownerId))
        .where(inArray(initiatives.id, ids))
        .orderBy(desc(initiatives.createdAt))
    : [];

  const catMap = await getCategoryMap();
  const fallback = catMap.get("other")!;
  const resolveCat = (r: { category: string; customCategorySlug: string | null }) => {
    const c = catMap.get(categoryKeyOf(r)) ?? fallback;
    return { label: c.label, badge: c.badge, dot: c.dot };
  };

  const owned = rows.filter((r) =>
    mySubs.find((s) => s.id === r.id && s.role === "owner")
  );
  const participating = rows.filter((r) =>
    mySubs.find((s) => s.id === r.id && s.role === "participant")
  );
  const following = rows.filter((r) =>
    mySubs.find((s) => s.id === r.id && s.role === "subscriber")
  );

  const [commentCount, updateCount] = await Promise.all([
    db.select({ c: count() }).from(comments).where(eq(comments.authorId, user.id)),
    db.select({ c: count() }).from(updates).where(eq(updates.authorId, user.id)),
  ]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-6">
        <Avatar name={user.name} email={user.email} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{user.name ?? user.email}</h1>
          {user.jobTitle && (
            <p className="text-sm text-ink-text">{user.jobTitle}</p>
          )}
          <p className="text-sm text-muted">
            {user.department ?? "—"} · {user.email}
          </p>
          {user.hobbies && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.hobbies
                .split(/[,;]/)
                .map((h) => h.trim())
                .filter(Boolean)
                .map((h) => (
                  <span
                    key={h}
                    className="rounded-full border border-line bg-raised px-2 py-0.5 font-mono text-[10px] text-muted"
                  >
                    {h.toLowerCase()}
                  </span>
                ))}
            </div>
          )}
          {user.bio && (
            <p className="mt-3 text-sm text-ink-text/90">{user.bio}</p>
          )}
          {user.askMeAbout && (
            <p className="mt-2 text-xs text-muted">
              <span className="font-mono uppercase tracking-wider text-dim">
                ask me about ·
              </span>{" "}
              {user.askMeAbout}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Stat label="Owns" n={owned.length} />
            <Stat label="Participating" n={participating.length} />
            <Stat label="Following" n={following.length} />
            <Stat label="Comments" n={Number(commentCount[0]?.c ?? 0)} />
            <Stat label="Updates" n={Number(updateCount[0]?.c ?? 0)} />
          </div>
          <div className="mt-3">
            <SkillBadges
              stats={{
                joined: participating.length,
                owned: owned.length,
                outcomesPosted: rows.filter(
                  (r) =>
                    r.outcomeBody &&
                    mySubs.find((s) => s.id === r.id && s.role === "owner")
                ).length,
                comments: Number(commentCount[0]?.c ?? 0),
              }}
            />
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            user.role === "admin"
              ? "bg-brand-accent-950 text-brand-accent"
              : user.role === "tech"
              ? "bg-brand-primary-950 text-brand-primary-glow"
              : "bg-raised text-ink-text"
          }`}
        >
          {user.role}
        </span>
      </header>

      <Section
        title="Owned"
        rows={owned.map((r) => ({ ...r, category: resolveCat(r) }))}
      />
      <Section
        title="Participating"
        rows={participating.map((r) => ({ ...r, category: resolveCat(r) }))}
      />
      <Section
        title="Following"
        rows={following.map((r) => ({ ...r, category: resolveCat(r) }))}
      />

      {owned.length === 0 && participating.length === 0 && following.length === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-surface py-16 text-center text-muted">
          {(user.name ?? user.email)} hasn't joined anything yet.
        </div>
      )}
    </div>
  );
}

function Stat({ label, n }: { label: string; n: number }) {
  return (
    <span className="rounded-md bg-raised px-2 py-1 text-ink-text">
      <strong className="font-semibold">{n}</strong> {label}
    </span>
  );
}

function Section({
  title,
  rows,
}: {
  title: string;
  rows: {
    id: string;
    title: string;
    summary: string;
    status: string;
    category: { label: string; badge: string; dot: string };
    format: string;
    difficulty: string;
    coverImage: string | null;
    crossTeam: boolean;
    featured: boolean;
    timeCommitment: string | null;
    capacity: number | null;
    createdAt: Date;
    ownerName: string | null;
  }[];
}) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <InitiativeCard
            key={r.id}
            id={r.id}
            title={r.title}
            summary={r.summary}
            status={r.status}
            category={r.category}
            format={r.format as any}
            difficulty={r.difficulty as any}
            coverImage={r.coverImage}
            crossTeam={r.crossTeam}
            featured={r.featured}
            ownerName={r.ownerName}
            timeCommitment={r.timeCommitment}
            capacity={r.capacity}
            participantCount={0}
            createdAt={r.createdAt}
            tags={[]}
          />
        ))}
      </div>
    </section>
  );
}
