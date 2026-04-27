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
} from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { subscribe, unsubscribe } from "@/actions/subscriptions";
import { addComment } from "@/actions/comments";
import { postUpdate } from "@/actions/updates";
import { updateInitiativeStatus } from "@/actions/initiatives";
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

export default async function InitiativePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const me = session?.user as { id?: string; role?: string } | undefined;

  const [row] = await db
    .select({
      i: initiatives,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(initiatives)
    .leftJoin(users, eq(users.id, initiatives.ownerId))
    .where(eq(initiatives.id, id));

  if (!row) notFound();
  const initiative = row.i;
  const isOwner = me?.id === initiative.ownerId;
  const canEdit = isOwner || me?.role === "admin";

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
            and(eq(subscriptions.userId, me.id), eq(subscriptions.initiativeId, id))
          )
      : Promise.resolve([]),
  ]);

  const participantCount = subs.filter(
    (s) => s.role === "participant" || s.role === "owner"
  ).length;
  const subscribed = mySub.length > 0;
  const myRole = mySub[0]?.role;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="space-y-8">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <CategoryBadge category={initiative.category as Category} />
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-700">
              {initiative.status.replace("_", " ")}
            </span>
            <span className="text-stone-500">
              · by {row.ownerName ?? row.ownerEmail}
            </span>
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
                <button className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800">
                  Post update
                </button>
              </div>
            </form>
          )}
          <ul className="mt-3 space-y-3">
            {ups.length === 0 && (
              <li className="text-sm text-stone-500">No updates yet.</li>
            )}
            {ups.map(({ u, authorName, authorEmail }) => (
              <li
                key={u.id}
                className="rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>{authorName ?? authorEmail}</span>
                  <span>{timeAgo(u.createdAt)}</span>
                </div>
                <div className="mt-2 prose-tight text-sm text-stone-800">
                  <ReactMarkdown>{u.body}</ReactMarkdown>
                </div>
              </li>
            ))}
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
            {cmts.map(({ c, authorName, authorEmail }) => (
              <li key={c.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="font-medium text-stone-700">
                    {authorName ?? authorEmail}
                  </span>
                  <span>{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-stone-800">{c.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Get involved</h3>
          {!me ? (
            <p className="mt-2 text-sm text-stone-500">Sign in to subscribe.</p>
          ) : subscribed ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-stone-700">
                You're {myRole === "owner" ? "the owner" : myRole === "participant" ? "participating" : "subscribed"}.
              </p>
              {myRole !== "owner" && (
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
              )}
              {myRole === "subscriber" && (
                <form
                  action={async () => {
                    "use server";
                    await subscribe(initiative.id, "participant");
                  }}
                >
                  <button className="w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800">
                    I'm in — count me as a participant
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
              <form
                action={async () => {
                  "use server";
                  await subscribe(initiative.id, "participant");
                }}
              >
                <button className="w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800">
                  Join the initiative
                </button>
              </form>
            </div>
          )}
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
          </div>
        )}

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-sm font-semibold">
            People <span className="text-stone-500">({subs.length})</span>
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {subs.length === 0 && <li className="text-stone-500">No one yet.</li>}
            {subs.map((s) => (
              <li key={s.userId} className="flex items-center justify-between">
                <span className="truncate">{s.name ?? s.email}</span>
                <span className="text-xs text-stone-500">{s.role}</span>
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
