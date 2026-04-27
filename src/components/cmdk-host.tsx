import { db } from "@/lib/db";
import { initiatives } from "@/db/schema";
import { ne, desc } from "drizzle-orm";
import { CmdK } from "./cmdk";

export async function CmdKHost() {
  let items: { id: string; title: string; category: string }[] = [];
  try {
    items = await db
      .select({
        id: initiatives.id,
        title: initiatives.title,
        category: initiatives.category,
      })
      .from(initiatives)
      .where(ne(initiatives.status, "archived"))
      .orderBy(desc(initiatives.createdAt))
      .limit(80);
  } catch (e) {
    console.error("[CmdKHost] db query failed:", e);
  }
  return <CmdK items={items} />;
}
