"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  hackathons,
  hackIdeas,
  hackTeams,
  hackTeamMembers,
  hackDemos,
  hackVotes,
  hackAwards,
  hackJudges,
  hackParticipants,
} from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { eq, ne, and, sql as dsql, count } from "drizzle-orm";
import { JUDGE_POOL, JUDGE_PANEL, hackCapacity } from "@/lib/hack";
import { isAdmin } from "@/lib/admin";
import { parseLondonLocal, formatLondon } from "@/lib/tz";

// One hackathon at a time: throw if this member already competes in another
// live (not-done) hackathon. Admins are exempt so they can test.
async function assertNotInOtherHackathon(
  userId: string,
  who: object | null | undefined,
  hackathonId: string
) {
  if (isAdmin(who)) return;
  const [other] = await db
    .select({ name: hackathons.name })
    .from(hackParticipants)
    .innerJoin(hackathons, eq(hackathons.id, hackParticipants.hackathonId))
    .where(
      and(
        eq(hackParticipants.userId, userId),
        ne(hackParticipants.hackathonId, hackathonId),
        ne(hackathons.stage, "done")
      )
    );
  if (other) {
    throw new Error(
      `ONE_HACKATHON: You're already signed up for "${other.name}". You can only be in one hackathon at a time.`
    );
  }
}

// One hackathon at a time (judging): throw if this member is already in the
// judge pool of another live (not-done) hackathon. Admins are exempt.
async function assertNotJudgingOtherHackathon(
  userId: string,
  who: object | null | undefined,
  hackathonId: string
) {
  if (isAdmin(who)) return;
  const [other] = await db
    .select({ name: hackathons.name })
    .from(hackJudges)
    .innerJoin(hackathons, eq(hackathons.id, hackJudges.hackathonId))
    .where(
      and(
        eq(hackJudges.userId, userId),
        ne(hackJudges.hackathonId, hackathonId),
        ne(hackathons.stage, "done")
      )
    );
  if (other) {
    throw new Error(
      `ONE_JUDGING: You're already a judge for "${other.name}". You can only judge one hackathon at a time.`
    );
  }
}

// Sign-ups (compete or judge) are blocked until this instant, for non-admins.
function signupsClosed(
  hack: { subscriptionsOpenAt: Date | null },
  who: object | null | undefined
): string | null {
  if (isAdmin(who)) return null;
  if (
    hack.subscriptionsOpenAt &&
    hack.subscriptionsOpenAt.getTime() > Date.now()
  ) {
    return `NOT_OPEN_YET: Sign-ups open ${formatLondon(hack.subscriptionsOpenAt)}.`;
  }
  return null;
}
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";

const HackSchema = z.object({
  name: z.string().min(3).max(80),
  theme: z.string().max(280).optional(),
  description: z.string().max(2000).optional(),
  coverImage: z.string().max(500).optional(),
  tracks: z.string().max(280).optional(),
  prizes: z.string().max(500).optional(),
  teamCapacity: z.coerce.number().int().min(1).max(20).default(5),
  subscriptionsOpenAt: z.string().max(40).optional(),
});

