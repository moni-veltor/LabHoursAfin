import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isTechTeam } from "@/lib/tech-team";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  comments,
  initiatives,
  subscriptions,
  updates,
  users,
} from "@/db/schema";
import { count, desc, eq, inArray, sql } from "drizzle-orm";
import { CATEGORIES, type Category } from "@/lib/categories";
import { categoryKeyOf, getCategoryMap } from "@/lib/categories-server";
import { timeAgo } from "@/lib/utils";

export default async function OwnerPage() {
  const session = await auth();
  const me = session?.user as { id?: string; email?: string; role?: string } | undefined;
  if (!me?.id) redirect("/signin?callbackUrl=/owner");
  const allowed =
    me.role === "tech" ||
    me.role === "admin" ||
    isTechTeam(me.email) ||
    isAdmin(me.email);
  if (!allowed) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8">
        <h1 className="text-xl font-semibold">Tech team only</h1>
      </div>
    );
  }

  const owned = await db
    .select()
    .from(initiatives)
    .where(eq(initiatives.ownerId, me.id))
    .orderBy(desc(initiatives.updatedAt));

  const ids = owned.map((o) => o.id);
  const categoryMap = await getCategoryMap();

  const [pending, lastUpdates, lastComments, subs] = await Promise.all([
    ids.length
      ? db
          .select({
            initiativeId: subscriptions.initiativeId,
            n: count(),
          })
          .from(subscriptions)
          .where(eq(subscriptions.role, "pending"))
          .groupBy(subscriptions.initiativeId)
      : Promise.resolve([]),
    ids.length
      ? db
          .select({
            initiativeId: updates.initiativeId,
            createdAt: sql<Date>`MAX(${updates.createdAt})`,
          })
          .from(updates)
          .groupBy(updates.initiativeId)
      : Promise.resolve([]),
    ids.length
      ? db
          .select({
            initiativeId: comments.initiativeId,
            n: count(),
          })
          .from(comments)
          .groupBy(comments.initiativeId)
      : Promise.resolve([]),
    ids.length
      ? db
          .select({
            initiativeId: subscriptions.initiativeId,
            role: subscriptions.role,
            n: count(),
          })
          .from(subscriptions)
          .groupBy(subscriptions.initiativeId, subscriptions.role)
      : Promise.resolve([]),
  ]);

  const pendingMap = new Map(pending.map((p) => [p.initiativeId, Number(p.n)]));
  const lastUpdateMap = new Map(
    lastUpdates.map((u) => [u.initiativeId, u.createdAt as unknown as Date])
  );
  const commentMap = new Map(
    lastComments.map((c) => [c.initiativeId, Number(c.n)])
  );
  const subMap = new Map<string, { participants: number; subscribers: number; pending: number }>();
  for (const s of subs) {
    const e = subMap.get(s.initiativeId) ?? {
      participants: 0,
      subscribers: 0,
      pending: 0,
    };
    if (s.role === "participant" || s.role === "owner") e.participants += Number(s.n);
    else if (s.role === "subscriber") e.subscribers += Number(s.n);
    else if (s.role === "pending") e.pending += Number(s.n);
    subMap.set(s.initiativeId, e);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Owner dashboard</h1>
        <p className="mt-1 text-muted">
          Health check on initiatives you own.
        </p>
      </div>

      {owned.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface py-12 text-center text-muted">
          You don't own any initiatives yet. <Link href="/initiatives/new" className="text-brand-primary-glow hover:underline">Post one</Link>.
        </div>
      ) : (
        <ul className="space-y-3">
          {owned.map((i) => {
            const catKey = categoryKeyOf(i);
            const cat = categoryMap.get(catKey);
            const counts = subMap.get(i.id) ?? {
              participants: 0,
              subscribers: 0,
              pending: 0,
            };
            const lastUpdate = lastUpdateMap.get(i.id);
            const daysSinceUpdate = lastUpdate
              ? Math.floor(
                  (Date.now() - new Date(lastUpdate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : null;
            const suggestion = suggestNextAction(i, counts, daysSinceUpdate);
            return (
              <li
                key={i.id}
                className="rounded-xl border border-line bg-surface p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {cat && (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cat.badge}`}
                    >
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${cat.dot}`} />
                      {cat.label}
                    </span>
                  )}
                  <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                    {i.status.replace("_", " ")}
                  </span>
                  <Link
                    href={`/initiatives/${i.id}`}
                    className="ml-auto rounded-md border border-line bg-raised px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink-text"
                  >
                    open →
                  </Link>
                </div>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">
                  <Link
                    href={`/initiatives/${i.id}`}
                    className="hover:text-brand-primary-glow"
                  >
                    {i.title}
                  </Link>
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <Stat
                    label="Participants"
                    value={`${counts.participants}${i.capacity ? `/${i.capacity}` : ""}`}
                  />
                  <Stat label="Subscribers" value={counts.subscribers} />
                  <Stat
                    label="Pending"
                    value={counts.pending}
                    tone={counts.pending > 0 ? "accent" : "muted"}
                  />
                  <Stat
                    label="Comments"
                    value={commentMap.get(i.id) ?? 0}
                  />
                </div>
                <p className="mt-3 text-xs text-muted">
                  {lastUpdate ? (
                    <>Last update {timeAgo(new Date(lastUpdate))}</>
                  ) : (
                    "No updates yet"
                  )}
                </p>
                {suggestion && (
                  <div className="mt-3 rounded-md border border-brand-primary/30 bg-brand-primary-950 px-3 py-2 text-sm text-brand-primary-glow">
                    {suggestion}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function suggestNextAction(
  i: any,
  counts: { participants: number; subscribers: number; pending: number },
  daysSinceUpdate: number | null
): string | null {
  if (i.status === "archived" || i.status === "done") return null;
  if (counts.pending > 0)
    return `${counts.pending} pending application${counts.pending === 1 ? "" : "s"} — review them.`;
  if (daysSinceUpdate == null && counts.participants > 0)
    return "Post your first update — participants are waiting.";
  if (daysSinceUpdate != null && daysSinceUpdate > 14)
    return `${daysSinceUpdate} days since last update — keep momentum, post one.`;
  if (i.status === "in_progress" && counts.participants >= (i.capacity ?? 1))
    return "Looking ready to wrap? Post outcomes to mark done.";
  return null;
}

function Stat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string | number;
  tone?: "muted" | "accent";
}) {
  const cls =
    tone === "accent"
      ? "border-brand-accent/40 bg-brand-accent-950 text-brand-accent"
      : "border-line bg-raised text-ink-text";
  return (
    <div className={`rounded-md border ${cls} p-2`}>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-base font-semibold">{value}</div>
    </div>
  );
}
