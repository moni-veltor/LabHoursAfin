import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attendance,
  hackAwards,
  hackDemos,
  hackTeamMembers,
  initiatives,
  subscriptions,
  users,
} from "@/db/schema";
import { previousTermKey, termKey } from "@/lib/participation";
import { ensureAttendance } from "@/lib/ensure-attendance";

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
  const ready = await ensureAttendance();
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
  // Without the table there is simply nothing to score from it yet; the rest
  // of the rules still apply.
  const present = !ready ? [] : await db
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
  return rank(await allScored(), term);
}

/**
 * Everyone's whole history, in one pass. Narrowing to a quarter is arithmetic
 * on what comes back, not another trip to the database — which matters because
 * the board, the team board and your own card are all the same data seen three
 * ways, and a page that showed all three should not query six times over.
 */
async function allScored(): Promise<Scored[]> {
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
  return people.map((p) => {
    const mine = awards.get(p.id) ?? [];
    const { total, byKind } = tally(mine);
    return {
      userId: p.id,
      name: p.name,
      email: p.email,
      image: p.image,
      total,
      byKind,
      awards: mine,
    };
  });
}

/**
 * Order a board, dropping anyone with nothing. People with no points are left
 * off rather than listed at zero — a leaderboard that names everyone who has
 * not turned up is a different, unkinder product.
 */
function rank(all: Scored[], term?: string): Scored[] {
  const rows: Scored[] = [];
  for (const p of all) {
    const { total, byKind, awards } = tally(p.awards, term);
    if (awards.length === 0) continue;
    rows.push({
      ...p,
      total,
      byKind,
      awards: awards.sort((a, b) => b.at.getTime() - a.at.getTime()),
    });
  }
  return rows.sort(
    (a, b) => b.total - a.total || (a.name ?? "").localeCompare(b.name ?? "")
  );
}

/** A row on the board, plus where it moved from. */
export type Ranked = Scored & {
  place: number;
  /** Their place last quarter, or null if they did not score then. */
  was: number | null;
  /** Positive is a climb. null means there is nothing to compare against. */
  moved: number | null;
  isNew: boolean;
};

/**
 * The board, with movement.
 *
 * A leaderboard that only shows today is a list. What makes one worth opening
 * twice is whether anything CHANGED — who climbed, who is new, who slipped.
 * That comparison is free here: every award already carries the quarter it
 * belongs to, so last quarter's order is the same rows tallied differently.
 *
 * All-time has no previous period to compare against, so it reports no
 * movement rather than inventing some.
 */
export async function boardWithMovement(term?: string): Promise<Ranked[]> {
  const all = await allScored();
  const now = rank(all, term);
  if (!term) return now.map((r, i) => ({ ...r, place: i + 1, was: null, moved: null, isNew: false }));

  const before = rank(all, previousTermKey(term));
  const wasAt = new Map(before.map((r, i) => [r.userId, i + 1]));
  const everScored = new Set(
    all.filter((r) => r.awards.some((a) => a.term < term)).map((r) => r.userId)
  );

  return now.map((r, i) => {
    const was = wasAt.get(r.userId) ?? null;
    return {
      ...r,
      place: i + 1,
      was,
      moved: was == null ? null : was - (i + 1),
      isNew: !everScored.has(r.userId),
    };
  });
}

