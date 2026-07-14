import {
  pgTable,
  text,
  timestamp,
  integer,
  primaryKey,
  pgEnum,
  uuid,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

export const userRole = pgEnum("user_role", ["member", "tech", "admin"]);
export const initiativeStatus = pgEnum("initiative_status", [
  "draft",
  "open",
  "in_progress",
  "done",
  "archived",
]);
export const subscriptionRole = pgEnum("subscription_role", [
  "subscriber",
  "participant",
  "owner",
  "pending",
]);
export const initiativeCategory = pgEnum("initiative_category", [
  "product_engineering",
  "data_architecture",
  "ai",
  "third_parties",
  "operational_resilience",
  "information_security",
  "other",
]);
export const initiativeFormat = pgEnum("initiative_format", [
  "open",
  "workshop",
  "pairing",
  "sessions",
  "reading_club",
  "async",
]);
export const initiativeDifficulty = pgEnum("initiative_difficulty", [
  "any",
  "beginner",
  "intermediate",
  "advanced",
]);
export const initiativeEffort = pgEnum("initiative_effort", [
  "small",
  "medium",
  "large",
]);

export const users = pgTable("user", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: userRole("role").notNull().default("member"),
  pinHash: text("pin_hash"),
  department: text("department"),
  jobTitle: text("job_title"),
  hobbies: text("hobbies"),
  bio: text("bio"),
  askMeAbout: text("ask_me_about"),
  pronouns: text("pronouns"),
  dateOfBirth: timestamp("date_of_birth", { mode: "date" }),
  zodiac: text("zodiac"),
  chineseZodiac: text("chinese_zodiac"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (a) => [primaryKey({ columns: [a.provider, a.providerAccountId] })]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

export const initiatives = pgTable(
  "initiative",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    body: text("body").notNull().default(""),
    status: initiativeStatus("status").notNull().default("draft"),
    category: initiativeCategory("category").notNull().default("other"),
    subcategory: text("subcategory"),
    format: initiativeFormat("format").notNull().default("open"),
    difficulty: initiativeDifficulty("difficulty").notNull().default("any"),
    effort: initiativeEffort("effort"),
    outcomes: text("outcomes"),
    prerequisites: text("prerequisites"),
    capacity: integer("capacity"),
    timeCommitment: text("time_commitment"),
    subscriptionsOpenAt: timestamp("subscriptions_open_at"),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    crossTeam: boolean("cross_team").notNull().default(false),
    isTemplate: boolean("is_template").notNull().default(false),
    awaitingReview: boolean("awaiting_review").notNull().default(false),
    commentsLocked: boolean("comments_locked").notNull().default(false),
    customCategorySlug: text("custom_category_slug"),
    pinnedCommentId: uuid("pinned_comment_id"),
    slug: text("slug"),
    coverImage: text("cover_image"),
    recordings: text("recordings"),
    aiSummary: text("ai_summary"),
    aiSummaryAt: timestamp("ai_summary_at"),
    outcomeBody: text("outcome_body"),
    outcomeLinks: text("outcome_links"),
    lessonsLearned: text("lessons_learned"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("initiative_status_idx").on(t.status),
    index("initiative_category_idx").on(t.category),
    index("initiative_featured_idx").on(t.featured),
    index("initiative_template_idx").on(t.isTemplate),
    index("initiative_slug_idx").on(t.slug),
    index("initiative_owner_idx").on(t.ownerId),
  ]
);

export const subscriptions = pgTable(
  "subscription",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => initiatives.id, { onDelete: "cascade" }),
    role: subscriptionRole("role").notNull().default("subscriber"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    applicationNote: text("application_note"),
    declineReason: text("decline_reason"),
    waitlistPosition: integer("waitlist_position"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.initiativeId] }),
    index("subscription_user_role_idx").on(t.userId, t.role),
    index("subscription_role_idx").on(t.role),
    index("subscription_initiative_role_idx").on(t.initiativeId, t.role),
  ]
);

export const updates = pgTable("update", {
  id: uuid("id").primaryKey().defaultRandom(),
  initiativeId: uuid("initiative_id")
    .notNull()
    .references(() => initiatives.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const comments = pgTable("comment", {
  id: uuid("id").primaryKey().defaultRandom(),
  initiativeId: uuid("initiative_id")
    .notNull()
    .references(() => initiatives.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  parentId: uuid("parent_id"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tags = pgTable("tag", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const initiativeTags = pgTable(
  "initiative_tag",
  {
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => initiatives.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.initiativeId, t.tagId] })]
);

export const notificationPrefs = pgTable(
  "notification_pref",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    enabled: boolean("enabled").notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind] })]
);

export const reactions = pgTable(
  "reaction",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.targetType, t.targetId, t.emoji] }),
    index("reaction_target_idx").on(t.targetType, t.targetId),
  ]
);

export const customCategories = pgTable("custom_category", {
  slug: text("slug").primaryKey(),
  label: text("label").notNull(),
  blurb: text("blurb"),
  badge: text("badge"),
  dot: text("dot"),
  sortOrder: integer("sort_order").notNull().default(100),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    initiativeId: uuid("initiative_id"),
    sourceUserId: text("source_user_id"),
    message: text("message").notNull(),
    url: text("url"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notification_user_idx").on(t.userId, t.readAt)]
);

export const auditEvents = pgTable(
  "audit_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").references(() => users.id),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    payload: text("payload"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_event_idx").on(t.createdAt)]
);

export const interests = pgTable(
  "interest",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => initiatives.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.initiativeId] })]
);

