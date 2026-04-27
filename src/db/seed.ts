import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  users,
  initiatives,
  subscriptions,
  tags,
  initiativeTags,
  updates,
  comments,
} from "./schema";

type SeedUser = {
  email: string;
  name: string;
  role: "tech" | "member";
  department: string;
};

const SEED_USERS: SeedUser[] = [
  { email: "alex.chen@labhours.dev", name: "Alex Chen", role: "tech", department: "Engineering" },
  { email: "priya.patel@labhours.dev", name: "Priya Patel", role: "tech", department: "Engineering" },
  { email: "diego.rivera@labhours.dev", name: "Diego Rivera", role: "tech", department: "Engineering" },
  { email: "sam.kim@labhours.dev", name: "Sam Kim", role: "tech", department: "ML" },
  { email: "maria.lopez@labhours.dev", name: "Maria Lopez", role: "member", department: "Product" },
  { email: "jordan.smith@labhours.dev", name: "Jordan Smith", role: "member", department: "Ops" },
  { email: "lin.zhao@labhours.dev", name: "Lin Zhao", role: "member", department: "Marketing" },
  { email: "rafa.morales@labhours.dev", name: "Rafa Morales", role: "member", department: "Finance" },
];

type SeedInitiative = {
  ownerEmail: string;
  title: string;
  summary: string;
  body: string;
  status: "open" | "in_progress" | "done";
  capacity?: number;
  timeCommitment: string;
  tags: string[];
  subscribers: { email: string; role: "subscriber" | "participant" }[];
  updates?: { authorEmail: string; body: string }[];
  comments?: { authorEmail: string; body: string }[];
};

