import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  initiatives,
  subscriptions,
  tags,
  initiativeTags,
  users,
} from "@/db/schema";
import { count, eq, desc, sql, gte } from "drizzle-orm";
import { CATEGORIES, type Category } from "@/lib/categories";

export default async function AdminPage() {
  const session = await auth();
  const me = session?.user as { email?: string } | undefined;
  if (!me) redirect("/signin?callbackUrl=/admin");
  if (!isAdmin(me.email)) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8">
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="mt-2 text-muted">
          You don't have access to the admin dashboard.
        </p>
      </div>
    );
  }

  const sinceDate = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000);
  const [byCategory, byStatus, byDept, topTags, totals, recent, weekly, conversion] =
    await Promise.all([
      db
        .select({
          category: initiatives.category,
          n: count(),
        })
        .from(initiatives)
        .groupBy(initiatives.category),
      db
        .select({
          status: initiatives.status,
          n: count(),
        })
        .from(initiatives)
        .groupBy(initiatives.status),
      db
        .select({
          dept: users.department,
          n: count(),
        })
        .from(subscriptions)
        .innerJoin(users, eq(users.id, subscriptions.userId))
        .groupBy(users.department),
      db
        .select({
          name: tags.name,
          slug: tags.slug,
          n: count(),
        })
        .from(initiativeTags)
        .innerJoin(tags, eq(tags.id, initiativeTags.tagId))
        .groupBy(tags.name, tags.slug)
        .orderBy(desc(count()))
        .limit(10),
      Promise.all([
        db.select({ n: count() }).from(initiatives),
        db.select({ n: count() }).from(users),
        db.select({ n: count() }).from(subscriptions),
        db
          .select({ n: count() })
          .from(initiatives)
          .where(eq(initiatives.status, "done")),
      ]),
      db
        .select({
          id: initiatives.id,
          title: initiatives.title,
          status: initiatives.status,
          createdAt: initiatives.createdAt,
        })
        .from(initiatives)
        .orderBy(desc(initiatives.createdAt))
        .limit(8),
      db
        .select({
          week: sql<string>`to_char(date_trunc('week', ${initiatives.createdAt}), 'YYYY-MM-DD')`,
          n: count(),
        })
        .from(initiatives)
        .where(gte(initiatives.createdAt, sinceDate))
        .groupBy(sql`date_trunc('week', ${initiatives.createdAt})`)
        .orderBy(sql`date_trunc('week', ${initiatives.createdAt})`),
      db
        .select({
          role: subscriptions.role,
          n: count(),
        })
        .from(subscriptions)
        .groupBy(subscriptions.role),
    ]);

  const t = {
    initiatives: Number(totals[0][0]?.n ?? 0),
    users: Number(totals[1][0]?.n ?? 0),
    subscriptions: Number(totals[2][0]?.n ?? 0),
    done: Number(totals[3][0]?.n ?? 0),
  };

  const subscribers = conversion.find((c) => c.role === "subscriber")?.n ?? 0;
  const participants = conversion.find((c) => c.role === "participant")?.n ?? 0;
  const totalEngaged = Number(subscribers) + Number(participants);
  const participationRate =
    totalEngaged > 0 ? Math.round((Number(participants) / totalEngaged) * 100) : 0;
  const completionRate = t.initiatives > 0 ? Math.round((t.done / t.initiatives) * 100) : 0;
  const avgPerInit = t.initiatives > 0 ? (t.subscriptions / t.initiatives).toFixed(1) : "0";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="mt-1 text-muted">
          Quick stats on engagement and where Lab Hours is being used.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat label="Initiatives" value={t.initiatives} />
        <Stat label="People (signed in)" value={t.users} />
        <Stat label="Subscriptions" value={t.subscriptions} />
        <Stat label="Completion rate" value={`${completionRate}%`} />
        <Stat label="Participation rate" value={`${participationRate}%`} />
        <Stat label="Avg / initiative" value={avgPerInit} />
      </section>

      <Card title="New initiatives per week (last 12 weeks)">
        <Sparkline rows={weekly.map((w) => ({ label: w.week, value: Number(w.n) }))} />
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card title="By category">
          <BarList
            rows={byCategory.map((b) => ({
              label: CATEGORIES[b.category as Category]?.label ?? b.category,
              value: Number(b.n),
              dot: CATEGORIES[b.category as Category]?.dot,
            }))}
          />
        </Card>
        <Card title="By status">
          <BarList
            rows={byStatus.map((b) => ({
              label: b.status.replace("_", " "),
              value: Number(b.n),
            }))}
          />
        </Card>
        <Card title="Subscriptions by department">
          <BarList
            rows={byDept.map((b) => ({
              label: b.dept ?? "—",
              value: Number(b.n),
            }))}
          />
        </Card>
        <Card title="Top tags">
          <BarList
            rows={topTags.map((t) => ({
              label: t.name,
              value: Number(t.n),
            }))}
          />
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card title="Engagement averages">
          <ul className="space-y-2 text-sm text-ink-text">
            <li>
              Avg subscribers per initiative:{" "}
              <strong>{avgPerInit}</strong>
            </li>
            <li>
              Done: <strong>{t.done}</strong> of {t.initiatives}
            </li>
          </ul>
        </Card>
        <Card title="Recently created">
          <ul className="space-y-1 text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <a href={`/initiatives/${r.id}`} className="truncate hover:underline">
                  {r.title}
                </a>
                <span className="shrink-0 text-xs text-muted">
                  {r.status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-brand-primary-glow">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Sparkline({ rows }: { rows: { label: string; value: number }[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted">No data yet.</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const w = 600;
  const h = 80;
  const step = rows.length > 1 ? w / (rows.length - 1) : 0;
  const points = rows
    .map((r, i) => `${i * step},${h - (r.value / max) * (h - 8) - 4}`)
    .join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="#7C3AED"
          strokeWidth={2}
          points={points}
        />
        {rows.map((r, i) => (
          <circle
            key={r.label}
            cx={i * step}
            cy={h - (r.value / max) * (h - 8) - 4}
            r={3}
            fill="#7C3AED"
          />
        ))}
      </svg>
      <ul className="mt-2 flex justify-between text-[10px] text-muted">
        {rows.map((r) => (
          <li key={r.label}>{r.label.slice(5)}</li>
        ))}
      </ul>
    </div>
  );
}

function BarList({
  rows,
}: {
  rows: { label: string; value: number; dot?: string }[];
}) {
  if (rows.length === 0)
    return <p className="text-sm text-muted">No data yet.</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2">
      {rows
        .slice()
        .sort((a, b) => b.value - a.value)
        .map((r) => (
          <li key={r.label} className="text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 truncate">
                {r.dot && <span className={`inline-block h-2 w-2 rounded-full ${r.dot}`} />}
                {r.label}
              </span>
              <span className="text-muted">{r.value}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-raised">
              <div
                className="h-full bg-brand-primary"
                style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
    </ul>
  );
}
