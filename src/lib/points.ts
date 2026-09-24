import { eq, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attendance,
  hackAwards,
  hackDemos,
  hackTeamMembers,
  initiatives,
  users,
} from "@/db/schema";
import { termKey } from "@/lib/participation";

/**
 * Points, and where they come from.
 *
 * Two rules govern this file, and both are deliberate.
 *
 * FIRST: points are DERIVED, never stored. There is no balance column to drift
 * out of step with reality, no backfill to run, and no way to end up with
 * points for a session that was later deleted. The cost is that the leaderboard
 * is six queries instead of one — which, for a team-sized product, is nothing.
 * The benefit is that the moment an owner takes a register for a session held
 * three months ago, everybody's history is correct.
 *
 * SECOND: a point is only ever awarded for something that HAPPENED. This
 * product was previously counting `subscription.joined_at` — signing up — as
 * participation, which meant a person who booked eight sessions and attended
 * none held an eight-quarter streak and every badge. Signing up is an
 * intention. Turning up is a fact. Only facts score.
 */

export type PointKind =
  | "attended"
  | "ran"
  | "outcome"
  | "lessons"
  | "demo"
  | "award";

export const RULES: Record<
  PointKind,
  { points: number; label: string; why: string }
> = {
  attended: {
    points: 10,
    label: "Turned up",
    why: "You were marked present at a session.",
  },
  ran: {
    points: 25,
    label: "Ran a session",
    why: "You hosted a session that people actually attended. Worth more than attending, because somebody has to do it.",
  },
  outcome: {
    points: 15,
    label: "Posted the outcome",
    why: "You said what came of it, so the next person does not start from nothing.",
  },
  lessons: {
    points: 10,
    label: "Shared what you learned",
    why: "Including the parts that did not work.",
  },
  demo: { points: 20, label: "Demoed at Hack", why: "Your team shipped a demo." },
  award: { points: 40, label: "Won at Hack", why: "Your team took an award." },
};

export type Award = {
  kind: PointKind;
  points: number;
  /** The quarter this counts toward, e.g. "2026-Q3". */
  term: string;
  at: Date;
  title: string;
  href?: string;
};

export type Scored = {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  total: number;
  awards: Award[];
  /** Points by kind, for the breakdown. */
  byKind: Record<PointKind, number>;
};

export const emptyByKind = (): Record<PointKind, number> => ({
  attended: 0,
  ran: 0,
  outcome: 0,
  lessons: 0,
  demo: 0,
  award: 0,
});

/**
 * Add a person's awards up. Pure, so the rules can be tested without a
 * database — which is most of what there is to get wrong here.
 */
export function tally(awards: Award[], term?: string) {
  const byKind = emptyByKind();
  let total = 0;
  const kept: Award[] = [];
  for (const a of awards) {
    if (term && a.term !== term) continue;
    byKind[a.kind] += a.points;
    total += a.points;
    kept.push(a);
  }
  return { total, byKind, awards: kept };
}

/**
 * Every award anyone has earned, keyed by user.
 *
 * A session's points are dated by when the session HAPPENED (`startsAt`), not
 * when the register was taken — otherwise an owner catching up on three months
 * of registers would drop every one of those points into this quarter.
 */