const SEED_INITIATIVES: SeedInitiative[] = [
  {
    ownerEmail: "alex.chen@labhours.dev",
    title: "Build a product feature in the core",
    summary:
      "Pick a real feature from the roadmap and ship it end-to-end with the core team. No prior platform experience needed.",
    body:
      "## What you'll do\n\n- Pair with a core engineer for 1–2 weeks\n- Take a real ticket from intake to PR\n- Get a tour of the dev/CI/release pipeline\n\n## Who it's for\n\nAnyone curious how product work actually gets built. We'll match you with something appropriate to your background.",
    status: "open",
    capacity: 6,
    timeCommitment: "~3 hrs/week for 2 weeks",
    tags: ["core", "pairing"],
    subscribers: [
      { email: "maria.lopez@labhours.dev", role: "participant" },
      { email: "jordan.smith@labhours.dev", role: "participant" },
      { email: "lin.zhao@labhours.dev", role: "subscriber" },
    ],
    updates: [
      {
        authorEmail: "alex.chen@labhours.dev",
        body: "Kickoff call this Friday. Sending calendar invites today.",
      },
    ],
    comments: [
      {
        authorEmail: "maria.lopez@labhours.dev",
        body: "Could I shadow before committing as a participant?",
      },
      {
        authorEmail: "alex.chen@labhours.dev",
        body: "Absolutely — drop in on the kickoff call, no commitment.",
      },
    ],
  },
  {
    ownerEmail: "priya.patel@labhours.dev",
    title: "Learning about engineering — pairing weeks",
    summary:
      "Five weeks of structured pairing. Learn how engineers think about debugging, design, and trade-offs by sitting in on real work.",
    body:
      "## Format\n\nEach week pairs you with a different engineer for ~2 hours. Topics rotate:\n\n1. Reading a stack trace from production\n2. Designing an API\n3. Code review etiquette\n4. Debugging a flaky test\n5. Shipping behind a feature flag\n\nNo prep needed. Bring questions.",
    status: "open",
    capacity: 8,
    timeCommitment: "~2 hrs/week × 5 weeks",
    tags: ["learning", "pairing"],
    subscribers: [
      { email: "lin.zhao@labhours.dev", role: "participant" },
      { email: "rafa.morales@labhours.dev", role: "participant" },
      { email: "maria.lopez@labhours.dev", role: "subscriber" },
    ],
    comments: [
      {
        authorEmail: "lin.zhao@labhours.dev",
        body: "This is exactly what I've been hoping for. Sign me up.",
      },
    ],
  },
  {
    ownerEmail: "diego.rivera@labhours.dev",
    title: "Build your first app — beginner cohort",
    summary:
      "We'll guide a small group through building and deploying a tiny full-stack app. Zero prior code experience required.",
    body:
      "## Outcome\n\nBy the end you'll have a deployed, real, publicly-accessible app you built. Bring an idea (or borrow one of ours).\n\n## Stack we'll use\n\n- Next.js + Tailwind\n- A free Postgres on Neon\n- Vercel for deploy\n\n## What we'll cover\n\n- Setting up a dev environment\n- Reading errors without panic\n- Pushing to GitHub and deploying\n- Asking AI for help — well",
    status: "open",
    capacity: 5,
    timeCommitment: "~4 hrs/week for 4 weeks",
    tags: ["learning", "frontend", "fun"],
    subscribers: [
      { email: "jordan.smith@labhours.dev", role: "participant" },
      { email: "rafa.morales@labhours.dev", role: "subscriber" },
    ],
    updates: [
      {
        authorEmail: "diego.rivera@labhours.dev",
        body: "Cohort starts in two weeks. I'll send pre-reading by Sunday.",
      },
    ],
  },
  {
    ownerEmail: "sam.kim@labhours.dev",
    title: "Internal LLM playground",
    summary:
      "Spin up a private chat UI on top of our handbook. Want help with ingestion and prompt-shaping.",
    body:
      "## Goals\n\n- Private chat over our internal docs\n- Source citations on every answer\n- Lives behind SSO\n\n## Help wanted\n\n- One person to own ingestion of Notion + Drive\n- Two people to test prompts and report regressions",
    status: "in_progress",
    capacity: 4,
    timeCommitment: "~3 hrs/week",
    tags: ["ml", "fun"],
    subscribers: [
      { email: "maria.lopez@labhours.dev", role: "participant" },
      { email: "lin.zhao@labhours.dev", role: "subscriber" },
    ],
    updates: [
      {
        authorEmail: "sam.kim@labhours.dev",
        body: "First version up — only ingests handbook so far. Try it and tell me where it's wrong.",
      },
      {
        authorEmail: "sam.kim@labhours.dev",
        body: "Added citation tooltips. Drive ingestion next.",
      },
    ],
  },
  {
    ownerEmail: "priya.patel@labhours.dev",
    title: "Cut our CI build times in half",
    summary:
      "Investigation into where build minutes go. Pair-debug welcome — even if you've never touched our infra.",
    body:
      "Suspected hot spots:\n\n- Docker image rebuild on every push\n- Tests not properly sharded\n- Lint runs twice for some reason\n\nGoal: write up findings and one quick win this month.",
    status: "in_progress",
    capacity: 3,
    timeCommitment: "~2 hrs/week",
    tags: ["infra"],
    subscribers: [
      { email: "alex.chen@labhours.dev", role: "participant" },
    ],
  },
  {
    ownerEmail: "diego.rivera@labhours.dev",
    title: "Design a fun internal homepage",
    summary:
      "What if our intranet didn't look like a tax form? Designers + frontend + anyone with weird ideas.",
    body:
      "Open canvas. Bring weird ideas. We'll mock 3 directions, pick one, ship it.\n\nNo functional requirements yet — that's the point.",
    status: "open",
    capacity: 8,
    timeCommitment: "~1 hr/week",
    tags: ["frontend", "design", "fun"],
    subscribers: [
      { email: "lin.zhao@labhours.dev", role: "participant" },
      { email: "maria.lopez@labhours.dev", role: "subscriber" },
      { email: "rafa.morales@labhours.dev", role: "subscriber" },
    ],
    comments: [
      {
        authorEmail: "lin.zhao@labhours.dev",
        body: "Can we have a leaderboard for who broke prod most often this quarter?",
      },
      {
        authorEmail: "diego.rivera@labhours.dev",
        body: "Now THAT is the energy this initiative needs.",
      },
    ],
  },
  {
    ownerEmail: "sam.kim@labhours.dev",
    title: "ML lunch-and-learns",
    summary:
      "Monthly hour where someone explains an ML topic to non-ML folks. Looking for guest speakers and audience.",
    body:
      "## Format\n\nOne hour, one topic, no math required. Past sessions:\n\n- How embeddings work (intuitively)\n- Why your model lies confidently\n- The cost of a single LLM call\n\n## Help wanted\n\n- Speakers (you don't need to be ML expert — just curious)\n- Notetakers to write up summaries",
    status: "open",
    capacity: 20,
    timeCommitment: "~1 hr/month",
    tags: ["ml", "learning"],
    subscribers: [
      { email: "jordan.smith@labhours.dev", role: "subscriber" },
      { email: "rafa.morales@labhours.dev", role: "subscriber" },
      { email: "lin.zhao@labhours.dev", role: "subscriber" },
    ],
  },
  {
    ownerEmail: "alex.chen@labhours.dev",
    title: "How does the database actually work?",
    summary:
      "A 4-week reading club for non-engineers. We read short chapters and meet to discuss. No coding.",
    body:
      "We'll read selected chapters from *Designing Data-Intensive Applications* and discuss. Topics:\n\n1. What is a database, really?\n2. Indexes — why queries are sometimes slow\n3. Replication and why outages happen\n4. The CAP theorem in plain English\n\nBring questions. We'll keep it grounded with examples from our own systems.",
    status: "done",
    capacity: 10,
    timeCommitment: "~1 hr/week × 4 weeks",
    tags: ["learning", "infra"],
    subscribers: [
      { email: "maria.lopez@labhours.dev", role: "participant" },
      { email: "rafa.morales@labhours.dev", role: "participant" },
    ],
    updates: [
      {
        authorEmail: "alex.chen@labhours.dev",
        body: "Wrapped! Notes published in #lab-hours. Thanks to everyone who read along.",
      },
    ],
  },
];

