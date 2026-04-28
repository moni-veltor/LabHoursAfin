import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;
