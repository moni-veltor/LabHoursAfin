import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { roleFromHub } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The door from the tech-team hub — one login for the collection.
 *
 * Same crossing the Academy accepts: the hub signs a sixty-second, single-
 * use HMAC token naming the person; we verify it, make sure they exist,
 * mint this app's own session cookie and put them where they were going.
 *
 * It is the only way in. People, on the hub, controls access: who may cross,
 * and as which Labhours role. So the role and the name are applied as the hub
 * sends them — raised or lowered — and the session is short, so switching
 * somebody off in People reaches here within the day rather than the month.
 */

type Handoff = {
  email: string;
  name: string;
  hubRole: string;
  /** The Labhours role People gave them. Older hubs do not send it. */
  labhoursRole?: string;
  /** Where the hub wanted them to land — a path on this app. */
  to?: string;
  jti?: string;
  iat: number;
  exp: number;
};

// The hub knows the CTO as cto@; this app has always known her by name.
// One person, one row — the alias keeps her initiatives attached to her.
const ALIASES: Record<string, string> = {
  "cto@afinbank.com": "monica.velasquez@afinbank.com",
};

function verify(token: string, secret: string): Handoff | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const want = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Handoff;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.email !== "string" || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.SSO_SECRET;
  const authSecret = process.env.AUTH_SECRET;
  if (!secret || !authSecret) {
    return NextResponse.json({ error: "SSO is not configured" }, { status: 500 });
  }

  const handoff = verify(req.nextUrl.searchParams.get("token") ?? "", secret);
  if (!handoff) return NextResponse.redirect(new URL("/signin?error=handoff", req.url));

  // Single use: the unique insert is the lock.
  if (handoff.jti) {
    try {
      await db.execute(sql`insert into sso_ticket (jti) values (${handoff.jti})`);
      await db.execute(sql`delete from sso_ticket where at < now() - interval '10 minutes'`);
    } catch {
      return NextResponse.redirect(new URL("/signin?error=handoff", req.url));
    }
  }

  const email = (ALIASES[handoff.email.toLowerCase()] ?? handoff.email).toLowerCase();

  const existing = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];

  // The hub's decision, applied as sent. Somebody Labhours had removed is
  // restored: if People lets them cross, they are allowed in.
  const role = roleFromHub(handoff);
  const name = handoff.name || email.split("@")[0];

  let user = existing;
  if (!user) {
    user = (await db.insert(users).values({ email, name, role }).returning())[0];
  } else if (user.role !== role || user.name !== name || user.deletedAt) {
    user = (
      await db.update(users).set({ role, name, deletedAt: null }).where(eq(users.id, user.id)).returning()
    )[0];
  }

  // Mint the session this app's own sign-in would have minted: same shape
  // the jwt callback produces, encoded with the cookie's name as salt, which
  // is how Auth.js v5 keys its tokens.
  const secure = req.nextUrl.protocol === "https:";
  const cookieName = secure ? "__Secure-authjs.session-token" : "authjs.session-token";
  // Twelve hours, as on the hub: a role changed or access removed in People
  // takes effect here by the next working day at the latest.
  const maxAge = 12 * 60 * 60;
  const session = await encode({
    token: { sub: user.id, id: user.id, role, name: user.name ?? email, email },
    secret: authSecret,
    salt: cookieName,
    maxAge,
  });

  const to = handoff.to && handoff.to.startsWith("/") && !handoff.to.startsWith("//") ? handoff.to : "/";
  const res = NextResponse.redirect(new URL(to, req.url));
  res.cookies.set({
    name: cookieName,
    value: session,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge,
  });
  return res;
}
