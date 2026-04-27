import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  users,
  initiatives,
  subscriptions,
  tags,
  initiativeTags,
} from "./schema";

async function main() {
  const techEmails = (process.env.TECH_TEAM_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const ownerEmail = techEmails[0] ?? "tech@example.com";

  const [owner] = await db
    .insert(users)
    .values({
      email: ownerEmail,
      name: ownerEmail.split("@")[0],
      role: "tech",
    })
    .onConflictDoNothing()
    .returning();

  const ownerId =
    owner?.id ??
    (await db.select().from(users).where(eq(users.email, ownerEmail)))[0]?.id;
  if (!ownerId) throw new Error("Could not create or find seed user");

  const tagSlugs = ["ml", "infra", "frontend", "fun"];
  for (const slug of tagSlugs) {
    await db
      .insert(tags)
      .values({ slug, name: slug })
      .onConflictDoNothing();
  }

  const samples = [
    {
      title: "Internal LLM playground",
      summary: "Spin up a private chat UI on top of our docs. Looking for help indexing content and shaping prompts.",
      body: "## Goals\n- Private chat over our handbook\n- Source citations\n\n## What we need\n- One person to own ingestion\n- Two people to test prompts\n",
      timeCommitment: "~3 hrs/week",
      capacity: 5,
      tagSlugs: ["ml", "fun"],
      status: "open" as const,
    },
    {
      title: "Cut our build times in half",
      summary: "Investigation into CI bottlenecks. Pair-debug welcome.",
      body: "Suspected hot spots: docker image rebuild, test sharding.",
      timeCommitment: "~2 hrs/week",
      capacity: 3,
      tagSlugs: ["infra"],
      status: "in_progress" as const,
    },
    {
      title: "Design a fun internal homepage",
      summary: "What if the company intranet didn't look like a tax form? Designers + frontend, lets play.",
      body: "Open canvas. Bring weird ideas.",
      timeCommitment: "~1 hr/week",
      capacity: 8,
      tagSlugs: ["frontend", "fun"],
      status: "open" as const,
    },
  ];

  for (const s of samples) {
    const [created] = await db
      .insert(initiatives)
      .values({
        ownerId,
        title: s.title,
        summary: s.summary,
        body: s.body,
        status: s.status,
        timeCommitment: s.timeCommitment,
        capacity: s.capacity,
      })
      .returning();

    await db
      .insert(subscriptions)
      .values({ userId: ownerId, initiativeId: created.id, role: "owner" })
      .onConflictDoNothing();

    const allTags = await db.select().from(tags);
    const matched = allTags.filter((t) => s.tagSlugs.includes(t.slug));
    for (const t of matched) {
      await db
        .insert(initiativeTags)
        .values({ initiativeId: created.id, tagId: t.id })
        .onConflictDoNothing();
    }
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
