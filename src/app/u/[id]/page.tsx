import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { initiatives, subscriptions, users, comments, updates } from "@/db/schema";
import { eq, and, desc, inArray, count } from "drizzle-orm";
import { InitiativeCard } from "@/components/initiative-card";
import { Avatar } from "@/components/avatar";

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
          format: initiatives.format,
          difficulty: initiatives.difficulty,
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
      <header className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-6">
        <Avatar name={user.name} email={user.email} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{user.name ?? user.email}</h1>
          <p className="text-sm text-stone-600">
            {user.department ?? "—"} · {user.email}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Stat label="Owns" n={owned.length} />
            <Stat label="Participating" n={participating.length} />
            <Stat label="Following" n={following.length} />
            <Stat label="Comments" n={commentCount[0]?.c ?? 0} />
            <Stat label="Updates" n={updateCount[0]?.c ?? 0} />
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            user.role === "admin"
              ? "bg-brand-accent-50 text-brand-accent-dark"
              : user.role === "tech"
              ? "bg-brand-primary-50 text-brand-primary"
              : "bg-stone-200 text-stone-700"
          }`}
        >
          {user.role}
        </span>
      </header>

      <Section title="Owned" rows={owned} />
      <Section title="Participating" rows={participating} />
      <Section title="Following" rows={following} />

      {owned.length === 0 && participating.length === 0 && following.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white py-16 text-center text-stone-500">
          {(user.name ?? user.email)} hasn't joined anything yet.
        </div>
      )}
    </div>
  );
}

function Stat({ label, n }: { label: string; n: number }) {
  return (
    <span className="rounded-md bg-stone-100 px-2 py-1 text-stone-700">
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
    category: string;
    format: string;
    difficulty: string;
    timeCommitment: string | null;
    capacity: number | null;
    createdAt: Date;
    ownerName: string | null;
  }[];
}) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
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
            category={r.category as any}
            format={r.format as any}
            difficulty={r.difficulty as any}
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
