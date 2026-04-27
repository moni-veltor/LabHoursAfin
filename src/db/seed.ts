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
  reactions,
} from "./schema";

type SeedUser = {
  email: string;
  name: string;
  role: "tech" | "member";
  department: string;
};

const TECH_USERS: SeedUser[] = [
  { email: "monica.velasquez@afinbank.com", name: "Monica Velasquez", role: "tech", department: "Engineering" },
  { email: "mohammed.najem@afinbank.com", name: "Mohammed Najem", role: "tech", department: "Data" },
  { email: "emmanuel.sifah@afinbank.com", name: "Emmanuel Sifah", role: "tech", department: "Risk & Security" },
];

const MEMBER_USERS: SeedUser[] = [
  { email: "maria.lopez@afinbank.com", name: "Maria Lopez", role: "member", department: "Product" },
  { email: "jordan.smith@afinbank.com", name: "Jordan Smith", role: "member", department: "Operations" },
  { email: "lin.zhao@afinbank.com", name: "Lin Zhao", role: "member", department: "Marketing" },
  { email: "rafa.morales@afinbank.com", name: "Rafa Morales", role: "member", department: "Finance" },
];

const SEED_USERS = [...TECH_USERS, ...MEMBER_USERS];

type SeedInitiative = {
  ownerEmail: string;
  title: string;
  summary: string;
  outcomes?: string;
  prerequisites?: string;
  body?: string;
  category:
    | "product_engineering"
    | "data_architecture"
    | "ai"
    | "third_parties"
    | "operational_resilience"
    | "information_security"
    | "other";
  subcategory?: string;
  format: "open" | "workshop" | "pairing" | "sessions" | "reading_club" | "async";
  difficulty: "any" | "beginner" | "intermediate" | "advanced";
  effort?: "small" | "medium" | "large";
  status: "open" | "in_progress" | "done";
  capacity?: number;
  timeCommitment: string;
  requiresApproval?: boolean;
  featured?: boolean;
  crossTeam?: boolean;
  isTemplate?: boolean;
  coverImage?: string;
  recordings?: string;
  outcomeBody?: string;
  outcomeLinks?: string;
  tags: string[];
  subscribers: { email: string; role: "subscriber" | "participant" | "pending" }[];
  updates?: { authorEmail: string; body: string; reactions?: { email: string; emoji: string }[] }[];
  comments?: { authorEmail: string; body: string; reactions?: { email: string; emoji: string }[] }[];
};

const M = "monica.velasquez@afinbank.com";
const N = "mohammed.najem@afinbank.com";
const E = "emmanuel.sifah@afinbank.com";

