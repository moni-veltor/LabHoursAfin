-- The register: who actually turned up.
--
-- This project keeps its schema with `npm run db:push`, not a migration
-- history, so this file is the statement of record for one change rather than
-- a numbered migration. Running db:push applies exactly this.
--
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS "attendance" (
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
);

CREATE INDEX IF NOT EXISTS "attendance_user_idx"    ON "attendance" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "attendance_present_idx" ON "attendance" USING btree ("present");
