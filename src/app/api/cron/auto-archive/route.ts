import { db } from "@/lib/db";
import { initiatives, updates } from "@/db/schema";
import { and, eq, lt, ne, sql } from "drizzle-orm";
import { authoriseCron } from "@/lib/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!authoriseCron(req)) return new Response("Unauthorized", { status: 401 });

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const candidates = await db
    .select({
      id: initiatives.id,
      lastUpdate: sql<Date>`COALESCE((SELECT MAX(${updates.createdAt}) FROM ${updates} WHERE ${updates.initiativeId} = ${initiatives.id}), ${initiatives.createdAt})`,
    })
    .from(initiatives)
    .where(and(ne(initiatives.status, "archived"), ne(initiatives.status, "done")));

  const archived: string[] = [];
  for (const c of candidates) {
    const last = new Date(c.lastUpdate);
    if (last < ninetyDaysAgo) {
      await db
        .update(initiatives)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(initiatives.id, c.id));
      archived.push(c.id);
    }
  }

  return Response.json({ archived: archived.length, ids: archived });
}
