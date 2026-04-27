import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  initiatives,
  subscriptions,
  users,
  updates,
  comments,
  initiativeTags,
  tags,
  reactions,
} from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { subscribe, unsubscribe } from "@/actions/subscriptions";
import { addComment } from "@/actions/comments";
import { postUpdate } from "@/actions/updates";
import { updateInitiativeStatus } from "@/actions/initiatives";
import {
  requestToJoin,
  approveParticipant,
  declineParticipant,
} from "@/actions/approvals";
import { postOutcome } from "@/actions/outcomes";
import { toggleFeatured } from "@/actions/admin";
import { formatDate, timeAgo } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import {
  CATEGORIES,
  DIFFICULTIES,
  EFFORTS,
  FORMATS,
  type Category,
  type Difficulty,
  type Effort,
  type Format,
} from "@/lib/categories";
import { isAdmin } from "@/lib/admin";
import { UserChip } from "@/components/avatar";
import { Reactions, REACTION_EMOJIS } from "@/components/reactions";
import { CoverImage } from "@/components/cover-image";
import { Recordings } from "@/components/recordings";
import { saveAsTemplate, unsaveAsTemplate } from "@/actions/templates";
import { generateAiSummary, draftOutcomeWithAi } from "@/actions/ai";
import { aiEnabled } from "@/lib/ai";

