import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const techEmails = (process.env.TECH_TEAM_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
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

        const wantedRole = techEmails.includes(email) ? "tech" : "member";
        const fallbackName =
          String(creds?.name ?? "").trim() || email.split("@")[0];

        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existing[0]) {
          if (existing[0].role !== wantedRole && wantedRole === "tech") {
            await db
              .update(users)
              .set({ role: wantedRole })
              .where(eq(users.id, existing[0].id));
          }
          return {
            id: existing[0].id,
            email,
            name: existing[0].name ?? fallbackName,
            role: wantedRole === "tech" ? "tech" : existing[0].role,
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
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        (token as any).role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id;
        (session.user as any).role = (token as any).role ?? "member";
      }
      return session;
    },
  },
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
  if (u.role !== "tech" && u.role !== "admin") throw new Error("FORBIDDEN");
  return u;
}
