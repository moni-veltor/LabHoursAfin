import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/signin" },
  // Twelve hours, and never extended. The hub re-reads a person's row on every
  // page, so switching them off there is immediate; this app cannot ask the
  // hub, so the session is what bounds it. A rolling session would let
  // somebody switched off in People stay in for as long as they kept clicking —
  // updateAge equal to maxAge means the expiry set at the crossing is final.
  session: { strategy: "jwt", maxAge: 12 * 60 * 60, updateAge: 12 * 60 * 60 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth;
      const p = nextUrl.pathname;
      const isPublic =
        p.startsWith("/signin") ||
        p.startsWith("/api/auth") ||
        p.startsWith("/api/sso") ||
        p.startsWith("/api/diag") ||
        p.startsWith("/_next") ||
        p === "/favicon.ico";
      if (isPublic) return true;
      return isLoggedIn;
    },
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
} satisfies NextAuthConfig;
