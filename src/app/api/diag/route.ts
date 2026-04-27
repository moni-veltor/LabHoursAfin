export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const present = (k: string) => Boolean(process.env[k] && process.env[k]!.length > 0);
  return Response.json({
    AUTH_SECRET: present("AUTH_SECRET"),
    DATABASE_URL: present("DATABASE_URL"),
    AUTH_URL: process.env.AUTH_URL ?? null,
    TECH_TEAM_EMAILS_set: present("TECH_TEAM_EMAILS"),
    ALLOWED_EMAIL_DOMAIN: process.env.ALLOWED_EMAIL_DOMAIN ?? null,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL ?? null,
  });
}
