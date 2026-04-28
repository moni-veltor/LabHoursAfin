import { requestToJoin } from "@/actions/approvals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
