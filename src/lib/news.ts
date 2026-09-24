import { and, desc, eq, gte, isNotNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { initiatives, updates, users } from "@/db/schema";

/**
 * What has happened lately.
 *
 * All of this was already being written and none of it was being read
 * anywhere you would land: updates posted on an initiative only showed on
 * that initiative, outcomes only on the Showcase, and a session starting on
 * Thursday was visible only if you happened to scroll past its card. Someone
 * opening Lab Hours saw a list of everything that exists, sorted by when it
 * was created, which answers "what is here" and never "what is going on".
 *
 * Four kinds of thing, merged and sorted by when they happened.
 */
export type NewsKind = "update" | "outcome" | "new" | "soon";

export type NewsItem = {
  kind: NewsKind;
  at: Date;
  title: string;
  href: string;
  who: string | null;
  detail: string | null;
};

/** First line of a markdown body, trimmed to something a row can hold. */
function gist(body: string, max = 120) {
  const line =
    body
      .split("\n")
      .map((l) => l.replace(/^[#>\-*\s]+/, "").trim())
      .find((l) => l.length > 0) ?? "";
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

export async function whatsNew(limit = 8): Promise<NewsItem[]> {
  const fortnightAgo = new Date(Date.now() - 14 * 86400000);
  const soon = new Date(Date.now() + 14 * 86400000);

  const [posted, wrapped, fresh, upcoming] = await Promise.all([
    db
      .select({
        at: updates.createdAt,
        body: updates.body,
        initiativeId: updates.initiativeId,
        title: initiatives.title,
        who: users.name,
      })
      .from(updates)
      .innerJoin(initiatives, eq(initiatives.id, updates.initiativeId))
      .leftJoin(users, eq(users.id, updates.authorId))
      .where(gte(updates.createdAt, fortnightAgo))
      .orderBy(desc(updates.createdAt))
      .limit(limit),

    db
      .select({
        at: initiatives.updatedAt,
        id: initiatives.id,
        title: initiatives.title,
        outcomeBody: initiatives.outcomeBody,
        who: users.name,
      })
      .from(initiatives)
      .leftJoin(users, eq(users.id, initiatives.ownerId))
      .where(and(isNotNull(initiatives.outcomeBody), gte(initiatives.updatedAt, fortnightAgo)))
      .orderBy(desc(initiatives.updatedAt))
      .limit(limit),

    db
      .select({
        at: initiatives.createdAt,
        id: initiatives.id,
        title: initiatives.title,
        summary: initiatives.summary,
        who: users.name,
      })
      .from(initiatives)
      .leftJoin(users, eq(users.id, initiatives.ownerId))
      .where(and(eq(initiatives.status, "open"), gte(initiatives.createdAt, fortnightAgo)))
      .orderBy(desc(initiatives.createdAt))
      .limit(limit),

    // Not "what happened" but "what is about to" — the one thing a sessions
    // product should never make somebody hunt for.
    db
      .select({
        at: initiatives.startsAt,
        id: initiatives.id,
        title: initiatives.title,
        who: users.name,
      })
      .from(initiatives)
      .leftJoin(users, eq(users.id, initiatives.ownerId))
      .where(
        and(
          isNotNull(initiatives.startsAt),
          gte(initiatives.startsAt, new Date()),
          or(eq(initiatives.status, "open"), eq(initiatives.status, "in_progress"))
        )
      )
      .orderBy(initiatives.startsAt)
      .limit(4),
  ]);

  const items: NewsItem[] = [
    ...posted.map((r) => ({
      kind: "update" as const,
      at: new Date(r.at),
      title: r.title,
      href: `/initiatives/${r.initiativeId}`,
      who: r.who,
      detail: gist(r.body),
    })),
    ...wrapped.map((r) => ({
      kind: "outcome" as const,
      at: new Date(r.at),
      title: r.title,
      href: `/initiatives/${r.id}`,
      who: r.who,
      detail: gist(r.outcomeBody ?? ""),
    })),
    ...fresh.map((r) => ({
      kind: "new" as const,
      at: new Date(r.at),
      title: r.title,
      href: `/initiatives/${r.id}`,
      who: r.who,
      detail: gist(r.summary),
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  // Anything starting inside the next fortnight goes to the top, soonest
  // first — a thing you can still attend beats a thing that already happened.
  const next = upcoming
    .filter((r) => r.at && new Date(r.at) <= soon)
    .map((r) => ({
      kind: "soon" as const,
      at: new Date(r.at!),
      title: r.title,
      href: `/initiatives/${r.id}`,
      who: r.who,
      detail: null,
    }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  const seen = new Set<string>();
  return [...next, ...items]
    .filter((i) => {
      const key = `${i.kind}:${i.href}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
