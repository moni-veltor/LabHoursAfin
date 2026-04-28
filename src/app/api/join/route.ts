import { requestToJoin } from "@/actions/approvals";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const me = session?.user as { id?: string } | undefined;
  if (!me?.id) return new Response("Unauthorized", { status: 401 });
  const limit = rateLimit(`join:${me.id}`, 20, 60_000);
  if (!limit.ok) {
    return new Response(`Slow down — try again in ${limit.retryAfter}s`, {
      status: 429,
    });
  }

  const body = await req.json().catch(() => ({}));
  const initiativeId = String(body?.initiativeId ?? "");
  const note = body?.note ? String(body.note) : undefined;
  if (!initiativeId) return new Response("missing", { status: 400 });
  try {
    await requestToJoin(initiativeId, note);
    return new Response("ok");
  } catch (e: any) {
    return new Response(e?.message ?? "error", { status: 400 });
  }
}
