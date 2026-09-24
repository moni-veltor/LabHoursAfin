import { db } from "@/lib/db";
import {
  attendance,
  initiatives,
  notifications,
  subscriptions,
} from "@/db/schema";
import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { authoriseCron } from "@/lib/cron";
import { notify } from "@/lib/notifications-server";
import { RULES } from "@/lib/points";
import { ensureAttendance } from "@/lib/ensure-attendance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Who turned up?"
 *
 * Points are only as good as the registers behind them, and a register is the
 * kind of admin that never happens unless something asks for it. This finds
 * sessions that have run, had people signed up, and were never marked, and
 * asks the owner once.
 *
 * Once, not daily — a nudge that repeats is a nudge that gets muted, and the
 * check below is what keeps it to one per session. Sessions older than a
 * fortnight are left alone; by then nobody remembers who was in the room, and
 * a guessed register is worse than none.
 */
export async function POST(req: Request) {
  if (!authoriseCron(req)) return new Response("Unauthorized", { status: 401 });
  if (!(await ensureAttendance()))
    return Response.json({ error: "attendance table absent" }, { status: 503 });

  const now = new Date();
  const fortnightAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: initiatives.id,
      title: initiatives.title,
      ownerId: initiatives.ownerId,
      signedUp: sql<number>`(
        SELECT COUNT(*) FROM ${subscriptions}
        WHERE ${subscriptions.initiativeId} = ${initiatives.id}
          AND ${subscriptions.role} = 'participant'
      )`,
      marked: sql<number>`(
        SELECT COUNT(*) FROM ${attendance}
        WHERE ${attendance.initiativeId} = ${initiatives.id}
      )`,
      asked: sql<number>`(
        SELECT COUNT(*) FROM ${notifications}
        WHERE ${notifications.initiativeId} = ${initiatives.id}
          AND ${notifications.kind} = 'register'
      )`,
    })
    .from(initiatives)
    .where(
      and(
        isNotNull(initiatives.startsAt),
        lt(initiatives.startsAt, now),
        gte(initiatives.startsAt, fortnightAgo)
      )
    );

  let asked = 0;
  for (const r of rows) {
    if (Number(r.signedUp) === 0) continue; // nobody to mark
    if (Number(r.marked) > 0) continue; //     already taken
    if (Number(r.asked) > 0) continue; //      already asked, once is enough
    await notify({
      userId: r.ownerId,
      kind: "register",
      message: `"${r.title}" has run — take the register so the ${r.signedUp} who came get their ${RULES.attended.points} points.`,
      url: `/initiatives/${r.id}`,
      initiativeId: r.id,
    });
    asked++;
  }

  return Response.json({ considered: rows.length, asked });
}
