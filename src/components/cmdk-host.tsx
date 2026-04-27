import { db } from "@/lib/db";
import { initiatives } from "@/db/schema";
import { ne, desc } from "drizzle-orm";
import { CmdK } from "./cmdk";

export async function CmdKHost() {
  const items = await db
    .select({
      id: initiatives.id,
      title: initiatives.title,
      category: initiatives.category,
    })
    .from(initiatives)
    .where(ne(initiatives.status, "archived"))
    .orderBy(desc(initiatives.createdAt))
    .limit(80);
  return <CmdK items={items} />;
}
