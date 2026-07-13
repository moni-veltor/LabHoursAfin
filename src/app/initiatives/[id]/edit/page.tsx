import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { initiatives, initiativeTags, tags, users } from "@/db/schema";
import { eq, inArray, or } from "drizzle-orm";
import { loadAllCategories } from "@/lib/categories-server";
import { EditInitiativeForm } from "@/components/edit-initiative-form";
import { formatLondonInput } from "@/lib/tz";

export default async function EditInitiativePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const me = session?.user as
    | { id?: string; email?: string; role?: string }
    | undefined;
  if (!me?.id) redirect(`/signin?callbackUrl=/initiatives/${id}/edit`);

  const [t] = await db.select().from(initiatives).where(eq(initiatives.id, id));
  if (!t) notFound();

  const adminAccess = isAdmin(me.email);
  const canEdit = t.ownerId === me.id || adminAccess;
  if (!canEdit) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8">
        <h1 className="text-xl font-semibold">You can't edit this</h1>
        <p className="mt-2 text-muted">
          Only the owner or an admin can edit this initiative.
        </p>
        <Link
          href={`/initiatives/${id}`}
          className="mt-3 inline-block text-sm text-brand-primary-glow hover:underline"
        >
          ← Back to initiative
        </Link>
      </div>
    );
  }

  const tagRows = await db
    .select({ slug: tags.slug })
    .from(initiativeTags)
    .innerJoin(tags, eq(tags.id, initiativeTags.tagId))
    .where(eq(initiativeTags.initiativeId, t.id));

  const candidateOwners = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(or(eq(users.role, "tech"), eq(users.role, "admin")));

  const initial = {
    id: t.id,
    title: t.title,
    summary: t.summary,
    body: t.body ?? "",
    outcomes: t.outcomes ?? "",
    prerequisites: t.prerequisites ?? "",
    category: t.customCategorySlug ?? t.category,
    subcategory: t.subcategory ?? "",
    format: t.format,
    difficulty: t.difficulty,
    effort: t.effort ?? "",
    capacity: t.capacity != null ? String(t.capacity) : "",
    timeCommitment: t.timeCommitment ?? "",
    subscriptionsOpenAt: t.subscriptionsOpenAt
      ? formatLondonInput(new Date(t.subscriptionsOpenAt))
      : "",
    tags: tagRows.map((tt) => tt.slug).join(", "),
    coverImage: t.coverImage ?? "",
    recordings: t.recordings ?? "",
    lessonsLearned: t.lessonsLearned ?? "",
    requiresApproval: t.requiresApproval,
    crossTeam: t.crossTeam,
    status: t.status,
    ownerId: t.ownerId,
  };

  const categories = await loadAllCategories();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Edit initiative</h1>
        <Link
          href={`/initiatives/${id}`}
          className="rounded-md border border-line bg-raised px-3 py-1.5 text-sm text-muted hover:text-ink-text"
        >
          ← Back
        </Link>
      </div>
      <p className="mt-1 text-muted">
        Editing <span className="text-ink-text">{t.title}</span>.
      </p>

      <EditInitiativeForm
        initial={initial}
        categories={categories}
        candidateOwners={candidateOwners}
        canReassign={adminAccess}
      />
    </div>
  );
}
