import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/signin" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth;
      const p = nextUrl.pathname;
      const isPublic =
        p.startsWith("/signin") ||
        p.startsWith("/api/auth") ||
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
