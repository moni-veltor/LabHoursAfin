import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authConfig } from "@/lib/auth.config";
import { isTechTeam } from "@/lib/tech-team";
import { isAdmin } from "@/lib/admin";
import { verifyPin, isValidPinFormat } from "@/lib/pin";

const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.toLowerCase();

function roleFor(email: string): "admin" | "tech" | "member" {
  if (isAdmin(email)) return "admin";
  if (isTechTeam(email)) return "tech";
  return "member";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Email + PIN",
      credentials: {
        email: { label: "Email", type: "email" },
        pin: { label: "4-digit PIN", type: "password" },
      },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const pin = String(creds?.pin ?? "").trim();
        if (!email || !email.includes("@")) return null;
        if (!isValidPinFormat(pin)) return null;
        if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) return null;

        // Accounts are pre-provisioned with a PIN — no self sign-up.
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        const user = existing[0];
        if (!user || user.deletedAt) return null;
        if (!verifyPin(pin, user.pinHash)) return null;

        const wantedRole = roleFor(email);
        if (user.role !== wantedRole) {
          await db
            .update(users)
            .set({ role: wantedRole })
            .where(eq(users.id, user.id));
        }

        return {
          id: user.id,
          email,
          name: user.name ?? email.split("@")[0],
          role: wantedRole,
        } as any;
      },
    }),
  ],
});

export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session.user as {
    id: string;
    email: string;
    name?: string;
    role: "member" | "tech" | "admin";
  };
}

export async function requireTech() {
  const u = await requireUser();
  const allowed =
    u.role === "tech" ||
    u.role === "admin" ||
    isTechTeam(u.email) ||
    isAdmin(u.email);
  if (!allowed) throw new Error("FORBIDDEN");
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "admin" && !isAdmin(u.email)) throw new Error("FORBIDDEN");
  return u;
}
