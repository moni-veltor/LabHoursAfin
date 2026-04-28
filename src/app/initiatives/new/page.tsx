import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isTechTeam } from "@/lib/tech-team";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { initiatives, initiativeTags, tags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NewInitiativeForm } from "@/components/new-initiative-form";
import { aiEnabled } from "@/lib/ai";
import { loadAllCategories } from "@/lib/categories-server";
import { DraftSaver } from "@/components/draft-saver";

function DraftSaverMount() {
  return (
    <DraftSaver formId="new-initiative-form" storageKey="lh-draft-new-initiative" />
  );
}

export default async function NewInitiativePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const session = await auth();
  const user = session?.user as { role?: string; email?: string } | undefined;
  if (!user) redirect("/signin?callbackUrl=/initiatives/new");
  const allowed =
    user.role === "tech" ||
    user.role === "admin" ||
    isTechTeam(user.email) ||
    isAdmin(user.email);
  if (!allowed) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8">
        <h1 className="text-xl font-semibold">Tech team only</h1>
        <p className="mt-2 text-muted">
          Only the tech team (Monica, Mohammed, Emmanuel) can post initiatives.
          Have an idea? Pitch it to one of them.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  let initial: any = { status: "open", format: "open", difficulty: "any" };
  let templateNotice: { title: string } | null = null;

  if (sp.template) {
    const [t] = await db
      .select()
      .from(initiatives)
      .where(eq(initiatives.id, sp.template));
    if (t && t.isTemplate) {
      const tagRows = await db
        .select({ slug: tags.slug })
        .from(initiativeTags)
        .innerJoin(tags, eq(tags.id, initiativeTags.tagId))
        .where(eq(initiativeTags.initiativeId, t.id));
      initial = {
        title: `${t.title} (cohort 2)`,
        summary: t.summary,
        body: t.body ?? "",
        outcomes: t.outcomes ?? "",
        prerequisites: t.prerequisites ?? "",
        category: t.category,
        subcategory: t.subcategory ?? "",
        format: t.format,
        difficulty: t.difficulty,
        effort: t.effort ?? "",
        capacity: t.capacity != null ? String(t.capacity) : "",
        timeCommitment: t.timeCommitment ?? "",
        tags: tagRows.map((tt) => tt.slug).join(", "),
        coverImage: t.coverImage ?? "",
        recordings: t.recordings ?? "",
        requiresApproval: t.requiresApproval,
        crossTeam: t.crossTeam,
        status: "open",
      };
      templateNotice = { title: t.title };
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">New initiative</h1>
      <p className="mt-1 text-muted">
        Share what the team is exploring, building, or could use help with.
      </p>
      {templateNotice && (
        <p className="mt-3 rounded-md border border-brand-accent/30 bg-brand-accent-950 px-3 py-2 text-sm text-brand-accent">
          Cloning from template: <strong>{templateNotice.title}</strong>
        </p>
      )}

      <div className="mt-6">
        <NewInitiativeForm
          initial={initial}
          aiEnabled={aiEnabled}
          categories={await loadAllCategories()}
        />
        <DraftSaverMount />
      </div>
    </div>
  );
}