/** The latest things anybody earned — the board's pulse. */
export async function recentAwards(limit = 8) {
  const all = await allScored();
  const flat: { who: string; kind: PointKind; title: string; at: Date; href?: string }[] = [];
  for (const p of all)
    for (const a of p.awards)
      flat.push({ who: p.name ?? p.email, kind: a.kind, title: a.title, at: a.at, href: a.href });
  return flat.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

export type TeamScore = {
  team: string;
  total: number;
  people: number;
  /** Points per scoring member — what the board is actually ranked on. */
  each: number;
  top: string | null;
};

/**
 * The same points, by department.
 *
 * Ranked on points PER PERSON, not total. Ranked on total, the largest
 * department wins every quarter by existing, which is neither interesting nor
 * something a small team can do anything about. Per person, a team of four who
 * all turn up can beat a team of thirty where six do — and that is a contest
 * worth having.
 *
 * Only people who scored count toward the divisor. Dividing by headcount would
 * punish a department for having members who have not found Lab Hours yet,
 * which is a recruitment problem, not a participation one.
 */
export async function teamBoard(term?: string): Promise<TeamScore[]> {
  const [board, people] = await Promise.all([
    leaderboard(term),
    db
      .select({ id: users.id, department: users.department })
      .from(users)
      .where(isNull(users.deletedAt)),
  ]);
  const dept = new Map(people.map((p) => [p.id, p.department?.trim() || null]));

  const groups = new Map<string, { total: number; people: number; top: Scored }>();
  for (const r of board) {
    const team = dept.get(r.userId);
    if (!team) continue; // no department recorded — cannot be placed on a team
    const g = groups.get(team);
    if (!g) groups.set(team, { total: r.total, people: 1, top: r });
    else {
      g.total += r.total;
      g.people += 1;
      if (r.total > g.top.total) g.top = r;
    }
  }

  return Array.from(groups.entries())
    .map(([team, g]) => ({
      team,
      total: g.total,
      people: g.people,
      each: Math.round(g.total / g.people),
      top: g.top.name ?? g.top.email,
    }))
    .sort((a, b) => b.each - a.each || b.total - a.total);
}

/**
 * One person's card: where they are this quarter, and where they have been.
 *
 * A leaderboard motivates the top three and quietly tells everybody else they
 * are losing. This is the other ninety per cent's view of the same data —
 * their own total, their own best quarter, what they put back — which is worth
 * more to most people than a rank they will never hold.
 */
export async function pointsFor(userId: string, term?: string) {
  const all = await allScored();
  const me = all.find((r) => r.userId === userId);
  const board = rank(all, term);
  const i = board.findIndex((r) => r.userId === userId);
  const here = i === -1 ? null : board[i];

  const byTerm = new Map<string, number>();
  for (const a of me?.awards ?? [])
    byTerm.set(a.term, (byTerm.get(a.term) ?? 0) + a.points);
  let best: { term: string; points: number } | null = null;
  for (const [t, points] of byTerm)
    if (!best || points > best.points) best = { term: t, points };

  const attended = (me?.awards ?? []).filter(
    (a) => a.kind === "attended" && (!term || a.term === term)
  ).length;

  return {
    total: here?.total ?? 0,
    allTime: me?.total ?? 0,
    rank: i === -1 ? null : i + 1,
    of: board.length,
    awards: here?.awards ?? [],
    byKind: here?.byKind ?? emptyByKind(),
    attended,
    best,
    /** Every quarter they have scored in, most recent first. */
    history: Array.from(byTerm.entries())
      .map(([t, points]) => ({ term: t, points }))
      .sort((a, b) => (a.term < b.term ? 1 : -1)),
  };
}

/** This quarter, as the board labels it. */
export const currentTerm = () => termKey(new Date());

/**
 * Has this session had its register taken? Owners see this as a prompt, which
 * is the only reason anyone remembers to do it.
 */
export async function registerTaken(initiativeId: string) {
  if (!(await ensureAttendance())) return { marked: false, count: 0 };
  const rows = await db
    .select({ userId: attendance.userId })
    .from(attendance)
    .where(eq(attendance.initiativeId, initiativeId));
  return { marked: rows.length > 0, count: rows.length };
}

/**
 * The register's roster: everyone who might have been in the room.
 *
 * Not the sign-up list. People turn up to things they never signed up for —
 * a colleague pulled in at the last minute, somebody who saw it on a screen
 * and wandered over — and an attendance record that can only describe people
 * who booked is not a record of who attended. So this is the union of the
 * participants and anyone already marked, and the owner can add to it.
 */
export type RegisterEntry = {
  userId: string;
  name: string | null;
  email: string;
  /** False for a walk-in: they were marked, but never signed up. */
  signedUp: boolean;
  /** null means "not yet marked" — different from "marked absent". */
  present: boolean | null;
};

export async function registerRoster(
  initiativeId: string
): Promise<RegisterEntry[]> {
  const ready = await ensureAttendance();

  const [signed, marked] = await Promise.all([
    db
      .select({
        userId: subscriptions.userId,
        name: users.name,
        email: users.email,
      })
      .from(subscriptions)
      .innerJoin(users, eq(users.id, subscriptions.userId))
      .where(
        and(
          eq(subscriptions.initiativeId, initiativeId),
          eq(subscriptions.role, "participant")
        )
      ),
    !ready
      ? []
      : db
          .select({
            userId: attendance.userId,
            present: attendance.present,
            name: users.name,
            email: users.email,
          })
          .from(attendance)
          .innerJoin(users, eq(users.id, attendance.userId))
          .where(eq(attendance.initiativeId, initiativeId)),
  ]);

  const byId = new Map<string, RegisterEntry>();
  for (const s of signed)
    byId.set(s.userId, {
      userId: s.userId,
      name: s.name,
      email: s.email,
      signedUp: true,
      present: null,
    });
  for (const m of marked) {
    const existing = byId.get(m.userId);
    if (existing) existing.present = m.present;
    else
      byId.set(m.userId, {
        userId: m.userId,
        name: m.name,
        email: m.email,
        signedUp: false,
        present: m.present,
      });
  }

  return Array.from(byId.values()).sort((a, b) =>
    (a.name ?? a.email).localeCompare(b.name ?? b.email)
  );
}

/** Everyone the owner could still add — active people not already listed. */
export async function attendanceCandidates(initiativeId: string) {
  const roster = await registerRoster(initiativeId);
  const already = new Set(roster.map((r) => r.userId));
  const all = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(isNull(users.deletedAt));
  return all
    .filter((u) => !already.has(u.id))
    .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email));
}
