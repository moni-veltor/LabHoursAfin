import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  initiatives,
  subscriptions,
  users,
  comments,
  updates,
} from "@/db/schema";
import { and, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { Avatar } from "@/components/avatar";
import { SkillBadges } from "@/components/skill-badges";
import { PrintButton } from "@/components/print-button";
import { CATEGORIES, type Category } from "@/lib/categories";
import { formatDate } from "@/lib/utils";

export default async function PortfolioPage() {
  const session = await auth();
  const me = session?.user as { id?: string; email?: string } | undefined;
  if (!me?.id) redirect("/signin?callbackUrl=/me/portfolio");

  const [user] = await db.select().from(users).where(eq(users.id, me.id));
  if (!user) redirect("/signin");

  const mySubs = await db
    .select({ id: subscriptions.initiativeId, role: subscriptions.role })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id));
  const ids = mySubs.map((s) => s.id);

  const items = ids.length
    ? await db
        .select({
          id: initiatives.id,
          title: initiatives.title,
          summary: initiatives.summary,
          status: initiatives.status,
          category: initiatives.category,
          outcomeBody: initiatives.outcomeBody,
          createdAt: initiatives.createdAt,
        })
        .from(initiatives)
        .where(inArray(initiatives.id, ids))
        .orderBy(desc(initiatives.createdAt))
    : [];

  const [commentCount, updateCount, outcomeCount] = await Promise.all([
    db.select({ c: count() }).from(comments).where(eq(comments.authorId, user.id)),
    db.select({ c: count() }).from(updates).where(eq(updates.authorId, user.id)),
    db
      .select({ c: count() })
      .from(initiatives)
      .where(
        and(eq(initiatives.ownerId, user.id), isNotNull(initiatives.outcomeBody))
      ),
  ]);

  const owned = items.filter((i) =>
    mySubs.find((s) => s.id === i.id && s.role === "owner")
  );
  const participating = items.filter((i) =>
    mySubs.find((s) => s.id === i.id && s.role === "participant")
  );
  const following = items.filter((i) =>
    mySubs.find((s) => s.id === i.id && s.role === "subscriber")
  );

  const stats = {
    joined: participating.length,
    owned: owned.length,
    outcomesPosted: Number(outcomeCount[0]?.c ?? 0),
    comments: Number(commentCount[0]?.c ?? 0),
  };

  return (
    <div className="space-y-6 print:space-y-3">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">My portfolio</h1>
        <PrintButton />
      </div>

      <header className="flex items-center gap-4 rounded-xl border border-line bg-surface p-6">
        <Avatar name={user.name} email={user.email} size={64} />
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold tracking-tight">
            {user.name ?? user.email}
          </h2>
          <p className="text-sm text-muted">
            {user.department ?? "—"} · {user.email}
          </p>
          <p className="mt-1 text-xs text-muted">
            Lab Hours portfolio · generated {formatDate(new Date())}
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Badges
        </h2>
        <div className="mt-3">
          <SkillBadges stats={stats} />
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-line bg-surface p-6 sm:grid-cols-4">
        <Stat label="Owned" value={stats.owned} />
        <Stat label="Joined" value={stats.joined} />
        <Stat label="Outcomes shipped" value={stats.outcomesPosted} />
        <Stat label="Comments" value={stats.comments} />
      </section>

      {owned.length > 0 && (
        <Section title="Owned" rows={owned} showOutcome />
      )}
      {participating.length > 0 && <Section title="Participated" rows={participating} />}
      {following.length > 0 && <Section title="Followed" rows={following} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-brand-primary-glow">{value}</div>
    </div>
  );
}

function Section({
  title,
  rows,
  showOutcome,
}: {
  title: string;
  rows: {
    id: string;
    title: string;
    summary: string;
    status: string;
    category: string;
    outcomeBody: string | null;
    createdAt: Date;
  }[];
  showOutcome?: boolean;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <ul className="mt-3 space-y-3">
        {rows.map((r) => {
          const cat = CATEGORIES[r.category as Category];
          return (
            <li key={r.id} className="border-l-2 pl-3" style={{ borderColor: "currentColor" }}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${cat.badge}`}
                >
                  {cat.label}
                </span>
                <span>· {r.status.replace("_", " ")}</span>
                <span>· {formatDate(r.createdAt)}</span>
              </div>
              <p className="mt-1 font-medium text-ink-text">{r.title}</p>
              <p className="mt-0.5 text-sm text-muted">{r.summary}</p>
              {showOutcome && r.outcomeBody && (
                <p className="mt-2 rounded-md bg-brand-success-950 px-3 py-2 text-sm text-ink-text">
                  <span className="font-medium text-brand-success">Outcome: </span>
                  {r.outcomeBody}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
