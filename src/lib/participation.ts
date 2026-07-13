import { db } from "@/lib/db";
import { initiatives, participationOverrides, subscriptions } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";

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

export type ActiveParticipation = {
  id: string;
  title: string;
  category: string;
};

export type ParticipationStatus = {
  // How many initiatives the user is currently in (not yet completed).
  activeCount: number;
  // Max concurrent initiatives (TERM_CAP plus any admin-granted extra slots).
  cap: number;
  extraSlots: number;
  // How many initiatives the user has finished (reached "done").
  completedCount: number;
  // The active ones, for display.
  active: ActiveParticipation[];
};

/**
 * Concurrent-participation model: a member may be in at most `cap` initiatives
 * at once. An initiative stops counting once it's marked "done" (completed) or
 * "archived", which frees a slot — so to take on another, you finish one first.
 */
export async function getParticipationStatus(
  userId: string
): Promise<ParticipationStatus> {
  const now = new Date();

  const [rows, override] = await Promise.all([
    db
      .select({
        id: initiatives.id,
        title: initiatives.title,
        status: initiatives.status,
        category: initiatives.category,
        custom: initiatives.customCategorySlug,
      })
      .from(subscriptions)
      .innerJoin(initiatives, eq(initiatives.id, subscriptions.initiativeId))
      .where(
        and(
          eq(subscriptions.userId, userId),
          or(
            eq(subscriptions.role, "participant"),
            eq(subscriptions.role, "pending")
          )
        )
      ),
    db
      .select()
      .from(participationOverrides)
      .where(
        and(
          eq(participationOverrides.userId, userId),
          eq(participationOverrides.termKey, termKey(now))
        )
      ),
  ]);

  const active = rows.filter(
    (r) => r.status !== "done" && r.status !== "archived"
  );
  const completedCount = rows.filter((r) => r.status === "done").length;
  const extraSlots = override[0]?.extraSlots ?? 0;

  return {
    activeCount: active.length,
    cap: TERM_CAP + extraSlots,
    extraSlots,
    completedCount,
    active: active.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.custom ?? r.category,
    })),
  };
}

export type RuleVerdict =
  | { ok: true }
  | { ok: false; reason: "ACTIVE_CAP"; message: string };

export function checkParticipationRule(
  status: ParticipationStatus
): RuleVerdict {
  if (status.activeCount >= status.cap) {
    const n = status.activeCount;
    return {
      ok: false,
      reason: "ACTIVE_CAP",
      message: `You're already in ${n} initiative${n === 1 ? "" : "s"} at once (the limit is ${status.cap}). Finish one — it needs to be marked done — before subscribing to another.`,
    };
  }
  return { ok: true };
}
