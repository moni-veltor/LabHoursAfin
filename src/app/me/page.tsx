import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { initiatives, subscriptions, users } from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { InitiativeCard } from "@/components/initiative-card";
import { isTechTeam } from "@/lib/tech-team";
import { isAdmin } from "@/lib/admin";
import {
  getParticipationStatus,
  TERM_CAP,
  termRange,
  formatTermStart,
  nextTermKey,
} from "@/lib/participation";
import { CATEGORIES, type Category } from "@/lib/categories";

export default async function MyBoardPage() {
  const session = await auth();
  const me = session?.user as
    | { id?: string; email?: string; role?: string }
    | undefined;
  if (!me?.id) redirect("/signin?callbackUrl=/me");

  const ruleApplies =
    me.role === "member" &&
    !isTechTeam(me.email) &&
    !isAdmin(me.email);
  const status = ruleApplies ? await getParticipationStatus(me.id) : null;

  const mySubs = await db
    .select({ id: subscriptions.initiativeId, role: subscriptions.role })
    .from(subscriptions)
    .where(eq(subscriptions.userId, me.id));
  const ids = mySubs.map((s) => s.id);

  if (ids.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">My board</h1>
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
      format: initiatives.format,
      difficulty: initiatives.difficulty,
      coverImage: initiatives.coverImage,
      crossTeam: initiatives.crossTeam,
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">My board</h1>
        <a
          href="/me/portfolio"
          className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink-text hover:bg-line"
        >
          View my portfolio →
        </a>
      </div>

      {status && <TermPanel status={status} />}

      <Section title="Owned by me" rows={owner} />
      <Section title="Participating" rows={participating} />
      <Section title="Following" rows={following} />
    </div>
  );
}

function TermPanel({
  status,
}: {
  status: Awaited<ReturnType<typeof getParticipationStatus>>;
}) {
  const slotsLeft = Math.max(0, TERM_CAP - status.currentSlotsUsed);
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-md border border-brand-primary/40 bg-brand-primary-950 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-brand-primary-glow">
          {status.currentLabel}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
          {status.currentSlotsUsed}/{TERM_CAP} slots used
        </span>
        <span className="ml-auto font-mono text-[10px] text-dim">
          next term · {status.nextStart}
        </span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            This term · joined
          </h3>
          {status.currentCategories.length === 0 ? (
            <p className="mt-2 text-xs text-dim">
              No categories yet. {slotsLeft} slots open this term.
            </p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {status.currentCategories.map((c) => (
                <CatPill key={c} c={c} tone="primary" />
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Locked this term · from {status.previousLabel}
          </h3>
          {status.previousCategories.length === 0 ? (
            <p className="mt-2 text-xs text-dim">
              Nothing locked. You participated in no categories last term.
            </p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {status.previousCategories.map((c) => (
                <CatPill key={c} c={c} tone="locked" />
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="mt-4 font-mono text-[10px] text-dim">
        Rule · 2 initiatives per quarter · different categories · no repeats from
        the previous quarter
      </p>
    </section>
  );
}

function CatPill({
  c,
  tone,
}: {
  c: Category;
  tone: "primary" | "locked";
}) {
  const meta = CATEGORIES[c];
  const cls =
    tone === "locked"
      ? "border-brand-accent/30 bg-brand-accent-950 text-brand-accent"
      : "border-brand-primary/30 bg-brand-primary-950 text-brand-primary-glow";
  return (
    <li
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cls}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </li>
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
    coverImage: string | null;
    crossTeam: boolean;
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
            category={r.category as any}
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
          />
        ))}
      </div>
    </section>
  );
}