export const initiativeCitations = pgTable(
  "initiative_citation",
  {
    initiativeId: uuid("initiative_id")
      .notNull()
      .references(() => initiatives.id, { onDelete: "cascade" }),
    citesId: uuid("cites_id")
      .notNull()
      .references(() => initiatives.id, { onDelete: "cascade" }),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.initiativeId, t.citesId] })]
);

export const participationOverrides = pgTable(
  "participation_override",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    termKey: text("term_key").notNull(),
    extraSlots: integer("extra_slots").notNull().default(1),
    grantedBy: text("granted_by").references(() => users.id),
    grantedAt: timestamp("granted_at").notNull().defaultNow(),
    reason: text("reason"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.termKey] })]
);

export const settings = pgTable("setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const reports = pgTable(
  "report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reporterId: text("reporter_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at"),
  },
  (t) => [index("report_status_idx").on(t.status)]
);

export const announcements = pgTable("announcement", {
  id: uuid("id").primaryKey().defaultRandom(),
  body: text("body").notNull(),
  createdBy: text("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  active: boolean("active").notNull().default(true),
});

export const hackathonStage = pgEnum("hackathon_stage", [
  "draft",
  "idea",
  "team_forming",
  "build",
  "demo",
  "voting",
  "done",
]);

export const hackathons = pgTable(
  "hackathon",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    theme: text("theme"),
    description: text("description"),
    coverImage: text("cover_image"),
    tracks: text("tracks"),
    stage: hackathonStage("stage").notNull().default("draft"),
    teamCapacity: integer("team_capacity").notNull().default(5),
    prizes: text("prizes"),
    subscriptionsOpenAt: timestamp("subscriptions_open_at"),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("hackathon_stage_idx").on(t.stage)]
);

export const hackIdeas = pgTable(
  "hack_idea",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hackathonId: uuid("hackathon_id")
      .notNull()
      .references(() => hackathons.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    body: text("body"),
    track: text("track"),
    teamId: uuid("team_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("hack_idea_hack_idx").on(t.hackathonId)]
);

export const hackTeams = pgTable(
  "hack_team",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hackathonId: uuid("hackathon_id")
      .notNull()
      .references(() => hackathons.id, { onDelete: "cascade" }),
    leaderId: text("leader_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ideaId: uuid("idea_id"),
    name: text("name").notNull(),
    track: text("track"),
    blurb: text("blurb"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("hack_team_hack_idx").on(t.hackathonId)]
);

export const hackTeamMembers = pgTable(
  "hack_team_member",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => hackTeams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.userId] })]
);

export const hackDemos = pgTable("hack_demo", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => hackTeams.id, { onDelete: "cascade" })
    .unique(),
  body: text("body").notNull(),
  links: text("links"),
  coverImage: text("cover_image"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export const hackVotes = pgTable(
  "hack_vote",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    demoId: uuid("demo_id")
      .notNull()
      .references(() => hackDemos.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.demoId, t.category] })]
);

export const hackAwards = pgTable("hack_award", {
  id: uuid("id").primaryKey().defaultRandom(),
  hackathonId: uuid("hackathon_id")
    .notNull()
    .references(() => hackathons.id, { onDelete: "cascade" }),
  demoId: uuid("demo_id").references(() => hackDemos.id, {
    onDelete: "cascade",
  }),
  kind: text("kind").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const hackParticipants = pgTable(
  "hack_participant",
  {
    hackathonId: uuid("hackathon_id")
      .notNull()
      .references(() => hackathons.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.hackathonId, t.userId] }),
    index("hack_participant_hack_idx").on(t.hackathonId),
  ]
);

export const hackJudges = pgTable(
  "hack_judge",
  {
    hackathonId: uuid("hackathon_id")
      .notNull()
      .references(() => hackathons.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    selected: boolean("selected").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.hackathonId, t.userId] }),
    index("hack_judge_hack_idx").on(t.hackathonId),
  ]
);

export const initiativesRelations = relations(initiatives, ({ one, many }) => ({
  owner: one(users, { fields: [initiatives.ownerId], references: [users.id] }),
  subscriptions: many(subscriptions),
  updates: many(updates),
  comments: many(comments),
  tags: many(initiativeTags),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  initiative: one(initiatives, {
    fields: [subscriptions.initiativeId],
    references: [initiatives.id],
  }),
}));

export const updatesRelations = relations(updates, ({ one }) => ({
  initiative: one(initiatives, {
    fields: [updates.initiativeId],
    references: [initiatives.id],
  }),
  author: one(users, { fields: [updates.authorId], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  initiative: one(initiatives, {
    fields: [comments.initiativeId],
    references: [initiatives.id],
  }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const initiativeTagsRelations = relations(initiativeTags, ({ one }) => ({
  initiative: one(initiatives, {
    fields: [initiativeTags.initiativeId],
    references: [initiatives.id],
  }),
  tag: one(tags, { fields: [initiativeTags.tagId], references: [tags.id] }),
}));
