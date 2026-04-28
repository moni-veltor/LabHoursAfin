import { db } from "@/lib/db";
import { initiatives, updates } from "@/db/schema";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { authoriseCron } from "@/lib/cron";
import { notify } from "@/lib/notifications-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!authoriseCron(req)) return new Response("Unauthorized", { status: 401 });

  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: initiatives.id,
      title: initiatives.title,
      ownerId: initiatives.ownerId,
      lastUpdate: sql<Date>`COALESCE((SELECT MAX(${updates.createdAt}) FROM ${updates} WHERE ${updates.initiativeId} = ${initiatives.id}), ${initiatives.createdAt})`,
    })
    .from(initiatives)
    .where(
      and(
        ne(initiatives.status, "archived"),
        ne(initiatives.status, "done")
      )
    );

  let nudged = 0;
  for (const r of rows) {
    if (new Date(r.lastUpdate) < cutoff) {
      await notify({
        userId: r.ownerId,
        kind: "checkin",
        message: `"${r.title}" hasn't had an update in 14+ days — share something to keep momentum.`,
        url: `/initiatives/${r.id}`,
        initiativeId: r.id,
      });
      nudged++;
    }
  }

  return Response.json({ nudged });
}
