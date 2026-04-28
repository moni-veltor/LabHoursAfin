import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { initiatives, subscriptions, users } from "@/db/schema";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { UserChip } from "@/components/avatar";
import { approveParticipant } from "@/actions/approvals";
import { approveInitiative } from "@/actions/settings";
import { DeclineForm } from "@/components/decline-form";

export default async function AdminQueuePage() {
  const session = await auth();
  const me = session?.user as { email?: string } | undefined;
  if (!me) redirect("/signin?callbackUrl=/admin/queue");
  if (!isAdmin(me.email)) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8">
        <h1 className="text-xl font-semibold">Admins only</h1>
      </div>
    );
  }

  const [pending, awaitingReview] = await Promise.all([
    db
      .select({
        userId: subscriptions.userId,
        initiativeId: subscriptions.initiativeId,
        joinedAt: subscriptions.joinedAt,
        applicationNote: subscriptions.applicationNote,
        title: initiatives.title,
        userName: users.name,
        userEmail: users.email,
      })
      .from(subscriptions)
      .innerJoin(initiatives, eq(initiatives.id, subscriptions.initiativeId))
      .innerJoin(users, eq(users.id, subscriptions.userId))
      .where(eq(subscriptions.role, "pending"))
      .orderBy(asc(subscriptions.joinedAt)),
    db
      .select({
        id: initiatives.id,
        title: initiatives.title,
        ownerId: initiatives.ownerId,
        createdAt: initiatives.createdAt,
        ownerName: users.name,
        ownerEmail: users.email,
      })
      .from(initiatives)
      .innerJoin(users, eq(users.id, initiatives.ownerId))
      .where(eq(initiatives.awaitingReview, true)),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Queue</h1>
        <p className="mt-1 text-muted">
          Cross-initiative pending applications and any initiatives awaiting
          publish review.
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Awaiting review · {awaitingReview.length}
        </h2>
        {awaitingReview.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface py-8 text-center text-sm text-muted">
            Nothing awaiting review.
          </p>
        ) : (
          <ul className="space-y-2">
            {awaitingReview.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/initiatives/${i.id}`}
                    className="font-medium text-ink-text hover:text-brand-primary-glow"
                  >
                    {i.title}
                  </Link>
                  <div className="mt-0.5 text-xs text-muted">
                    by{" "}
                    <UserChip
                      id={i.ownerId}
                      name={i.ownerName}
                      email={i.ownerEmail}
                    />
                  </div>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await approveInitiative(i.id);
                  }}
                >
                  <button className="rounded-md bg-brand-success px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-success-dark">
                    Approve & publish
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Pending applications · {pending.length}
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface py-8 text-center text-sm text-muted">
            No pending applications across the platform.
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map((p) => (
              <li
                key={`${p.initiativeId}:${p.userId}`}
                className="rounded-xl border border-line bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <UserChip
                      id={p.userId}
                      name={p.userName}
                      email={p.userEmail}
                    />
                    <div className="mt-0.5 text-xs text-muted">
                      applied to{" "}
                      <Link
                        href={`/initiatives/${p.initiativeId}`}
                        className="text-ink-text hover:text-brand-primary-glow"
                      >
                        {p.title}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <form
                      action={async () => {
                        "use server";
                        await approveParticipant(p.initiativeId, p.userId);
                      }}
                    >
                      <button className="rounded-md bg-brand-success px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-success-dark">
                        Approve
                      </button>
                    </form>
                    <DeclineForm
                      initiativeId={p.initiativeId}
                      userId={p.userId}
                    />
                  </div>
                </div>
                {p.applicationNote && (
                  <p className="mt-2 rounded-md border-l-2 border-brand-primary/40 bg-raised px-3 py-2 text-sm text-muted">
                    "{p.applicationNote}"
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
