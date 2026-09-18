import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Sessions, and nothing else.
 *
 * Labhours no longer signs anybody in. People, on the tech-team hub, controls
 * access to the estate: you sign in there, and /api/sso mints this app's
 * session from the hub's signed handoff, with the role the hub decided. There
 * is no PIN here any more — a second way in would be a second access control,
 * and somebody switched off in People could still have walked in with it.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [],
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

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "admin") throw new Error("FORBIDDEN");
  return u;
}
