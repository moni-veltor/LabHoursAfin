import { auth } from "@/lib/auth";
import { isAdmin, isTech } from "@/lib/admin";
import { aiDraftInitiative } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const u = session?.user as { email?: string; role?: string } | undefined;
  if (!u) return new Response("Unauthorized", { status: 401 });
  if (
    u.role !== "tech" &&
    u.role !== "admin" &&
    !isTech(u) &&
    !isAdmin(u)
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const draft = await aiDraftInitiative({
    pitch: String(body.pitch ?? ""),
    category: body.category ?? undefined,
  });
  return Response.json(draft);
}
