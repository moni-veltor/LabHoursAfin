import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { initiatives, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await auth();
  const me = session?.user as { email?: string } | undefined;
  if (!me) return new Response("Unauthorized", { status: 401 });
  if (!isAdmin(me.email)) return new Response("Forbidden", { status: 403 });

  const rows = await db
    .select({
      id: initiatives.id,
      slug: initiatives.slug,
      title: initiatives.title,
      summary: initiatives.summary,
      status: initiatives.status,
      category: initiatives.category,
      capacity: initiatives.capacity,
      timeCommitment: initiatives.timeCommitment,
      featured: initiatives.featured,
      crossTeam: initiatives.crossTeam,
      createdAt: initiatives.createdAt,
      ownerEmail: users.email,
    })
    .from(initiatives)
    .leftJoin(users, eq(users.id, initiatives.ownerId))
    .orderBy(desc(initiatives.createdAt));

  const header = [
    "id",
    "slug",
    "title",
    "summary",
    "status",
    "category",
    "capacity",
    "timeCommitment",
    "featured",
    "crossTeam",
    "createdAt",
    "ownerEmail",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(header.map((k) => csvCell((r as any)[k])).join(","));
  }
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="lab-hours-initiatives.csv"`,
    },
  });
}