export async function createHackathon(formData: FormData) {
  const me = await requireAdmin();
  const parsed = HackSchema.parse({
    name: formData.get("name"),
    theme: (formData.get("theme") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
    coverImage: (formData.get("coverImage") as string) || undefined,
    tracks: (formData.get("tracks") as string) || undefined,
    prizes: (formData.get("prizes") as string) || undefined,
    teamCapacity: formData.get("teamCapacity") ?? 5,
    subscriptionsOpenAt:
      (formData.get("subscriptionsOpenAt") as string) || undefined,
  });
  const startsAtRaw = formData.get("startsAt") as string | null;
  const endsAtRaw = formData.get("endsAt") as string | null;

  const baseSlug = slugify(parsed.name) || "hackathon";
  let slug = baseSlug;
  for (let i = 2; i < 50; i++) {
    const dup = await db.select().from(hackathons).where(eq(hackathons.slug, slug));
    if (dup.length === 0) break;
    slug = `${baseSlug}-${i}`;
  }

  const [hack] = await db
    .insert(hackathons)
    .values({
      slug,
      name: parsed.name,
      theme: parsed.theme,
      description: parsed.description,
      coverImage: parsed.coverImage,
      tracks: parsed.tracks,
      prizes: parsed.prizes,
      teamCapacity: parsed.teamCapacity,
      subscriptionsOpenAt: parsed.subscriptionsOpenAt
        ? parseLondonLocal(parsed.subscriptionsOpenAt)
        : null,
      startsAt: startsAtRaw ? new Date(startsAtRaw) : null,
      endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
      createdBy: me.id,
      stage: "idea",
    })
    .returning();
  await logAudit(me.id, "hackathon.create", { type: "hackathon", id: slug });

  revalidatePath("/hack");
  redirect(`/hack/${slug}`);
}

export async function setHackStage(
  hackathonId: string,
  stage: "draft" | "idea" | "team_forming" | "build" | "demo" | "voting" | "done"
) {
  const me = await requireAdmin();
  await db
    .update(hackathons)
    .set({ stage, updatedAt: new Date() })
    .where(eq(hackathons.id, hackathonId));
  await logAudit(me.id, "hackathon.advance", {
    type: "hackathon",
    id: hackathonId,
  });
  revalidatePath("/hack");
}

export async function setHackSignupsOpen(formData: FormData) {
  const me = await requireAdmin();
  const hackathonId = String(formData.get("hackathonId"));
  const raw = String(formData.get("subscriptionsOpenAt") ?? "").trim();
  if (!hackathonId) throw new Error("MISSING");
  const [hack] = await db
    .select()
    .from(hackathons)
    .where(eq(hackathons.id, hackathonId));
  if (!hack) throw new Error("NOT_FOUND");
  await db
    .update(hackathons)
    .set({
      subscriptionsOpenAt: raw ? parseLondonLocal(raw) : null,
      updatedAt: new Date(),
    })
    .where(eq(hackathons.id, hackathonId));
  await logAudit(me.id, "hackathon.set_signups_open", {
    type: "hackathon",
    id: hackathonId,
  });
  revalidatePath(`/hack/${hack.slug}`);
}

export async function pitchIdea(formData: FormData) {
  const me = await requireUser();
  const hackathonId = String(formData.get("hackathonId"));
  const title = String(formData.get("title") ?? "").slice(0, 120);
  const body = String(formData.get("body") ?? "").slice(0, 1000) || null;
  const track = (formData.get("track") as string) || null;
  if (!hackathonId || !title) throw new Error("MISSING");
  await db.insert(hackIdeas).values({
    hackathonId,
    authorId: me.id,
    title,
    body,
    track,
  });
  revalidatePath("/hack");
}

export async function formTeam(formData: FormData) {
  const me = await requireUser();
  const hackathonId = String(formData.get("hackathonId"));
  const ideaId = (formData.get("ideaId") as string) || null;
  const name = String(formData.get("name") ?? "").slice(0, 80);
  const blurb = String(formData.get("blurb") ?? "").slice(0, 280) || null;
  const track = (formData.get("track") as string) || null;
  if (!hackathonId || !name) throw new Error("MISSING");
  const judging = await db
    .select()
    .from(hackJudges)
    .where(
      and(
        eq(hackJudges.hackathonId, hackathonId),
        eq(hackJudges.userId, me.id)
      )
    );
  if (judging.length) throw new Error("ALREADY_JUDGING");
  await assertNotInOtherHackathon(me.id, me, hackathonId);
  const [team] = await db
    .insert(hackTeams)
    .values({ hackathonId, leaderId: me.id, ideaId, name, blurb, track })
    .returning();
  await db.insert(hackTeamMembers).values({ teamId: team.id, userId: me.id });
  // Team members are competitors — keep them on the hackathon roster.
  await db
    .insert(hackParticipants)
    .values({ hackathonId, userId: me.id })
    .onConflictDoNothing();
  if (ideaId) {
    await db
      .update(hackIdeas)
      .set({ teamId: team.id })
      .where(eq(hackIdeas.id, ideaId));
  }
  revalidatePath("/hack");
}

export async function joinTeam(teamId: string) {
  const me = await requireUser();
  const [team] = await db.select().from(hackTeams).where(eq(hackTeams.id, teamId));
  if (!team) throw new Error("NOT_FOUND");
  const [hack] = await db
    .select()
    .from(hackathons)
    .where(eq(hackathons.id, team.hackathonId));
  if (!hack) throw new Error("NOT_FOUND");
  const judging = await db
    .select()
    .from(hackJudges)
    .where(
      and(
        eq(hackJudges.hackathonId, team.hackathonId),
        eq(hackJudges.userId, me.id)
      )
    );
  if (judging.length) throw new Error("ALREADY_JUDGING");
  await assertNotInOtherHackathon(me.id, me, team.hackathonId);
  const members = await db
    .select()
    .from(hackTeamMembers)
    .where(eq(hackTeamMembers.teamId, teamId));
  if (members.length >= hack.teamCapacity) throw new Error("TEAM_FULL");
  await db
    .insert(hackTeamMembers)
    .values({ teamId, userId: me.id })
    .onConflictDoNothing();
  // Team members are competitors — keep them on the hackathon roster.
  await db
    .insert(hackParticipants)
    .values({ hackathonId: team.hackathonId, userId: me.id })
    .onConflictDoNothing();
  revalidatePath("/hack");
}

export async function leaveTeam(teamId: string) {
  const me = await requireUser();
  await db
    .delete(hackTeamMembers)
    .where(
      and(
        eq(hackTeamMembers.teamId, teamId),
        eq(hackTeamMembers.userId, me.id)
      )
    );
  revalidatePath("/hack");
}

export async function postDemo(formData: FormData) {
  const me = await requireUser();
  const teamId = String(formData.get("teamId"));
  const body = String(formData.get("body") ?? "").slice(0, 4000);
  const links = String(formData.get("links") ?? "").slice(0, 1000) || null;
  const coverImage =
    String(formData.get("coverImage") ?? "").slice(0, 500) || null;
  const [team] = await db.select().from(hackTeams).where(eq(hackTeams.id, teamId));
  if (!team) throw new Error("NOT_FOUND");
  if (team.leaderId !== me.id) throw new Error("ONLY_LEADER");
  await db
    .insert(hackDemos)
    .values({ teamId, body, links, coverImage })
    .onConflictDoUpdate({
      target: hackDemos.teamId,
      set: { body, links, coverImage, submittedAt: new Date() },
    });
  revalidatePath("/hack");
}

export async function voteDemo(demoId: string, category: string) {
  const me = await requireUser();
  const allowed = ["build", "useful", "wildcard", "people"];
  if (!allowed.includes(category)) throw new Error("BAD_CATEGORY");
  const existing = await db
    .select()
    .from(hackVotes)
    .where(
      and(
        eq(hackVotes.userId, me.id),
        eq(hackVotes.category, category)
      )
    );
  for (const v of existing) {
    await db
      .delete(hackVotes)
      .where(
        and(
          eq(hackVotes.userId, me.id),
          eq(hackVotes.demoId, v.demoId),
          eq(hackVotes.category, category)
        )
      );
  }
  await db.insert(hackVotes).values({ userId: me.id, demoId, category });
  revalidatePath("/hack");
}

export async function awardWinner(formData: FormData) {
  const me = await requireAdmin();
  const hackathonId = String(formData.get("hackathonId"));
  const demoId = String(formData.get("demoId"));
  const kind = String(formData.get("kind") ?? "").slice(0, 80);
  const note = String(formData.get("note") ?? "").slice(0, 280) || null;
  if (!hackathonId || !demoId || !kind) throw new Error("MISSING");
  await db.insert(hackAwards).values({ hackathonId, demoId, kind, note });
  await logAudit(me.id, "hackathon.award", {
    type: "hackathon",
    id: hackathonId,
  });
  revalidatePath("/hack");
}

export async function applyAsJudge(hackathonId: string) {
  const me = await requireUser();
  if (!hackathonId) throw new Error("MISSING");
  const [hack] = await db
    .select()
    .from(hackathons)
    .where(eq(hackathons.id, hackathonId));
  if (!hack) throw new Error("NOT_FOUND");
  const closed = signupsClosed(hack, me);
  if (closed) throw new Error(closed);

  // Conflict of interest: competitors can't judge (roster sign-up or a team).
  const competing = await db
    .select()
    .from(hackParticipants)
    .where(
      and(
        eq(hackParticipants.hackathonId, hackathonId),
        eq(hackParticipants.userId, me.id)
      )
    );
  const onTeam = await db
    .select({ userId: hackTeamMembers.userId })
    .from(hackTeamMembers)
    .innerJoin(hackTeams, eq(hackTeams.id, hackTeamMembers.teamId))
    .where(
      and(
        eq(hackTeams.hackathonId, hackathonId),
        eq(hackTeamMembers.userId, me.id)
      )
    );
  if (competing.length || onTeam.length)
    throw new Error("ALREADY_COMPETING");

  // One hackathon at a time (judging).
  await assertNotJudgingOtherHackathon(me.id, me, hackathonId);

  // Already in the pool? Nothing to do.
  const mine = await db
    .select()
    .from(hackJudges)
    .where(
      and(
        eq(hackJudges.hackathonId, hackathonId),
        eq(hackJudges.userId, me.id)
      )
    );
  if (mine.length) {
    revalidatePath(`/hack/${hack.slug}`);
    return;
  }

  const [{ c } = { c: 0 }] = await db
    .select({ c: count() })
    .from(hackJudges)
    .where(eq(hackJudges.hackathonId, hackathonId));
  if (Number(c) >= JUDGE_POOL) throw new Error("JUDGE_POOL_FULL");

  await db
    .insert(hackJudges)
    .values({ hackathonId, userId: me.id })
    .onConflictDoNothing();
  revalidatePath(`/hack/${hack.slug}`);
}

export async function withdrawAsJudge(hackathonId: string) {
  const me = await requireUser();
  if (!hackathonId) throw new Error("MISSING");
  const [hack] = await db
    .select()
    .from(hackathons)
    .where(eq(hackathons.id, hackathonId));
  await db
    .delete(hackJudges)
    .where(
      and(
        eq(hackJudges.hackathonId, hackathonId),
        eq(hackJudges.userId, me.id)
      )
    );
  if (hack) revalidatePath(`/hack/${hack.slug}`);
}

export async function drawJudges(hackathonId: string) {
  const me = await requireAdmin();
  if (!hackathonId) throw new Error("MISSING");
  const [hack] = await db
    .select()
    .from(hackathons)
    .where(eq(hackathons.id, hackathonId));
  if (!hack) throw new Error("NOT_FOUND");

  // Clear any previous draw, then randomly select up to JUDGE_PANEL from the pool.
  await db
    .update(hackJudges)
    .set({ selected: false })
    .where(eq(hackJudges.hackathonId, hackathonId));
  await db.execute(dsql`
    update hack_judge
    set selected = true
    where hackathon_id = ${hackathonId}
      and user_id in (
        select user_id from hack_judge
        where hackathon_id = ${hackathonId}
        order by random()
        limit ${JUDGE_PANEL}
      )
  `);
  await logAudit(me.id, "hackathon.draw_judges", {
    type: "hackathon",
    id: hackathonId,
  });
  revalidatePath(`/hack/${hack.slug}`);
}

export async function clearJudgeDraw(hackathonId: string) {
  const me = await requireAdmin();
  if (!hackathonId) throw new Error("MISSING");
  const [hack] = await db
    .select()
    .from(hackathons)
    .where(eq(hackathons.id, hackathonId));
  await db
    .update(hackJudges)
    .set({ selected: false })
    .where(eq(hackJudges.hackathonId, hackathonId));
  if (hack) revalidatePath(`/hack/${hack.slug}`);
}

// Participant roster: people who've signed up to compete. Capped at two full
// teams (2 × teamCapacity) — e.g. 10 for two teams of five.
export async function joinHackathon(hackathonId: string) {
  const me = await requireUser();
  if (!hackathonId) throw new Error("MISSING");
  const [hack] = await db
    .select()
    .from(hackathons)
    .where(eq(hackathons.id, hackathonId));
  if (!hack) throw new Error("NOT_FOUND");
  if (hack.stage === "done") throw new Error("HACK_CLOSED");
  const closed = signupsClosed(hack, me);
  if (closed) throw new Error(closed);

  // Conflict of interest: judges can't compete.
  const judging = await db
    .select()
    .from(hackJudges)
    .where(
      and(
        eq(hackJudges.hackathonId, hackathonId),
        eq(hackJudges.userId, me.id)
      )
    );
  if (judging.length) throw new Error("ALREADY_JUDGING");

  // One hackathon at a time.
  await assertNotInOtherHackathon(me.id, me, hackathonId);

  // Already signed up? Nothing to do.
  const mine = await db
    .select()
    .from(hackParticipants)
    .where(
      and(
        eq(hackParticipants.hackathonId, hackathonId),
        eq(hackParticipants.userId, me.id)
      )
    );
  if (mine.length) {
    revalidatePath(`/hack/${hack.slug}`);
    return;
  }

  const [{ c } = { c: 0 }] = await db
    .select({ c: count() })
    .from(hackParticipants)
    .where(eq(hackParticipants.hackathonId, hackathonId));
  if (Number(c) >= hackCapacity(hack.teamCapacity))
    throw new Error("HACK_FULL");

  await db
    .insert(hackParticipants)
    .values({ hackathonId, userId: me.id })
    .onConflictDoNothing();
  revalidatePath(`/hack/${hack.slug}`);
}

export async function leaveHackathon(hackathonId: string) {
  const me = await requireUser();
  if (!hackathonId) throw new Error("MISSING");
  const [hack] = await db
    .select()
    .from(hackathons)
    .where(eq(hackathons.id, hackathonId));
  await db
    .delete(hackParticipants)
    .where(
      and(
        eq(hackParticipants.hackathonId, hackathonId),
        eq(hackParticipants.userId, me.id)
      )
    );
  // Leaving the hackathon also drops you from any team in it.
  await db.execute(dsql`
    delete from hack_team_member
    where user_id = ${me.id}
      and team_id in (select id from hack_team where hackathon_id = ${hackathonId})
  `);
  if (hack) revalidatePath(`/hack/${hack.slug}`);
}
