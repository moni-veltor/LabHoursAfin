import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authConfig } from "@/lib/auth.config";
import { isTechTeam } from "@/lib/tech-team";
import { isAdmin } from "@/lib/admin";

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
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Display name", type: "text" },
      },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        if (!email || !email.includes("@")) return null;
        if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) return null;

        const wantedRole = roleFor(email);
        const fallbackName =
          String(creds?.name ?? "").trim() || email.split("@")[0];

        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existing[0]) {
          if (existing[0].role !== wantedRole) {
            await db
              .update(users)
              .set({ role: wantedRole })
              .where(eq(users.id, existing[0].id));
          }
          return {
            id: existing[0].id,
            email,
            name: existing[0].name ?? fallbackName,
            role: wantedRole,
          } as any;
        }

        const [created] = await db
          .insert(users)
          .values({ email, name: fallbackName, role: wantedRole })
          .returning();

        return {
          id: created.id,
          email,
          name: created.name ?? fallbackName,
          role: created.role,
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