const SEED_INITIATIVES: SeedInitiative[] = [
  // Product Engineering
  {
    ownerEmail: M,
    title: "Build a feature on the core banking platform",
    summary:
      "Pair with the platform team to take a real ledger feature from intake to PR. No prior platform experience needed.",
    outcomes:
      "You'll see how a change moves through design review, code review, CI, and release. You'll have at least one merged PR with your name on it.",
    prerequisites: "Comfortable with reading code (any language). No prior banking knowledge required.",
    body:
      "## What we'll cover\n\n- Repo and dev environment\n- Ticket intake & scoping\n- Pairing on a real change\n- Code review etiquette and CI\n\n## Outcomes\n\nA merged PR. Confidence to take a second one.",
    category: "product_engineering",
    subcategory: "Core Banking Platform",
    format: "pairing",
    difficulty: "intermediate",
    effort: "medium",
    status: "open",
    capacity: 4,
    requiresApproval: true,
    featured: true,
    crossTeam: true,
    coverImage: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=70&auto=format&fit=crop",
    timeCommitment: "~3 hrs/week for 2 weeks",
    tags: ["core-banking", "pairing"],
    subscribers: [
      { email: "maria.lopez@afinbank.com", role: "participant" },
      { email: "jordan.smith@afinbank.com", role: "subscriber" },
      { email: "lin.zhao@afinbank.com", role: "pending" },
    ],
    updates: [
      {
        authorEmail: M,
        body: "Kickoff Friday. Calendar invites going out today.",
        reactions: [
          { email: "maria.lopez@afinbank.com", emoji: "🎉" },
          { email: "jordan.smith@afinbank.com", emoji: "👍" },
        ],
      },
    ],
  },
  {
    ownerEmail: M,
    title: "Improve a CRM workflow end-to-end",
    summary:
      "Pick a CRM journey that's clunky today, redesign it with the team, and ship the change.",
    outcomes:
      "Practical experience with how customer-facing UX changes get scoped, designed, and released safely.",
    category: "product_engineering",
    subcategory: "Customer Relationship Management",
    format: "workshop",
    difficulty: "any",
    effort: "small",
    status: "open",
    capacity: 8,
    timeCommitment: "Two 90-min workshops",
    tags: ["crm", "ux"],
    subscribers: [
      { email: "lin.zhao@afinbank.com", role: "participant" },
      { email: "rafa.morales@afinbank.com", role: "subscriber" },
    ],
  },

  // Data Architecture
  {
    ownerEmail: N,
    title: "Snowflake data quality dashboard",
    summary:
      "Build a small dashboard that flags broken data contracts. Help wanted on schemas and tests.",
    outcomes:
      "Hands-on experience writing dbt-style tests, querying Snowflake, and shipping an internal dashboard.",
    prerequisites: "Some SQL helpful. We'll teach the rest.",
    category: "data_architecture",
    subcategory: "Snowflake",
    format: "pairing",
    difficulty: "beginner",
    effort: "medium",
    status: "in_progress",
    capacity: 5,
    timeCommitment: "~2 hrs/week for 4 weeks",
    tags: ["snowflake", "data-quality", "sql"],
    subscribers: [
      { email: "rafa.morales@afinbank.com", role: "participant" },
      { email: "maria.lopez@afinbank.com", role: "subscriber" },
    ],
    updates: [
      { authorEmail: N, body: "First version live. Two contracts wired up — feedback welcome." },
    ],
  },
  {
    ownerEmail: N,
    title: "Automate monthly finance reports with Python",
    summary:
      "Replace the manual month-end reporting flow with a small Python pipeline. Great for a first scripting project.",
    outcomes:
      "You'll write a real Python script that reads from Snowflake, formats results, and posts them where Finance wants them.",
    prerequisites: "Curiosity. We'll start from `print('hello')` if needed.",
    category: "data_architecture",
    subcategory: "Python scripts",
    format: "sessions",
    difficulty: "beginner",
    effort: "medium",
    status: "open",
    capacity: 6,
    timeCommitment: "~2 hrs/week × 3 weeks",
    tags: ["python", "automation"],
    subscribers: [
      { email: "rafa.morales@afinbank.com", role: "participant" },
      { email: "jordan.smith@afinbank.com", role: "participant" },
    ],
  },
  {
    ownerEmail: N,
    title: "Modernise an ETL pipeline",
    summary: "Move one creaky pipeline to our new pattern. Full-stack data work — extraction, transforms, tests.",
    category: "data_architecture",
    subcategory: "Data transformations",
    format: "pairing",
    difficulty: "intermediate",
    effort: "large",
    status: "open",
    capacity: 3,
    timeCommitment: "~4 hrs/week for 4 weeks",
    tags: ["etl", "data-pipelines"],
    subscribers: [],
  },

  // AI
  {
    ownerEmail: M,
    title: "Internal LLM playground over our handbook",
    summary:
      "Private chat over our internal docs with citations. Need help with ingestion, prompt design, and eval.",
    outcomes:
      "You'll learn how a RAG system is wired together: chunking, embeddings, retrieval, citations, evals.",
    category: "ai",
    subcategory: "LLMs",
    format: "pairing",
    difficulty: "intermediate",
    effort: "large",
    status: "in_progress",
    capacity: 4,
    timeCommitment: "~3 hrs/week",
    tags: ["llm", "rag"],
    subscribers: [
      { email: "maria.lopez@afinbank.com", role: "participant" },
      { email: "lin.zhao@afinbank.com", role: "subscriber" },
    ],
    updates: [
      { authorEmail: M, body: "Handbook ingestion live. Drive next." },
      { authorEmail: M, body: "Citation tooltips shipped. Try it in #ai-lab." },
    ],
  },
  {
    ownerEmail: M,
    title: "Build a customer-support agent prototype",
    summary:
      "Prototype an agent that can triage inbound support tickets and draft replies. Strictly internal demo.",
    outcomes: "Hands-on experience with tool-using agents, prompt engineering, and safety guardrails.",
    category: "ai",
    subcategory: "Agents",
    format: "sessions",
    difficulty: "intermediate",
    effort: "medium",
    status: "open",
    capacity: 4,
    timeCommitment: "~3 hrs/week × 4 weeks",
    tags: ["agents", "support"],
    subscribers: [{ email: "lin.zhao@afinbank.com", role: "participant" }],
  },
  {
    ownerEmail: M,
    title: "Workshop: prompt engineering basics",
    summary:
      "One-hour intro to writing prompts that work. Hands-on, no slides. Bring a real task you want help with.",
    outcomes: "Leave with 2–3 prompts that work for your actual job.",
    category: "ai",
    format: "workshop",
    difficulty: "beginner",
    effort: "small",
    status: "open",
    capacity: 20,
    timeCommitment: "1 hour",
    tags: ["prompts", "learning"],
    subscribers: [
      { email: "maria.lopez@afinbank.com", role: "subscriber" },
      { email: "rafa.morales@afinbank.com", role: "subscriber" },
      { email: "jordan.smith@afinbank.com", role: "subscriber" },
    ],
  },

  // 3rd Parties
  {
    ownerEmail: E,
    title: "Run an annual vendor due diligence cycle",
    summary:
      "Help us run this year's vendor due diligence — tooling, evidence collection, and review packs.",
    outcomes:
      "You'll see exactly what 'good enough' due diligence looks like, what regulators expect, and how we evidence it.",
    category: "third_parties",
    subcategory: "Due diligence",
    format: "workshop",
    difficulty: "any",
    effort: "medium",
    status: "open",
    capacity: 6,
    timeCommitment: "~2 hrs/week × 6 weeks",
    tags: ["due-diligence", "vendor-management"],
    subscribers: [
      { email: "rafa.morales@afinbank.com", role: "participant" },
      { email: "jordan.smith@afinbank.com", role: "subscriber" },
    ],
  },
  {
    ownerEmail: E,
    title: "Vendor stressed-plan review group",
    summary:
      "Read and challenge vendor stressed exit plans together. Risk practice that matters.",
    category: "third_parties",
    subcategory: "Stressed plans",
    format: "reading_club",
    difficulty: "intermediate",
    effort: "small",
    status: "open",
    capacity: 8,
    timeCommitment: "1 hr/week × 4 weeks",
    tags: ["stressed-exit", "risk"],
    subscribers: [{ email: "rafa.morales@afinbank.com", role: "participant" }],
  },

  // Operational Resilience
  {
    ownerEmail: E,
    title: "Tabletop disaster recovery exercise",
    summary:
      "Run a real DR scenario together. Pick the system, simulate the failure, exercise the playbook.",
    outcomes:
      "You'll experience the gap between a plan on paper and a plan you can actually execute under pressure.",
    category: "operational_resilience",
    subcategory: "Disaster Recovery",
    format: "workshop",
    difficulty: "any",
    effort: "small",
    status: "open",
    capacity: 12,
    timeCommitment: "Half-day workshop",
    tags: ["dr", "tabletop", "incident"],
    subscribers: [
      { email: "jordan.smith@afinbank.com", role: "participant" },
      { email: "maria.lopez@afinbank.com", role: "subscriber" },
    ],
  },
  {
    ownerEmail: E,
    title: "Refresh our BCP plan — together",
    summary:
      "Open invitation to help rewrite the business continuity plan. We'll write less; we'll exercise more.",
    category: "operational_resilience",
    subcategory: "Business Continuity",
    format: "pairing",
    difficulty: "any",
    effort: "medium",
    status: "in_progress",
    capacity: 4,
    timeCommitment: "~2 hrs/week × 4 weeks",
    tags: ["bcp", "writing"],
    subscribers: [{ email: "jordan.smith@afinbank.com", role: "participant" }],
  },

  // Information Security
  {
    ownerEmail: E,
    title: "Ethical hacking lunch & learns",
    summary:
      "Monthly hour where we walk through a real attack technique — and how we'd defend against it. Strictly hands-off, education only.",
    outcomes: "You'll come away with intuition for how attackers think.",
    category: "information_security",
    subcategory: "Ethical hacking",
    format: "sessions",
    difficulty: "beginner",
    effort: "small",
    status: "open",
    capacity: 30,
    timeCommitment: "1 hr/month",
    tags: ["security", "lunch-and-learn"],
    subscribers: [
      { email: "maria.lopez@afinbank.com", role: "subscriber" },
      { email: "rafa.morales@afinbank.com", role: "subscriber" },
      { email: "lin.zhao@afinbank.com", role: "subscriber" },
    ],
  },
  {
    ownerEmail: E,
    title: "Threat-model a real internal service",
    summary:
      "Pick an internal service and threat-model it as a group. Outputs go straight into the security backlog.",
    category: "information_security",
    subcategory: "Threat modelling",
    format: "workshop",
    difficulty: "intermediate",
    effort: "small",
    status: "open",
    capacity: 8,
    timeCommitment: "Two 2-hour workshops",
    tags: ["threat-modelling", "security"],
    subscribers: [],
  },

  // Other
  {
    ownerEmail: M,
    title: "How tech actually works — a beginner cohort",
    summary:
      "Five short sessions for non-engineers. We'll demystify servers, databases, deploys, and AI without code.",
    outcomes:
      "You'll be able to follow tech standups and ask sharper questions.",
    category: "other",
    subcategory: "Learn how tech works",
    format: "sessions",
    difficulty: "beginner",
    effort: "small",
    status: "open",
    capacity: 12,
    timeCommitment: "1 hr/week × 5 weeks",
    tags: ["learning"],
    subscribers: [
      { email: "lin.zhao@afinbank.com", role: "participant" },
      { email: "rafa.morales@afinbank.com", role: "participant" },
      { email: "maria.lopez@afinbank.com", role: "subscriber" },
    ],
    comments: [
      {
        authorEmail: "lin.zhao@afinbank.com",
        body: "This is exactly what I've been hoping for.",
        reactions: [
          { email: M, emoji: "❤️" },
          { email: "rafa.morales@afinbank.com", emoji: "👍" },
        ],
      },
    ],
  },

  // A done-with-outcomes example for the Showcase
  {
    ownerEmail: M,
    title: "How does the database actually work — reading club",
    summary:
      "A 4-week reading club for non-engineers. We read short chapters and discuss. No coding.",
    category: "other",
    subcategory: "Learn how tech works",
    format: "reading_club",
    difficulty: "beginner",
    effort: "small",
    status: "done",
    capacity: 10,
    timeCommitment: "~1 hr/week × 4 weeks",
    tags: ["learning", "infra"],
    coverImage: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&q=70&auto=format&fit=crop",
    isTemplate: true,
    recordings:
      "https://example.com/lab-hours/db-club-week-1\nhttps://example.com/lab-hours/db-club-week-4-recap",
    outcomeBody:
      "10 colleagues completed the club. Notes published in #lab-hours. Two participants are now contributing to the data quality dashboard initiative.",
    outcomeLinks:
      "https://example.com/lab-hours/notes-week-1\nhttps://example.com/lab-hours/notes-week-2",
    subscribers: [
      { email: "maria.lopez@afinbank.com", role: "participant" },
      { email: "rafa.morales@afinbank.com", role: "participant" },
      { email: "jordan.smith@afinbank.com", role: "participant" },
    ],
    updates: [
      {
        authorEmail: M,
        body: "Wrapped! Notes published. Thanks to everyone who read along.",
        reactions: [
          { email: "rafa.morales@afinbank.com", emoji: "🎉" },
          { email: "jordan.smith@afinbank.com", emoji: "🎉" },
          { email: "maria.lopez@afinbank.com", emoji: "❤️" },
        ],
      },
    ],
  },
  {
    ownerEmail: N,
    title: "Snowflake quickstart — 90-min workshop",
    summary:
      "Hands-on intro to Snowflake. By the end you'll have written your first useful query against real data.",
    category: "data_architecture",
    subcategory: "Snowflake",
    format: "workshop",
    difficulty: "beginner",
    effort: "small",
    status: "done",
    capacity: 12,
    timeCommitment: "Single 90-min workshop",
    tags: ["snowflake", "sql", "learning"],
    coverImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=70&auto=format&fit=crop",
    isTemplate: true,
    outcomeBody:
      "11 of 12 attendees finished a working query. Recording shared in #lab-hours. Two follow-up sessions requested.",
    outcomeLinks:
      "https://example.com/lab-hours/snowflake-recording",
    recordings:
      "https://example.com/lab-hours/snowflake-recording",
    subscribers: [
      { email: "rafa.morales@afinbank.com", role: "participant" },
      { email: "jordan.smith@afinbank.com", role: "participant" },
    ],
  },
  {
    ownerEmail: M,
    title: "Manage a board: Jira tickets 101",
    summary:
      "Workshop on running a board well. Backlog hygiene, prioritisation, and how to actually finish things.",
    category: "other",
    subcategory: "Manage a board",
    format: "workshop",
    difficulty: "any",
    effort: "small",
    status: "open",
    capacity: 15,
    timeCommitment: "Single 90-min workshop",
    tags: ["jira", "ops"],
    subscribers: [
      { email: "jordan.smith@afinbank.com", role: "participant" },
      { email: "lin.zhao@afinbank.com", role: "subscriber" },
    ],
  },
  {
    ownerEmail: M,
    title: "Build your first app",
    summary:
      "Guided beginner cohort. We'll build and deploy a small full-stack app together. Zero prior coding required.",
    outcomes: "A real, deployed, public app you can show people.",
    category: "other",
    format: "sessions",
    difficulty: "beginner",
    effort: "large",
    status: "open",
    capacity: 5,
    timeCommitment: "~4 hrs/week × 4 weeks",
    tags: ["learning", "build"],
    subscribers: [{ email: "rafa.morales@afinbank.com", role: "participant" }],
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

  console.log("Wiping existing initiatives...");
  await db.delete(initiatives);

  console.log(`Seeding ${SEED_INITIATIVES.length} initiatives...`);
  for (const s of SEED_INITIATIVES) {
    const ownerId = userIdByEmail.get(s.ownerEmail);
    if (!ownerId) throw new Error(`Missing seed user: ${s.ownerEmail}`);

    const [created] = await db
      .insert(initiatives)
      .values({
        ownerId,
        title: s.title,
        summary: s.summary,
        body: s.body ?? "",
        status: s.status,
        category: s.category,
        subcategory: s.subcategory,
        format: s.format,
        difficulty: s.difficulty,
        effort: s.effort,
        outcomes: s.outcomes,
        prerequisites: s.prerequisites,
        capacity: s.capacity,
        timeCommitment: s.timeCommitment,
        requiresApproval: s.requiresApproval ?? false,
        featured: s.featured ?? false,
        crossTeam: s.crossTeam ?? false,
        isTemplate: s.isTemplate ?? false,
        coverImage: s.coverImage,
        recordings: s.recordings,
        outcomeBody: s.outcomeBody,
        outcomeLinks: s.outcomeLinks,
      })
      .returning();

    await db.insert(subscriptions).values({
      userId: ownerId,
      initiativeId: created.id,
      role: "owner",
    });

    for (const sub of s.subscribers) {
      const userId = userIdByEmail.get(sub.email);
      if (!userId || userId === ownerId) continue;
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
      const [created2] = await db
        .insert(updates)
        .values({
          initiativeId: created.id,
          authorId,
          body: u.body,
        })
        .returning();
      for (const r of u.reactions ?? []) {
        const userId = userIdByEmail.get(r.email);
        if (!userId) continue;
        await db
          .insert(reactions)
          .values({
            userId,
            targetType: "update",
            targetId: created2.id,
            emoji: r.emoji,
          })
          .onConflictDoNothing();
      }
    }

    for (const c of s.comments ?? []) {
      const authorId = userIdByEmail.get(c.authorEmail);
      if (!authorId) continue;
      const [created2] = await db
        .insert(comments)
        .values({
          initiativeId: created.id,
          authorId,
          body: c.body,
        })
        .returning();
      for (const r of c.reactions ?? []) {
        const userId = userIdByEmail.get(r.email);
        if (!userId) continue;
        await db
          .insert(reactions)
          .values({
            userId,
            targetType: "comment",
            targetId: created2.id,
            emoji: r.emoji,
          })
          .onConflictDoNothing();
      }
    }
  }

  console.log("\nDone.\n");
  console.log("Tech team (can post initiatives):");
  for (const u of TECH_USERS) {
    console.log(`  ${u.name.padEnd(18)}  ${u.email}`);
  }
  console.log("\nMembers (can subscribe and comment):");
  for (const u of MEMBER_USERS) {
    console.log(`  ${u.name.padEnd(18)}  ${u.email}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
