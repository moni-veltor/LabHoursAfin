import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { initiatives, subscriptions, users } from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { InitiativeCard } from "@/components/initiative-card";
import { isTechTeam } from "@/lib/tech-team";
import { isAdmin } from "@/lib/admin";
import { getParticipationStatus } from "@/lib/participation";
import { categoryKeyOf, getCategoryMap } from "@/lib/categories-server";
import { hourAwareGreeting } from "@/lib/greeting";
import { computeStreak } from "@/lib/streaks";

export default async function MyBoardPage() {
  const session = await auth();
  const me = session?.user as
    | { id?: string; email?: string; role?: string; name?: string }
    | undefined;
  if (!me?.id) redirect("/signin?callbackUrl=/me");

  const ruleApplies =
    me.role === "member" &&
    !isTechTeam(me.email) &&
    !isAdmin(me.email);
  const status = ruleApplies ? await getParticipationStatus(me.id) : null;
  const streak = await computeStreak(me.id);
  const greeting = hourAwareGreeting(me.name);

  const mySubs = await db
    .select({ id: subscriptions.initiativeId, role: subscriptions.role })
    .from(subscriptions)
    .where(eq(subscriptions.userId, me.id));
  const ids = mySubs.map((s) => s.id);

  if (ids.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">My board</h1>
        {status && <TermPanel status={status} />}
        <p className="text-muted">You haven't subscribed to anything yet.</p>
      </div>
    );
  }

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
      featured: initiatives.featured,
      timeCommitment: initiatives.timeCommitment,
      capacity: initiatives.capacity,
      createdAt: initiatives.createdAt,
      ownerName: users.name,
    })
    .from(initiatives)
    .leftJoin(users, eq(users.id, initiatives.ownerId))
    .where(inArray(initiatives.id, ids))
    .orderBy(desc(initiatives.createdAt));

  const catMap = await getCategoryMap();
  const fallback = catMap.get("other")!;
  const resolveCat = (r: { category: string; customCategorySlug: string | null }) => {
    const c = catMap.get(categoryKeyOf(r)) ?? fallback;
    return { label: c.label, badge: c.badge, dot: c.dot };
  };

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">
            {greeting}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">My board</h1>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span className="rounded-full border border-brand-success/40 bg-brand-success-950 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-brand-success">
              🔥 {streak} {streak === 1 ? "quarter" : "quarters"} streak
            </span>
          )}
          <a
            href="/me/portfolio"
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink-text hover:bg-line"
          >
            View my portfolio →
          </a>
        </div>
      </div>

      {status && <TermPanel status={status} />}

      <Section
        title="Owned by me"
        rows={owner.map((r) => ({ ...r, category: resolveCat(r) }))}
      />
      <Section
        title="Participating"
        rows={participating.map((r) => ({ ...r, category: resolveCat(r) }))}
      />
      <Section
        title="Following"
        rows={following.map((r) => ({ ...r, category: resolveCat(r) }))}
      />
    </div>
  );
}

function TermPanel({
  status,
}: {
  status: Awaited<ReturnType<typeof getParticipationStatus>>;
}) {
  const slotsLeft = Math.max(0, status.cap - status.activeCount);
  const atCap = slotsLeft === 0;
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-md border border-brand-primary/40 bg-brand-primary-950 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-brand-primary-glow">
          Participation
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
          {status.activeCount}/{status.cap} active
        </span>
        {status.completedCount > 0 && (
          <span className="ml-auto font-mono text-[10px] text-dim">
            {status.completedCount} completed
          </span>
        )}
      </div>
      <div className="mt-4">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          In progress right now
        </h3>
        {status.active.length === 0 ? (
          <p className="mt-2 text-xs text-dim">
            Nothing on the go. You can join up to {status.cap}.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {status.active.map((a) => (
              <li key={a.id} className="text-sm text-ink-text">
                <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-brand-primary align-middle" />
                {a.title}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-4 font-mono text-[10px] text-dim">
        {atCap
          ? `You're at the limit of ${status.cap}. Finish one (it gets marked done) to free a slot.`
          : `Rule · up to ${status.cap} initiatives at once · finish one to take on another.`}
      </p>
    </section>
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
    </section>
  );
}
