import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { initiatives, subscriptions, users } from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { InitiativeCard } from "@/components/initiative-card";

export default async function MyBoardPage() {
  const session = await auth();
  const me = session?.user as { id?: string } | undefined;
  if (!me?.id) redirect("/signin?callbackUrl=/me");

  const mySubs = await db
    .select({ id: subscriptions.initiativeId, role: subscriptions.role })
    .from(subscriptions)
    .where(eq(subscriptions.userId, me.id));
  const ids = mySubs.map((s) => s.id);

  if (ids.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">My board</h1>
        <p className="text-stone-600">You haven't subscribed to anything yet.</p>
      </div>
    );
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
    .where(inArray(initiatives.id, ids))
    .orderBy(desc(initiatives.createdAt));

  const owner = rows.filter((r) =>
    mySubs.find((s) => s.id === r.id && s.role === "owner")
  );
  const participating = rows.filter((r) =>
    mySubs.find((s) => s.id === r.id && s.role === "participant")
  );
  const following = rows.filter((r) =>
    mySubs.find((s) => s.id === r.id && s.role === "subscriber")
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">My board</h1>

      <Section title="Owned by me" rows={owner} />
      <Section title="Participating" rows={participating} />
      <Section title="Following" rows={following} />
    </div>
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
