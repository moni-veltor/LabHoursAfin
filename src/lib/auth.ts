import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { sendMagicLink } from "@/lib/email";
import { eq } from "drizzle-orm";

const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;
const techEmails = (process.env.TECH_TEAM_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  pages: { signIn: "/signin", verifyRequest: "/signin?check=1" },
  providers: [
    {
      id: "email",
      type: "email",
      name: "Email",
      maxAge: 24 * 60 * 60,
      from: process.env.EMAIL_FROM!,
      server: {},
      options: {},
      sendVerificationRequest: async ({ identifier, url }) => {
        await sendMagicLink(identifier, url);
      },
    } as any,
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (allowedDomain && !email.endsWith(`@${allowedDomain.toLowerCase()}`)) {
        return false;
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
        (session.user as any).role = (user as any).role ?? "member";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return;
      const role = techEmails.includes(email) ? "tech" : "member";
      if (role !== "member") {
        await db.update(users).set({ role }).where(eq(users.id, user.id!));
      }
    },
  },
});

export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session.user as { id: string; email: string; name?: string; role: "member" | "tech" | "admin" };
}

export async function requireTech() {
  const u = await requireUser();
  if (u.role !== "tech" && u.role !== "admin") throw new Error("FORBIDDEN");
  return u;
}
