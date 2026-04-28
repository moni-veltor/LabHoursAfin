import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { asc, isNull } from "drizzle-orm";

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
    .select()
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.name));

  const header = ["name", "email", "role", "department", "jobTitle", "hobbies"];
  const lines = [header.join(",")];
  for (const u of rows) {
    lines.push(
      [u.name, u.email, u.role, u.department, u.jobTitle, u.hobbies]
        .map(csvCell)
        .join(",")
    );
  }
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="lab-hours-people.csv"`,
    },
  });
}
