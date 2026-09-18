import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { count, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { initiatives } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One line for the hub's springboard, so this tile stops being silent.
 * Same shared secret as the SSO crossing; answers nothing to the open
 * internet.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.SSO_SECRET;
  const sent = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(sent);
  const b = Buffer.from(secret ?? "");
  if (!secret || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const [row] = await db
    .select({ n: count() })
    .from(initiatives)
    .where(inArray(initiatives.status, ["open", "in_progress"]));
  const live = row?.n ?? 0;

  return NextResponse.json({
    live,
    line: live > 0 ? `${live} initiative${live === 1 ? "" : "s"} live` : null,
  });
}
