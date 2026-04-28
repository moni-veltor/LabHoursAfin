import { db } from "@/lib/db";
import { auditEvents } from "@/db/schema";

export async function logAudit(
  actorId: string | null,
  action: string,
  target?: { type?: string; id?: string },
  payload?: any
) {
  try {
    await db.insert(auditEvents).values({
      actorId: actorId ?? undefined,
      action,
      targetType: target?.type,
      targetId: target?.id,
      payload: payload != null ? JSON.stringify(payload) : null,
    });
  } catch (e) {
    console.error("[audit] failed:", e);
  }
}
