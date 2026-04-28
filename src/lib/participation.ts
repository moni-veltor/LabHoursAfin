import { db } from "@/lib/db";
import { initiatives, subscriptions } from "@/db/schema";
import { and, eq, gte, lt, or } from "drizzle-orm";
import type { Category } from "@/lib/categories";

export const TERM_CAP = 2;

export function termKey(d: Date) {
  const y = d.getUTCFullYear();
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

export function termRange(key: string) {
  const [ys, qs] = key.split("-Q");
  const y = Number(ys);
  const q = Number(qs);
  const startMonth = (q - 1) * 3;
  const start = new Date(Date.UTC(y, startMonth, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, startMonth + 3, 1, 0, 0, 0));
  return { start, end };
}

export function previousTermKey(key: string) {
  const [ys, qs] = key.split("-Q");
  const y = Number(ys);
  const q = Number(qs);
  if (q === 1) return `${y - 1}-Q4`;
  return `${y}-Q${q - 1}`;
}

export function nextTermKey(key: string) {
  const [ys, qs] = key.split("-Q");
  const y = Number(ys);
  const q = Number(qs);
  if (q === 4) return `${y + 1}-Q1`;
  return `${y}-Q${q + 1}`;
}

export function termLabel(key: string) {
  const [ys, qs] = key.split("-Q");
  return `Q${qs} ${ys}`;
}

export function formatTermStart(key: string) {
  const { start } = termRange(key);
  return start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export type ParticipationStatus = {
  currentKey: string;
  currentLabel: string;
  previousKey: string;
  previousLabel: string;
  nextKey: string;
  nextStart: string;
  currentSlotsUsed: number;
  currentCategories: Category[];
  previousCategories: Category[];
};

export async function getParticipationStatus(
  userId: string
): Promise<ParticipationStatus> {
  const now = new Date();
  const currentKey = termKey(now);
  const previousKey = previousTermKey(currentKey);
  const nextKey = nextTermKey(currentKey);

  const { start: currentStart, end: currentEnd } = termRange(currentKey);
  const { start: prevStart, end: prevEnd } = termRange(previousKey);

  const [currentRows, previousRows] = await Promise.all([
    db
      .select({ category: initiatives.category })
      .from(subscriptions)
      .innerJoin(initiatives, eq(initiatives.id, subscriptions.initiativeId))
      .where(
        and(
          eq(subscriptions.userId, userId),
          or(
            eq(subscriptions.role, "participant"),
            eq(subscriptions.role, "pending")
          ),
          gte(subscriptions.joinedAt, currentStart),
          lt(subscriptions.joinedAt, currentEnd)
        )
      ),
    db
      .select({ category: initiatives.category })
      .from(subscriptions)
      .innerJoin(initiatives, eq(initiatives.id, subscriptions.initiativeId))
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.role, "participant"),
          gte(subscriptions.joinedAt, prevStart),
          lt(subscriptions.joinedAt, prevEnd)
        )
      ),
  ]);

  const currentCategories = Array.from(
    new Set(currentRows.map((r) => r.category as Category))
  );
  const previousCategories = Array.from(
    new Set(previousRows.map((r) => r.category as Category))
  );

  return {
    currentKey,
    currentLabel: termLabel(currentKey),
    previousKey,
    previousLabel: termLabel(previousKey),
    nextKey,
    nextStart: formatTermStart(nextKey),
    currentSlotsUsed: currentRows.length,
    currentCategories,
    previousCategories,
  };
}

export type RuleVerdict =
  | { ok: true }
  | { ok: false; reason: "TERM_CAP"; message: string }
  | { ok: false; reason: "DUP_CATEGORY"; message: string }
  | { ok: false; reason: "PREV_TERM_CATEGORY"; message: string };

export function checkParticipationRule(
  status: ParticipationStatus,
  category: Category,
  categoryLabel: string
): RuleVerdict {
  if (status.currentSlotsUsed >= TERM_CAP) {
    return {
      ok: false,
      reason: "TERM_CAP",
      message: `You've used both of your slots for ${status.currentLabel}. Next term opens ${status.nextStart}.`,
    };
  }
  if (status.currentCategories.includes(category)) {
    return {
      ok: false,
      reason: "DUP_CATEGORY",
      message: `You're already in a ${categoryLabel} initiative this term — your two slots must be different categories.`,
    };
  }
  if (status.previousCategories.includes(category)) {
    return {
      ok: false,
      reason: "PREV_TERM_CATEGORY",
      message: `Your last term (${status.previousLabel}) already included ${categoryLabel}. To diversify, this category re-opens for you in ${termLabel(nextTermKey(status.currentKey))} (${formatTermStart(nextTermKey(status.currentKey))}).`,
    };
  }
  return { ok: true };
}
