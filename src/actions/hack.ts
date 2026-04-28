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
} from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
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

  await db.insert(hackathons).values({
    slug,
    name: parsed.name,
    theme: parsed.theme,
    description: parsed.description,
    coverImage: parsed.coverImage,
    tracks: parsed.tracks,
    prizes: parsed.prizes,
    teamCapacity: parsed.teamCapacity,
    startsAt: startsAtRaw ? new Date(startsAtRaw) : null,
    endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
    createdBy: me.id,
    stage: "idea",
  });
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
  const [team] = await db
    .insert(hackTeams)
    .values({ hackathonId, leaderId: me.id, ideaId, name, blurb, track })
    .returning();
  await db.insert(hackTeamMembers).values({ teamId: team.id, userId: me.id });
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
  const members = await db
    .select()
    .from(hackTeamMembers)
    .where(eq(hackTeamMembers.teamId, teamId));
  if (members.length >= hack.teamCapacity) throw new Error("TEAM_FULL");
  await db
    .insert(hackTeamMembers)
    .values({ teamId, userId: me.id })
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
