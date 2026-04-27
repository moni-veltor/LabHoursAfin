export const CATEGORIES = {
  product_engineering: {
    label: "Product Engineering",
    blurb: "Core banking platform, CRM, customer-facing features, internal tools",
    examples: "core banking, CRM, payments, internal tools",
    badge: "bg-blue-100 text-blue-800",
    dot: "bg-blue-500",
  },
  data_architecture: {
    label: "Data Architecture",
    blurb: "Python scripts, Snowflake, data transformations and analytics",
    examples: "ETL, Snowflake, dashboards, data quality",
    badge: "bg-purple-100 text-purple-800",
    dot: "bg-purple-500",
  },
  ai: {
    label: "AI",
    blurb: "LLMs, agents, AI-powered apps and experiments",
    examples: "RAG, agents, LLM apps, prompt engineering",
    badge: "bg-fuchsia-100 text-fuchsia-800",
    dot: "bg-fuchsia-500",
  },
  third_parties: {
    label: "3rd Parties",
    blurb: "Annual due diligence, vendor reviews, stressed plans",
    examples: "due diligence, vendor reviews, exit plans",
    badge: "bg-amber-100 text-amber-900",
    dot: "bg-amber-500",
  },
  operational_resilience: {
    label: "Operational Resilience",
    blurb: "Business continuity, disaster recovery, incident response",
    examples: "BCP, DR, tabletop exercises, incident playbooks",
    badge: "bg-rose-100 text-rose-800",
    dot: "bg-rose-500",
  },
  information_security: {
    label: "Information Security",
    blurb: "Ethical hacking, threat modelling, security reviews",
    examples: "pen testing, threat modelling, security reviews",
    badge: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
  },
  other: {
    label: "Other",
    blurb: "Learn how tech works, manage a board, side projects",
    examples: "learning, ops, fun side-quests",
    badge: "bg-stone-200 text-stone-700",
    dot: "bg-stone-500",
  },
} as const;

export type Category = keyof typeof CATEGORIES;
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];

export const FORMATS = {
  open: { label: "Open / flexible" },
  workshop: { label: "Workshop" },
  pairing: { label: "Pairing" },
  sessions: { label: "Recurring sessions" },
  reading_club: { label: "Reading club" },
  async: { label: "Async / self-paced" },
} as const;
export type Format = keyof typeof FORMATS;
export const FORMAT_KEYS = Object.keys(FORMATS) as Format[];

export const DIFFICULTIES = {
  any: { label: "Open to all" },
  beginner: { label: "Beginner-friendly" },
  intermediate: { label: "Intermediate" },
  advanced: { label: "Advanced" },
} as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES) as Difficulty[];

export const EFFORTS = {
  small: { label: "Small (under 5 hrs total)" },
  medium: { label: "Medium (5–20 hrs)" },
  large: { label: "Large (20+ hrs)" },
} as const;
export type Effort = keyof typeof EFFORTS;
export const EFFORT_KEYS = Object.keys(EFFORTS) as Effort[];