export default async function InitiativePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const me = session?.user as
    | { id?: string; email?: string; role?: string }
    | undefined;

  const [row] = await db
    .select({
      i: initiatives,
      ownerId: users.id,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(initiatives)
    .leftJoin(users, eq(users.id, initiatives.ownerId))
    .where(eq(initiatives.id, id));

  if (!row) notFound();
  const initiative = row.i;
  const isOwner = me?.id === initiative.ownerId;
  const adminAccess = isAdmin(me?.email);
  const canEdit = isOwner || adminAccess;

  const [subs, ups, cmts, tagRows, mySub] = await Promise.all([
    db
      .select({
        userId: subscriptions.userId,
        role: subscriptions.role,
        joinedAt: subscriptions.joinedAt,
        name: users.name,
        email: users.email,
      })
      .from(subscriptions)
      .leftJoin(users, eq(users.id, subscriptions.userId))
      .where(eq(subscriptions.initiativeId, id))
      .orderBy(desc(subscriptions.joinedAt)),
    db
      .select({
        u: updates,
        authorId: users.id,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(updates)
      .leftJoin(users, eq(users.id, updates.authorId))
      .where(eq(updates.initiativeId, id))
      .orderBy(desc(updates.createdAt)),
    db
      .select({
        c: comments,
        authorId: users.id,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.authorId))
      .where(eq(comments.initiativeId, id))
      .orderBy(desc(comments.createdAt)),
    db
      .select({ slug: tags.slug, name: tags.name })
      .from(initiativeTags)
      .innerJoin(tags, eq(tags.id, initiativeTags.tagId))
      .where(eq(initiativeTags.initiativeId, id)),
    me?.id
      ? db
          .select()
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.userId, me.id),
              eq(subscriptions.initiativeId, id)
            )
          )
      : Promise.resolve([]),
  ]);

  const updateIds = ups.map((u) => u.u.id);
  const commentIds = cmts.map((c) => c.c.id);
  const allTargets = [...updateIds, ...commentIds, initiative.id];
  const reactionRows = await db
    .select()
    .from(reactions)
    .where(inArray(reactions.targetId, allTargets));

  type RBucket = { counts: Record<string, number>; mine: Set<string> };
  const buckets = new Map<string, RBucket>();
  for (const r of reactionRows) {
    const key = `${r.targetType}:${r.targetId}`;
    let b = buckets.get(key);
    if (!b) {
      b = { counts: {}, mine: new Set() };
      buckets.set(key, b);
    }
    b.counts[r.emoji] = (b.counts[r.emoji] ?? 0) + 1;
    if (me?.id && r.userId === me.id) b.mine.add(r.emoji);
  }
  const getReactions = (
    kind: "update" | "comment" | "outcome",
    tid: string
  ): RBucket =>
    buckets.get(`${kind}:${tid}`) ?? { counts: {}, mine: new Set() };

  const participantCount = subs.filter(
    (s) => s.role === "participant" || s.role === "owner"
  ).length;
  const pending = subs.filter((s) => s.role === "pending");
  const visibleSubs = subs.filter((s) => s.role !== "pending");
  const subscribed = mySub.length > 0;
  const myRole = mySub[0]?.role;
  const capacityFull =
    initiative.capacity != null && participantCount >= initiative.capacity;

  const showcasable =
    initiative.status === "done" &&
    !!(initiative.outcomeBody || initiative.outcomeLinks);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="space-y-8">
        {initiative.coverImage && (
          <CoverImage src={initiative.coverImage} alt={initiative.title} height={240} />
        )}
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <CategoryBadge category={initiative.category as Category} />
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-700">
              {initiative.status.replace("_", " ")}
            </span>
            {initiative.featured && (
              <span className="rounded-full bg-brand-accent-50 px-2 py-0.5 font-medium text-brand-accent-dark">
                ★ Featured
              </span>
            )}
            {initiative.crossTeam && (
              <span className="rounded-full bg-brand-success-50 px-2 py-0.5 font-medium text-brand-success-dark">
                Cross-team
              </span>
            )}
            {initiative.requiresApproval && (
              <span className="rounded-full bg-brand-primary-50 px-2 py-0.5 text-brand-primary">
                Application required
              </span>
            )}
            {initiative.isTemplate && (
              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-stone-700">
                Template
              </span>
            )}
            <span className="text-stone-500">·</span>
            <span className="text-stone-500">by</span>
            <UserChip
              id={row.ownerId}
              name={row.ownerName}
              email={row.ownerEmail}
              size={18}
            />
            <span className="text-stone-500">· {formatDate(initiative.createdAt)}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{initiative.title}</h1>
          <p className="text-lg text-stone-700">{initiative.summary}</p>
          {tagRows.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tagRows.map((t) => (
                <a
                  key={t.slug}
                  href={`/?tag=${t.slug}`}
                  className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-700 hover:bg-stone-200"
                >
                  {t.name}
                </a>
              ))}
            </div>
          )}
        </header>

        <Facts initiative={initiative} participantCount={participantCount} />

        {initiative.outcomes && (
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              What you'll do / outcomes
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-stone-800">
              {initiative.outcomes}
            </p>
          </section>
        )}

        {initiative.prerequisites && (
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
              Skills helpful
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-stone-800">
              {initiative.prerequisites}
            </p>
          </section>
        )}

        {initiative.body && (
          <article className="prose-tight rounded-xl border border-stone-200 bg-white p-6 text-stone-800">
            <ReactMarkdown>{initiative.body}</ReactMarkdown>
          </article>
        )}

        <Recordings raw={initiative.recordings} />

        {canEdit && (
          <AiSummarySection
            initiative={initiative}
            aiEnabled={aiEnabled}
          />
        )}

        {(showcasable || canEdit) && (
          <OutcomeSection
            initiative={initiative}
            canEdit={!!canEdit}
            showcasable={showcasable}
            aiEnabled={aiEnabled}
            getReactions={getReactions}
            signedIn={!!me}
          />
        )}

        <section>
          <h2 className="text-lg font-semibold">Updates</h2>
          {canEdit && (
            <form
              action={postUpdate}
              className="mt-3 rounded-xl border border-stone-200 bg-white p-4"
            >
              <input type="hidden" name="initiativeId" value={initiative.id} />
              <textarea
                name="body"
                required
                rows={3}
                placeholder="Share progress with subscribers..."
                className="w-full resize-y rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
              />
              <div className="mt-2 flex justify-end">
                <button className="rounded-md bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary-dark">
                  Post update
                </button>
              </div>
            </form>
          )}
          <ul className="mt-3 space-y-3">
            {ups.length === 0 && (
              <li className="text-sm text-stone-500">No updates yet.</li>
            )}
            {ups.map(({ u, authorId, authorName, authorEmail }) => {
              const r = getReactions("update", u.id);
              return (
                <li
                  key={u.id}
                  className="rounded-xl border border-stone-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <UserChip id={authorId} name={authorName} email={authorEmail} />
                    <span>{timeAgo(u.createdAt)}</span>
                  </div>
                  <div className="mt-2 prose-tight text-sm text-stone-800">
                    <ReactMarkdown>{u.body}</ReactMarkdown>
                  </div>
                  <Reactions
                    targetType="update"
                    targetId={u.id}
                    initiativeId={initiative.id}
                    counts={r.counts}
                    mine={r.mine}
                    signedIn={!!me}
                  />
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Discussion</h2>
          {me && (
            <form
              action={addComment}
              className="mt-3 rounded-xl border border-stone-200 bg-white p-4"
            >
              <input type="hidden" name="initiativeId" value={initiative.id} />
              <textarea
                name="body"
                required
                rows={3}
                placeholder="Ask a question, share an idea..."
                className="w-full resize-y rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
              />
              <div className="mt-2 flex justify-end">
                <button className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50">
                  Comment
                </button>
              </div>
            </form>
          )}
          <ul className="mt-3 space-y-3">
            {cmts.length === 0 && (
              <li className="text-sm text-stone-500">Be the first to comment.</li>
            )}
            {cmts.map(({ c, authorId, authorName, authorEmail }) => {
              const r = getReactions("comment", c.id);
              return (
                <li key={c.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <UserChip id={authorId} name={authorName} email={authorEmail} />
                    <span>{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-stone-800">
                    {c.body}
                  </p>
                  <Reactions
                    targetType="comment"
                    targetId={c.id}
                    initiativeId={initiative.id}
                    counts={r.counts}
                    mine={r.mine}
                    signedIn={!!me}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Get involved</h3>
          {!me ? (
            <p className="mt-2 text-sm text-stone-500">Sign in to subscribe.</p>
          ) : myRole === "owner" ? (
            <p className="mt-3 text-sm text-stone-700">
              You're the owner.
            </p>
          ) : myRole === "pending" ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-stone-700">
                Application sent. Awaiting approval.
              </p>
              <form
                action={async () => {
                  "use server";
                  await unsubscribe(initiative.id);
                }}
              >
                <button className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50">
                  Withdraw application
                </button>
              </form>
            </div>
          ) : subscribed ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-stone-700">
                You're {myRole === "participant" ? "participating" : "following"}.
              </p>
              <form
                action={async () => {
                  "use server";
                  await unsubscribe(initiative.id);
                }}
              >
                <button className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50">
                  Leave
                </button>
              </form>
              {myRole === "subscriber" && !capacityFull && (
                <form
                  action={async () => {
                    "use server";
                    await requestToJoin(initiative.id);
                  }}
                >
                  <button className="w-full rounded-md bg-brand-primary px-3 py-2 text-sm font-medium text-white hover:bg-brand-primary-dark">
                    {initiative.requiresApproval
                      ? "Apply to join"
                      : "I'm in — count me as a participant"}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <form
                action={async () => {
                  "use server";
                  await subscribe(initiative.id, "subscriber");
                }}
              >
                <button className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm hover:bg-stone-50">
                  Follow updates
                </button>
              </form>
              {!capacityFull && (
                <form
                  action={async () => {
                    "use server";
                    await requestToJoin(initiative.id);
                  }}
                >
                  <button className="w-full rounded-md bg-brand-primary px-3 py-2 text-sm font-medium text-white hover:bg-brand-primary-dark">
                    {initiative.requiresApproval
                      ? "Apply to join"
                      : "Join the initiative"}
                  </button>
                </form>
              )}
              {capacityFull && (
                <p className="text-xs text-stone-500">
                  At capacity. You can still follow updates.
                </p>
              )}
            </div>
          )}
        </div>

        {canEdit && pending.length > 0 && (
          <div className="rounded-xl border border-brand-accent-100 bg-brand-accent-50 p-4">
            <h3 className="text-sm font-semibold text-brand-accent-dark">
              Pending applications ({pending.length})
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {pending.map((p) => (
                <li key={p.userId} className="flex items-center justify-between gap-2">
                  <UserChip id={p.userId} name={p.name} email={p.email} />
                  <div className="flex items-center gap-1">
                    <form
                      action={async () => {
                        "use server";
                        await approveParticipant(initiative.id, p.userId);
                      }}
                    >
                      <button className="rounded-md bg-brand-success px-2 py-1 text-xs font-medium text-white hover:bg-brand-success-dark">
                        Approve
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await declineParticipant(initiative.id, p.userId);
                      }}
                    >
                      <button className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs hover:bg-stone-50">
                        Decline
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Tools</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href={`/api/initiatives/${initiative.id}/ics`}
                className="flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 hover:border-brand-primary/40 hover:text-brand-primary"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-brand-primary" />
                Add to calendar (.ics)
              </a>
            </li>
          </ul>
        </div>

        {canEdit && (
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="text-sm font-semibold">Owner controls</h3>
            <form
              className="mt-3 space-y-2"
              action={async (fd: FormData) => {
                "use server";
                await updateInitiativeStatus(
                  initiative.id,
                  fd.get("status") as any
                );
              }}
            >
              <select
                name="status"
                defaultValue={initiative.status}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
                <option value="archived">Archived</option>
              </select>
              <button className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50">
                Update status
              </button>
            </form>
            <form
              className="mt-2"
              action={async () => {
                "use server";
                if (initiative.isTemplate) await unsaveAsTemplate(initiative.id);
                else await saveAsTemplate(initiative.id);
              }}
            >
              <button className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50">
                {initiative.isTemplate ? "Remove from templates" : "Save as template"}
              </button>
            </form>
          </div>
        )}

        {adminAccess && (
          <div className="rounded-xl border border-brand-accent-100 bg-brand-accent-50 p-4">
            <h3 className="text-sm font-semibold text-brand-accent-dark">Admin</h3>
            <form
              className="mt-3"
              action={async () => {
                "use server";
                await toggleFeatured(initiative.id);
              }}
            >
              <button className="w-full rounded-md border border-brand-accent bg-white px-3 py-1.5 text-sm font-medium text-brand-accent-dark hover:bg-brand-accent-100">
                {initiative.featured ? "Unfeature" : "★ Feature on home"}
              </button>
            </form>
          </div>
        )}

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold">
            People <span className="text-stone-500">({visibleSubs.length})</span>
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {visibleSubs.length === 0 && (
              <li className="text-stone-500">No one yet.</li>
            )}
            {visibleSubs.map((s) => (
              <li key={s.userId} className="flex items-center justify-between gap-2">
                <UserChip id={s.userId} name={s.name} email={s.email} />
                <span className="shrink-0 text-xs text-stone-500">{s.role}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function CategoryBadge({ category }: { category: Category }) {
  const c = CATEGORIES[category];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${c.badge}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function Facts({
  initiative,
  participantCount,
}: {
  initiative: any;
  participantCount: number;
}) {
  const items: { label: string; value: string }[] = [
    { label: "Format", value: FORMATS[initiative.format as Format].label },
    {
      label: "Who's it for",
      value: DIFFICULTIES[initiative.difficulty as Difficulty].label,
    },
  ];
  if (initiative.effort)
    items.push({ label: "Effort", value: EFFORTS[initiative.effort as Effort].label });
  if (initiative.timeCommitment)
    items.push({ label: "Time commitment", value: initiative.timeCommitment });
  if (initiative.subcategory)
    items.push({ label: "Area", value: initiative.subcategory });
  if (initiative.capacity != null)
    items.push({
      label: "Capacity",
      value: `${participantCount} of ${initiative.capacity} joined`,
    });

  return (
    <dl className="grid gap-3 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
            {it.label}
          </dt>
          <dd className="mt-0.5 text-sm text-stone-800">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function AiSummarySection({
  initiative,
  aiEnabled,
}: {
  initiative: any;
  aiEnabled: boolean;
}) {
  return (
    <section className="rounded-xl border border-brand-primary-100 bg-brand-primary-50 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-primary">
          AI weekly summary
        </h2>
        <form
          action={async () => {
            "use server";
            await generateAiSummary(initiative.id);
          }}
        >
          <button className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-primary-dark disabled:opacity-50">
            {initiative.aiSummary ? "Refresh summary" : "Generate summary"}
          </button>
        </form>
      </div>
      {!aiEnabled && (
        <p className="mt-2 text-xs text-brand-primary">
          AI is not configured. Set <code>ANTHROPIC_API_KEY</code> in Vercel.
        </p>
      )}
      {initiative.aiSummary ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-stone-800">
          {initiative.aiSummary}
        </p>
      ) : (
        <p className="mt-3 text-sm text-brand-primary/80">
          Click to summarise the latest updates into one paragraph.
        </p>
      )}
    </section>
  );
}

function OutcomeSection({
  initiative,
  canEdit,
  showcasable,
  aiEnabled,
  getReactions,
  signedIn,
}: {
  initiative: any;
  canEdit: boolean;
  showcasable: boolean;
  aiEnabled: boolean;
  getReactions: (kind: "update" | "comment" | "outcome", tid: string) => {
    counts: Record<string, number>;
    mine: Set<string>;
  };
  signedIn: boolean;
}) {
  return (
    <section className="rounded-xl border border-brand-success-100 bg-brand-success-50 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-success-dark">
          Outcomes
        </h2>
        {canEdit && aiEnabled && (
          <form
            action={async () => {
              "use server";
              await draftOutcomeWithAi(initiative.id);
            }}
          >
            <button className="rounded-md border border-brand-success bg-white px-2.5 py-1 text-xs font-medium text-brand-success-dark hover:bg-brand-success-100">
              ✨ Draft with AI
            </button>
          </form>
        )}
      </div>
      {showcasable ? (
        <>
          {initiative.outcomeBody && (
            <p className="mt-2 whitespace-pre-wrap text-stone-800">
              {initiative.outcomeBody}
            </p>
          )}
          {initiative.outcomeLinks && (
            <ul className="mt-3 space-y-1 text-sm">
              {initiative.outcomeLinks
                .split(/[\n,]+/)
                .map((l: string) => l.trim())
                .filter((l: string) => l.startsWith("http"))
                .map((l: string) => (
                  <li key={l}>
                    <a
                      href={l}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-success-dark underline hover:no-underline"
                    >
                      {l}
                    </a>
                  </li>
                ))}
            </ul>
          )}
          {(() => {
            const r = getReactions("outcome", initiative.id);
            return (
              <Reactions
                targetType={"outcome" as any}
                targetId={initiative.id}
                initiativeId={initiative.id}
                counts={r.counts}
                mine={r.mine}
                signedIn={signedIn}
              />
            );
          })()}
        </>
      ) : (
        <p className="mt-2 text-sm text-brand-success-dark">
          {canEdit
            ? "Wrap this up by posting what you shipped, learned, or produced."
            : "Awaiting outcome write-up."}
        </p>
      )}
      {canEdit && (
        <form action={postOutcome} className="mt-4 space-y-2">
          <input type="hidden" name="initiativeId" value={initiative.id} />
          <textarea
            name="body"
            defaultValue={initiative.outcomeBody ?? ""}
            rows={4}
            placeholder="What did you ship? What did the team learn?"
            className="w-full resize-y rounded-md border border-brand-success-100 bg-white px-3 py-2 text-sm focus:border-brand-success focus:outline-none"
          />
          <textarea
            name="links"
            defaultValue={initiative.outcomeLinks ?? ""}
            rows={2}
            placeholder="Links (one per line) — demos, docs, slides, screenshots"
            className="w-full resize-y rounded-md border border-brand-success-100 bg-white px-3 py-2 text-sm focus:border-brand-success focus:outline-none"
          />
          <div className="flex justify-end">
            <button className="rounded-md bg-brand-success px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-success-dark">
              Save outcome (marks as done)
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
