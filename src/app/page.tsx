import { db } from "@/lib/db";
import {
  initiatives,
  subscriptions,
  users,
  initiativeTags,
  tags,
} from "@/db/schema";
import { eq, desc, ne, inArray, and, ilike, sql, asc } from "drizzle-orm";
import { InitiativeCard } from "@/components/initiative-card";
import Link from "next/link";
import { SearchInput } from "@/components/search-input";
import { RecommendStrip } from "@/components/recommend";
import { auth } from "@/lib/auth";
import { loadAllCategories, categoryKeyOf } from "@/lib/categories-server";
import { getParticipationStatus } from "@/lib/participation";
import { isTechTeam } from "@/lib/tech-team";
import { isAdmin } from "@/lib/admin";

const PAGE_SIZE = 20;

type Search = {
  status?: string;
  tag?: string;
  category?: string;
  q?: string;
  sort?: string;
  page?: string;
  surprise?: string;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const me = session?.user as
    | { id?: string; email?: string; role?: string }
    | undefined;

  const allCats = await loadAllCategories();
  const catMap = new Map(allCats.map((c) => [c.key, c]));
  const fallbackCat = catMap.get("other")!;

  const ruleApplies = !!(
    me &&
    me.role === "member" &&
    !isTechTeam(me.email) &&
    !isAdmin(me.email)
  );
  const status = me?.id && ruleApplies ? await getParticipationStatus(me.id) : null;
  const lockedSet = new Set(
    status ? [...status.currentCategories, ...status.previousCategories] : []
  );

  const filters = [ne(initiatives.status, "archived"), eq(initiatives.awaitingReview, false)];
  if (sp.status) filters.push(eq(initiatives.status, sp.status as any));
  if (sp.category) {
    if (catMap.get(sp.category)?.isCustom) {
      filters.push(eq(initiatives.customCategorySlug, sp.category));
    } else {
      filters.push(eq(initiatives.category, sp.category as any));
    }
  }
  if (sp.q && sp.q.trim().length > 0) {
    const q = `%${sp.q.trim()}%`;
    filters.push(
      sql`(${ilike(initiatives.title, q)} OR ${ilike(initiatives.summary, q)} OR ${ilike(
        initiatives.subcategory,
        q
      )})`
    );
  }

  let initiativeIds: string[] | null = null;
  if (sp.tag) {
    const taggedRows = await db
      .select({ id: initiativeTags.initiativeId })
      .from(initiativeTags)
      .innerJoin(tags, eq(tags.id, initiativeTags.tagId))
      .where(eq(tags.slug, sp.tag));
    initiativeIds = taggedRows.map((r) => r.id);
    if (initiativeIds.length === 0) {
      return <EmptyState message={`No initiatives tagged "${sp.tag}".`} />;
    }
  }

  const where =
    initiativeIds != null
      ? and(...filters, inArray(initiatives.id, initiativeIds))
      : and(...filters);

  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const sort = sp.sort ?? "new";

  let orderBy: any[] = [desc(initiatives.featured), desc(initiatives.createdAt)];
  if (sort === "trending") orderBy = [desc(initiatives.updatedAt)];
  if (sort === "ending") orderBy = [asc(initiatives.endsAt), desc(initiatives.createdAt)];

  const rowsRaw = await db
    .select({
      id: initiatives.id,
      title: initiatives.title,
      summary: initiatives.summary,
      status: initiatives.status,
      category: initiatives.category,
      customCategorySlug: initiatives.customCategorySlug,
      format: initiatives.format,
      difficulty: initiatives.difficulty,
      featured: initiatives.featured,
      crossTeam: initiatives.crossTeam,
      coverImage: initiatives.coverImage,
      timeCommitment: initiatives.timeCommitment,
      capacity: initiatives.capacity,
      createdAt: initiatives.createdAt,
      ownerName: users.name,
    })
    .from(initiatives)
    .leftJoin(users, eq(users.id, initiatives.ownerId))
    .where(where)
    .orderBy(...orderBy)
    .limit(PAGE_SIZE + 1)
    .offset(offset);

  const hasNext = rowsRaw.length > PAGE_SIZE;
  let rows = rowsRaw.slice(0, PAGE_SIZE);

  if (sp.surprise === "1" && rows.length > 1) {
    rows = [rows[Math.floor(Math.random() * rows.length)]];
  }

  const ids = rows.map((r) => r.id);
  const [counts, allTags] = await Promise.all([
    ids.length
      ? db
          .select({ id: subscriptions.initiativeId, role: subscriptions.role })
          .from(subscriptions)
          .where(inArray(subscriptions.initiativeId, ids))
      : Promise.resolve([]),
    ids.length
      ? db
          .select({ id: initiativeTags.initiativeId, slug: tags.slug })
          .from(initiativeTags)
          .innerJoin(tags, eq(tags.id, initiativeTags.tagId))
          .where(inArray(initiativeTags.initiativeId, ids))
      : Promise.resolve([]),
  ]);

  const participantCount = new Map<string, number>();
  for (const c of counts) {
    if (c.role === "participant" || c.role === "owner") {
      participantCount.set(c.id, (participantCount.get(c.id) ?? 0) + 1);
    }
  }
  const tagsByInitiative = new Map<string, string[]>();
  for (const t of allTags) {
    const arr = tagsByInitiative.get(t.id) ?? [];
    arr.push(t.slug);
    tagsByInitiative.set(t.id, arr);
  }

  const featured = rows.filter((r) => r.featured);
  const rest = rows.filter((r) => !r.featured);

  return (
    <div className="space-y-8">
      <Hero count={rows.length} />

      <div className="space-y-3">
        <SearchInput q={sp.q} />
        <CategoryTabs current={sp.category} allCats={allCats} />
        <ControlBar current={sp} />
      </div>

      {me?.id && !sp.q && !sp.category && !sp.status && !sp.tag && !sp.surprise && (
        <RecommendStrip userId={me.id} />
      )}

      {sp.surprise === "1" && rows.length > 0 && (
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-accent">
          random pick — refresh for another
        </p>
      )}

      {featured.length > 0 && !sp.surprise && (
        <section>
          <SectionHeader badge="featured" tone="accent">
            On the wall
          </SectionHeader>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {featured.map((r) => (
              <InitiativeCard
                key={r.id}
                {...mapRow(r, participantCount, tagsByInitiative, catMap, fallbackCat, lockedSet)}
              />
            ))}
          </div>
        </section>
      )}

      {rest.length === 0 && featured.length === 0 ? (
        <EmptyState message="No initiatives match these filters." />
      ) : rest.length > 0 ? (
        <section>
          {featured.length > 0 && (
            <SectionHeader badge="all">Initiatives</SectionHeader>
          )}
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {rest.map((r) => (
              <InitiativeCard
                key={r.id}
                {...mapRow(r, participantCount, tagsByInitiative, catMap, fallbackCat, lockedSet)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {(page > 1 || hasNext) && (
        <Pagination page={page} hasNext={hasNext} sp={sp} />
      )}
    </div>
  );
}

function mapRow(
  r: any,
  participantCount: Map<string, number>,
  tagsByInitiative: Map<string, string[]>,
  catMap: Map<string, any>,
  fallbackCat: any,
  lockedSet: Set<string>
) {
  const key = r.customCategorySlug ?? r.category;
  const cat = catMap.get(key) ?? fallbackCat;
  return {
    id: r.id,
    title: r.title,
    summary: r.summary,
    status: r.status,
    category: { label: cat.label, badge: cat.badge, dot: cat.dot },
    format: r.format,
    difficulty: r.difficulty,
    ownerName: r.ownerName,
    timeCommitment: r.timeCommitment,
    capacity: r.capacity,
    participantCount: participantCount.get(r.id) ?? 0,
    createdAt: r.createdAt,
    tags: tagsByInitiative.get(r.id) ?? [],
    coverImage: r.coverImage,
    crossTeam: r.crossTeam,
    featured: r.featured,
    locked: lockedSet.has(key),
  };
}

function Hero({ count }: { count: number }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="lh-mesh absolute inset-0 opacity-90" />
      <div className="lh-grid-bg absolute inset-0 opacity-30" />
      <div className="relative px-5 py-8 sm:px-7 sm:py-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-raised/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted backdrop-blur">
          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-brand-success">
            <span className="absolute inset-0 rounded-full bg-brand-success opacity-60 animate-pulse-soft" />
          </span>
          live · {count} on this page
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Lab Hours</h1>
        <p className="mt-2 max-w-xl text-muted">
          Initiatives the tech team is exploring. Subscribe to follow along, or
          join the ones you want in on.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider">
          <Pill color="primary">build</Pill>
          <Pill color="accent">learn</Pill>
          <Pill color="success">ship</Pill>
        </div>
      </div>
    </section>
  );
}

function Pill({
  color,
  children,
}: {
  color: "primary" | "accent" | "success";
  children: React.ReactNode;
}) {
  const map = {
    primary: "border-brand-primary/40 bg-brand-primary-950 text-brand-primary-glow",
    accent: "border-brand-accent/40 bg-brand-accent-950 text-brand-accent",
    success: "border-brand-success/40 bg-brand-success-950 text-brand-success",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 ${map[color]}`}>
      {children}
    </span>
  );
}

function SectionHeader({
  badge,
  children,
  tone = "muted",
}: {
  badge: string;
  children: React.ReactNode;
  tone?: "muted" | "accent";
}) {
  const cls =
    tone === "accent"
      ? "border-brand-accent/40 bg-brand-accent-950 text-brand-accent"
      : "border-line bg-raised text-muted";
  return (
    <div className="flex items-center gap-3">
      <span
        className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] ${cls}`}
      >
        {badge}
      </span>
      <span className="text-sm font-semibold uppercase tracking-wider text-muted">
        {children}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function CategoryTabs({
  current,
  allCats,
}: {
  current?: string;
  allCats: Awaited<ReturnType<typeof loadAllCategories>>;
}) {
  return (
    <div className="-mx-1 flex flex-wrap gap-1 overflow-x-auto pb-1 text-sm">
      <Tab href="/" active={!current}>
        All
      </Tab>
      {allCats.map((c) => (
        <Tab
          key={c.key}
          href={`/?category=${c.key}`}
          active={current === c.key}
          dotClass={c.dot}
        >
          {c.label}
          {c.isCustom && (
            <span className="ml-1 font-mono text-[9px] text-dim">·new</span>
          )}
        </Tab>
      ))}
    </div>
  );
}

function Tab({
  href,
  active,
  dotClass,
  children,
}: {
  href: string;
  active: boolean;
  dotClass?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
        active
          ? "bg-brand-primary text-white shadow-glow"
          : "border border-line bg-raised text-muted hover:border-brand-primary/40 hover:text-ink-text"
      }`}
    >
      {dotClass && <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />}
      <span>{children}</span>
    </Link>
  );
}

function ControlBar({ current }: { current: Search }) {
  const statuses = ["open", "in_progress", "done"];
  const sorts = [
    { k: "new", label: "newest" },
    { k: "trending", label: "active" },
  ];
  const base = current.category ? `&category=${current.category}` : "";
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
      <Link
        href={current.category ? `/?category=${current.category}` : "/"}
        className={`rounded-full px-3 py-1 ${
          !current.status
            ? "border border-brand-primary/40 bg-brand-primary-950 text-brand-primary-glow"
            : "border border-line bg-raised text-muted hover:text-ink-text"
        }`}
      >
        any status
      </Link>
      {statuses.map((s) => (
        <Link
          key={s}
          href={`/?status=${s}${base}`}
          className={`rounded-full px-3 py-1 ${
            current.status === s
              ? "border border-brand-primary/40 bg-brand-primary-950 text-brand-primary-glow"
              : "border border-line bg-raised text-muted hover:text-ink-text"
          }`}
        >
          {s.replace("_", " ")}
        </Link>
      ))}
      <span className="ml-2 text-dim">|</span>
      {sorts.map((s) => {
        const active = (current.sort ?? "new") === s.k;
        const params = new URLSearchParams();
        if (current.category) params.set("category", current.category);
        if (current.status) params.set("status", current.status);
        if (current.q) params.set("q", current.q);
        params.set("sort", s.k);
        return (
          <Link
            key={s.k}
            href={`/?${params.toString()}`}
            className={`rounded-full px-3 py-1 ${
              active
                ? "border border-brand-accent/40 bg-brand-accent-950 text-brand-accent"
                : "border border-line bg-raised text-muted hover:text-ink-text"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
      <Link
        href="/?surprise=1"
        className="ml-auto rounded-full border border-line bg-raised px-3 py-1 text-muted hover:border-brand-accent/40 hover:text-brand-accent"
      >
        ✦ surprise me
      </Link>
      {current.tag && (
        <span className="rounded-full border border-line bg-raised px-3 py-1 text-muted">
          #{current.tag}{" "}
          <Link href="/" className="ml-1 text-dim hover:text-ink-text">
            ×
          </Link>
        </span>
      )}
    </div>
  );
}

function Pagination({
  page,
  hasNext,
  sp,
}: {
  page: number;
  hasNext: boolean;
  sp: Search;
}) {
  function url(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "page" || v == null || v === "") continue;
      params.set(k, String(v));
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }
  return (
    <nav className="flex items-center justify-between font-mono text-xs">
      <span className="text-dim">page {page}</span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={url(page - 1)}
            className="rounded-md border border-line bg-raised px-3 py-1.5 text-muted hover:text-ink-text"
          >
            ← prev
          </Link>
        ) : (
          <span className="rounded-md border border-line bg-surface px-3 py-1.5 text-dim">
            ← prev
          </span>
        )}
        {hasNext ? (
          <Link
            href={url(page + 1)}
            className="rounded-md border border-line bg-raised px-3 py-1.5 text-muted hover:text-ink-text"
          >
            next →
          </Link>
        ) : (
          <span className="rounded-md border border-line bg-surface px-3 py-1.5 text-dim">
            next →
          </span>
        )}
      </div>
    </nav>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface py-16 text-center">
      <p className="text-muted">{message}</p>
    </div>
  );
}
