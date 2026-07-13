import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hackathons } from "@/db/schema";
import { desc } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";

const STAGE_LABEL: Record<string, string> = {
  draft: "draft",
  idea: "pitching ideas",
  team_forming: "forming teams",
  build: "building",
  demo: "demo day",
  voting: "voting",
  done: "wrapped",
};

const STAGE_TONE: Record<string, string> = {
  draft: "border-line bg-raised text-muted",
  idea: "border-brand-primary/40 bg-brand-primary-950 text-brand-primary-glow",
  team_forming:
    "border-brand-primary/40 bg-brand-primary-950 text-brand-primary-glow",
  build: "border-brand-accent/40 bg-brand-accent-950 text-brand-accent",
  demo: "border-brand-accent/40 bg-brand-accent-950 text-brand-accent",
  voting: "border-brand-success/40 bg-brand-success-950 text-brand-success",
  done: "border-line bg-raised text-muted",
};

export default async function HackIndexPage() {
  const session = await auth();
  const me = session?.user as { email?: string } | undefined;
  if (!me) redirect("/signin?callbackUrl=/hack");
  const adminAccess = isAdmin(me.email);

  const rows = await db
    .select()
    .from(hackathons)
    .orderBy(desc(hackathons.createdAt));

  const live = rows.filter(
    (r) => r.stage !== "done" && r.stage !== "draft"
  );
  const past = rows.filter((r) => r.stage === "done");
  const drafts = rows.filter((r) => r.stage === "draft");

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-brand-accent/30 bg-surface">
        <div className="lh-mesh absolute inset-0 opacity-90" />
        <div className="lh-grid-bg absolute inset-0 opacity-30" />
        <div className="relative px-5 py-8 sm:px-7 sm:py-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-accent/40 bg-brand-accent-950 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-brand-accent backdrop-blur">
            🔥 hack arena
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Hackathons
          </h1>
          <p className="mt-2 max-w-xl text-muted">
            Time-boxed company-wide builds. Pitch ideas, form teams, ship demos,
            vote, win bragging rights.
          </p>
          {adminAccess && (
            <Link
              href="/hack/new"
              className="mt-5 inline-flex rounded-md bg-brand-accent px-4 py-2 text-sm font-medium text-ink shadow-glow-accent hover:bg-brand-accent-dark"
            >
              + Create hackathon
            </Link>
          )}
        </div>
      </header>

      {live.length > 0 && (
        <Section title="Live & upcoming">
          <Grid rows={live} />
        </Section>
      )}

      {past.length > 0 && (
        <Section title="Wrapped">
          <Grid rows={past} />
        </Section>
      )}

      {adminAccess && drafts.length > 0 && (
        <Section title="Drafts (admin)">
          <Grid rows={drafts} />
        </Section>
      )}

      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-surface py-16 text-center text-muted">
          No hackathons yet.{" "}
          {adminAccess && (
            <Link href="/hack/new" className="text-brand-accent hover:underline">
              Create the first one →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({ rows }: { rows: any[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((h) => (
        <Link
          key={h.id}
          href={`/hack/${h.slug}`}
          className="group relative block overflow-hidden rounded-xl border border-line bg-surface transition hover:border-brand-accent/40 hover:shadow-glow-accent"
        >
          {h.coverImage && (
            <div
              className="h-32 w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${h.coverImage})` }}
            />
          )}
          <div className="p-5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STAGE_TONE[h.stage]}`}
            >
              {STAGE_LABEL[h.stage]}
            </span>
            <h3 className="mt-2 text-lg font-semibold tracking-tight group-hover:text-brand-accent">
              {h.name}
            </h3>
            {h.theme && (
              <p className="mt-1 line-clamp-2 text-sm text-muted">{h.theme}</p>
            )}
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-dim">
              {h.startsAt
                ? new Date(h.startsAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })
                : "one-day event · date tbc"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
