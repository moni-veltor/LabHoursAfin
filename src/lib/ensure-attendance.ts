import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Make sure the register's table is there.
 *
 * This product has no migration history — its schema is kept with
 * `npm run db:push`, which needs somebody at a terminal holding the production
 * connection string. That is a fine way to work and a poor way to ship a
 * feature, because the window between "code is live" and "somebody ran push"
 * is a window where three pages throw.
 *
 * So the one table this feature introduced asserts itself, idempotently, before
 * it is first read. It runs once per server instance, the DDL is all
 * IF NOT EXISTS, and `npm run db:push` remains the real way the schema is
 * managed — this only closes the gap. sql/attendance.sql is the same statement.
 *
 * If you are adding a second table, do not copy this. Put a migration history
 * in place instead; one lazy assertion is a bridge, two is a pattern.
 */
const DDL = [
  `CREATE TABLE IF NOT EXISTS "attendance" (
     "initiative_id" uuid NOT NULL,
     "user_id"       text NOT NULL,
     "present"       boolean DEFAULT true NOT NULL,
     "marked_by_id"  text,
     "marked_at"     timestamp DEFAULT now() NOT NULL,
     CONSTRAINT "attendance_initiative_id_user_id_pk"
       PRIMARY KEY ("initiative_id", "user_id"),
     CONSTRAINT "attendance_initiative_id_initiative_id_fk"
       FOREIGN KEY ("initiative_id") REFERENCES "public"."initiative"("id") ON DELETE cascade,
     CONSTRAINT "attendance_user_id_user_id_fk"
       FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade,
     CONSTRAINT "attendance_marked_by_id_user_id_fk"
       FOREIGN KEY ("marked_by_id") REFERENCES "public"."user"("id") ON DELETE set null
   )`,
  `CREATE INDEX IF NOT EXISTS "attendance_user_idx" ON "attendance" USING btree ("user_id")`,
  `CREATE INDEX IF NOT EXISTS "attendance_present_idx" ON "attendance" USING btree ("present")`,
];

let once: Promise<boolean> | null = null;

/**
 * Returns whether the table is actually there. Callers use it to skip the
 * attendance queries rather than let them throw: a deploy where this could not
 * run should show a product without points, not a My Board that 500s.
 */
export function ensureAttendance(): Promise<boolean> {
  if (!once) {
    once = (async () => {
      for (const stmt of DDL) {
        try {
          await db.execute(sql.raw(stmt));
        } catch (e) {
          // Deliberately swallowed, and this is the important bit: in the
          // steady state the table already exists and this function has
          // nothing to do. If the deploy's database role cannot run DDL, that
          // must not take down a page that would have worked perfectly well.
          //
          // Two cold starts can also race each other even on IF NOT EXISTS
          // (42P07 / 42710 are "already exists"), which is the desired end
          // state rather than a fault. If the table is genuinely missing, the
          // query that follows raises its own, clearer error.
          const code = (e as { code?: string })?.code;
          if (code !== "42P07" && code !== "42710")
            console.error("[ensureAttendance] could not assert schema:", e);
        }
      }
      // Assert the end state rather than assume it: the DDL above may have
      // been refused, and a caller needs to know before it queries.
      try {
        const r = await db.execute(
          sql`SELECT to_regclass('public.attendance') IS NOT NULL AS ok`
        );
        const row = (r as unknown as { ok: boolean }[])[0];
        const ok = Boolean(row?.ok);
        if (!ok) console.error("[ensureAttendance] attendance table is absent");
        return ok;
      } catch (e) {
        console.error("[ensureAttendance] could not check for the table:", e);
        return false;
      }
    })();
  }
  return once;
}
