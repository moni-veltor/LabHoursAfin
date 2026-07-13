import { resetUserPin } from "@/actions/admin-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const fd = await req.formData();
  try {
    const pin = await resetUserPin(String(fd.get("userId")));
    return Response.json({ pin });
  } catch (e: any) {
    return new Response(e?.message ?? "error", { status: 400 });
  }
}