async function allAwards(): Promise<Map<string, Award[]>> {
  const out = new Map<string, Award[]>();
  const add = (userId: string, a: Award) => {
    const list = out.get(userId);
    if (list) list.push(a);
    else out.set(userId, [a]);
  };
  const award = (kind: PointKind, at: Date, title: string, href?: string): Award => ({
    kind,
    points: RULES[kind].points,
    term: termKey(at),
    at,
    title,
    href,
  });

  // Attendance, and — from the same rows — who ran a session that was attended.
  const present = await db
    .select({
      userId: attendance.userId,
      markedAt: attendance.markedAt,
      initiativeId: initiatives.id,
      ownerId: initiatives.ownerId,
      title: initiatives.title,
      startsAt: initiatives.startsAt,
    })
    .from(attendance)
    .innerJoin(initiatives, eq(initiatives.id, attendance.initiativeId))
    .where(eq(attendance.present, true));

  const ranSessions = new Map<
    string,
    { ownerId: string; title: string; at: Date }
  >();
  for (const r of present) {
    const at = r.startsAt ?? r.markedAt;
    const href = `/initiatives/${r.initiativeId}`;
    // The owner does not also collect an attendance point for their own
    // session — they collect the larger "ran it" one below.
    if (r.userId !== r.ownerId) add(r.userId, award("attended", at, r.title, href));
    ranSessions.set(r.initiativeId, { ownerId: r.ownerId, title: r.title, at });
  }
  for (const [id, s] of ranSessions)
    add(s.ownerId, award("ran", s.at, s.title, `/initiatives/${id}`));

  // What came of a session. Awarded to whoever ran it.
  const told = await db
    .select({
      id: initiatives.id,
      ownerId: initiatives.ownerId,
      title: initiatives.title,
      startsAt: initiatives.startsAt,
      createdAt: initiatives.createdAt,
      outcomeBody: initiatives.outcomeBody,
      lessonsLearned: initiatives.lessonsLearned,
    })
    .from(initiatives)
    .where(
      or(
        isNotNull(initiatives.outcomeBody),
        isNotNull(initiatives.lessonsLearned)
      )
    );
  for (const t of told) {
    const at = t.startsAt ?? t.createdAt;
    const href = `/initiatives/${t.id}`;
    if (t.outcomeBody?.trim()) add(t.ownerId, award("outcome", at, t.title, href));
    if (t.lessonsLearned?.trim()) add(t.ownerId, award("lessons", at, t.title, href));
  }

  // Hack: a demo shipped, and an award taken. Both go to every team member.
  const demos = await db
    .select({
      userId: hackTeamMembers.userId,
      submittedAt: hackDemos.submittedAt,
      demoId: hackDemos.id,
    })
    .from(hackDemos)
    .innerJoin(hackTeamMembers, eq(hackTeamMembers.teamId, hackDemos.teamId));
  for (const d of demos)
    add(d.userId, award("demo", d.submittedAt, "Hack demo", "/hack"));

  const won = await db
    .select({
      userId: hackTeamMembers.userId,
      kind: hackAwards.kind,
      createdAt: hackAwards.createdAt,
    })
    .from(hackAwards)
    .innerJoin(hackDemos, eq(hackDemos.id, hackAwards.demoId))
    .innerJoin(hackTeamMembers, eq(hackTeamMembers.teamId, hackDemos.teamId));
  for (const w of won)
    add(w.userId, award("award", w.createdAt, `Hack — ${w.kind}`, "/hack"));

  return out;
}

/**
 * The board. `term` narrows it to one quarter; omit it for all time.
 *
 * People with no points are left off rather than listed at zero — a leaderboard
 * that names everyone who has not turned up is a different, unkinder product.
 */
export async function leaderboard(term?: string): Promise<Scored[]> {
  const [awards, people] = await Promise.all([
    allAwards(),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(users)
      .where(isNull(users.deletedAt)),
  ]);

  const rows: Scored[] = [];
  for (const p of people) {
    const { total, byKind, awards: mine } = tally(awards.get(p.id) ?? [], term);
    if (mine.length === 0) continue;
    rows.push({
      userId: p.id,
      name: p.name,
      email: p.email,
      image: p.image,
      total,
      byKind,
      awards: mine.sort((a, b) => b.at.getTime() - a.at.getTime()),
    });
  }
  return rows.sort((a, b) => b.total - a.total || (a.name ?? "").localeCompare(b.name ?? ""));
}

/** One person's score, their breakdown, and where they sit on the board. */
export async function pointsFor(userId: string, term?: string) {
  const board = await leaderboard(term);
  const i = board.findIndex((r) => r.userId === userId);
  return {
    total: i === -1 ? 0 : board[i].total,
    rank: i === -1 ? null : i + 1,
    of: board.length,
    awards: i === -1 ? [] : board[i].awards,
    byKind: i === -1 ? emptyByKind() : board[i].byKind,
  };
}

/** This quarter, as the board labels it. */
export const currentTerm = () => termKey(new Date());

/**
 * Has this session had its register taken? Owners see this as a prompt, which
 * is the only reason anyone remembers to do it.
 */
export async function registerTaken(initiativeId: string) {
  const rows = await db
    .select({ userId: attendance.userId })
    .from(attendance)
    .where(eq(attendance.initiativeId, initiativeId));
  return { marked: rows.length > 0, count: rows.length };
}

/** Who the owner marked present, for rendering the register. */
export async function registerFor(initiativeId: string) {
  const rows = await db
    .select({ userId: attendance.userId, present: attendance.present })
    .from(attendance)
    .where(eq(attendance.initiativeId, initiativeId));
  return new Map(rows.map((r) => [r.userId, r.present]));
}