async function upsertUser(u: SeedUser) {
  const existing = await db.select().from(users).where(eq(users.email, u.email));
  if (existing[0]) {
    await db
      .update(users)
      .set({ name: u.name, role: u.role, department: u.department })
      .where(eq(users.id, existing[0].id));
    return existing[0].id;
  }
  const [row] = await db
    .insert(users)
    .values({ email: u.email, name: u.name, role: u.role, department: u.department })
    .returning();
  return row.id;
}

async function upsertTag(slug: string) {
  const existing = await db.select().from(tags).where(eq(tags.slug, slug));
  if (existing[0]) return existing[0].id;
  const [row] = await db
    .insert(tags)
    .values({ slug, name: slug.replace(/-/g, " ") })
    .returning();
  return row.id;
}

async function main() {
  console.log("Seeding users...");
  const userIdByEmail = new Map<string, string>();
  for (const u of SEED_USERS) {
    const id = await upsertUser(u);
    userIdByEmail.set(u.email, id);
  }

  console.log("Wiping existing initiatives so seed is idempotent...");
  await db.delete(initiatives);

  console.log("Seeding initiatives...");
  for (const s of SEED_INITIATIVES) {
    const ownerId = userIdByEmail.get(s.ownerEmail);
    if (!ownerId) throw new Error(`Missing seed user: ${s.ownerEmail}`);

    const [created] = await db
      .insert(initiatives)
      .values({
        ownerId,
        title: s.title,
        summary: s.summary,
        body: s.body,
        status: s.status,
        capacity: s.capacity,
        timeCommitment: s.timeCommitment,
      })
      .returning();

    await db.insert(subscriptions).values({
      userId: ownerId,
      initiativeId: created.id,
      role: "owner",
    });

    for (const sub of s.subscribers) {
      const userId = userIdByEmail.get(sub.email);
      if (!userId) continue;
      await db
        .insert(subscriptions)
        .values({ userId, initiativeId: created.id, role: sub.role })
        .onConflictDoNothing();
    }

    for (const slug of s.tags) {
      const tagId = await upsertTag(slug);
      await db
        .insert(initiativeTags)
        .values({ initiativeId: created.id, tagId })
        .onConflictDoNothing();
    }

    for (const u of s.updates ?? []) {
      const authorId = userIdByEmail.get(u.authorEmail);
      if (!authorId) continue;
      await db.insert(updates).values({
        initiativeId: created.id,
        authorId,
        body: u.body,
      });
    }

    for (const c of s.comments ?? []) {
      const authorId = userIdByEmail.get(c.authorEmail);
      if (!authorId) continue;
      await db.insert(comments).values({
        initiativeId: created.id,
        authorId,
        body: c.body,
      });
    }
  }

  console.log("Done.");
  console.log("\nMock users you can sign in as:");
  for (const u of SEED_USERS) {
    console.log(`  [${u.role.padEnd(6)}] ${u.name.padEnd(16)}  ${u.email}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
