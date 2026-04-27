import { db } from "@/lib/db";
import { initiatives } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escape(s: string) {
  return s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [row] = await db.select().from(initiatives).where(eq(initiatives.id, id));
  if (!row) return new Response("Not found", { status: 404 });

  const start = row.startsAt ?? row.createdAt;
  const end =
    row.endsAt ?? new Date(start.getTime() + 60 * 60 * 1000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lab Hours//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${row.id}@labhours`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${escape(row.title)}`,
    `DESCRIPTION:${escape(row.summary)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(lines, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="lab-hours-${row.id}.ics"`,
    },
  });
}
