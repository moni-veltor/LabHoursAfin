import { db } from "@/lib/db";
import { initiatives, subscriptions } from "@/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { authoriseCron } from "@/lib/cron";
import { notify } from "@/lib/notifications-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!authoriseCron(req)) return new Response("Unauthorized", { status: 401 });
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const stale = await db
    .select({
      userId: subscriptions.userId,
      initiativeId: subscriptions.initiativeId,
      title: initiatives.title,
    })
    .from(subscriptions)
    .innerJoin(initiatives, eq(initiatives.id, subscriptions.initiativeId))
    .where(
      and(
        eq(subscriptions.role, "pending"),
        lt(subscriptions.joinedAt, cutoff)
      )
    );

  for (const s of stale) {
    await db
      .delete(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, s.userId),
          eq(subscriptions.initiativeId, s.initiativeId),
          eq(subscriptions.role, "pending")
        )
      );
    await notify({
      userId: s.userId,
      kind: "expired",
      message: `Your application to "${s.title}" expired (no decision in 14 days). Your slot is back.`,
      url: `/initiatives/${s.initiativeId}`,
      initiativeId: s.initiativeId,
    });
  }

  return Response.json({ expired: stale.length });
}
