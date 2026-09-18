import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { effectiveRole, type Role } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The door from the tech-team hub — one login for the collection.
 *
 * Same crossing the Academy accepts: the hub signs a sixty-second, single-
 * use HMAC token naming the person; we verify it, make sure they exist,
 * mint this app's own session cookie and put them where they were going.
 * The PIN screen survives as a fallback, but nobody needs a second
 * credential to get here any more.
 */

type Handoff = {
  email: string;
  name: string;
  hubRole: string;
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
  if (!handoff) return NextResponse.redirect(new URL("/signin", req.url));

  // Single use: the unique insert is the lock.
  if (handoff.jti) {
    try {
      await db.execute(sql`insert into sso_ticket (jti) values (${handoff.jti})`);
      await db.execute(sql`delete from sso_ticket where at < now() - interval '10 minutes'`);
    } catch {
      return NextResponse.redirect(new URL("/signin", req.url));
    }
  }

  const email = (ALIASES[handoff.email.toLowerCase()] ?? handoff.email).toLowerCase();

  const existing = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];

  // Hub roles map down, never down-grade: ADMIN → admin, LEAD → tech, else
  // member — and effectiveRole still applies its email floor.
  const wanted: Role =
    handoff.hubRole === "ADMIN" ? "admin" : handoff.hubRole === "LEAD" ? "tech" : "member";
  const RANK: Record<Role, number> = { member: 0, tech: 1, admin: 2 };

  let user = existing;
  if (!user) {
    user = (
      await db
        .insert(users)
        .values({ email, name: handoff.name || email.split("@")[0], role: wanted })
        .returning()
    )[0];
  } else if (RANK[wanted] > RANK[(user.role ?? "member") as Role]) {
    await db.update(users).set({ role: wanted }).where(eq(users.id, user.id));
    user = { ...user, role: wanted };
  }
  if (user.deletedAt) return NextResponse.redirect(new URL("/signin", req.url));

  const role = effectiveRole(email, (user.role ?? "member") as Role);

  // Mint the session this app's own sign-in would have minted: same shape
  // the jwt callback produces, encoded with the cookie's name as salt, which
  // is how Auth.js v5 keys its tokens.
  const secure = req.nextUrl.protocol === "https:";
  const cookieName = secure ? "__Secure-authjs.session-token" : "authjs.session-token";
  const maxAge = 30 * 24 * 60 * 60;
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
