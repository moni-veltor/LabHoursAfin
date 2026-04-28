import { deleteUser } from "@/actions/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const fd = await req.formData();
  try {
    await deleteUser(fd);
    return new Response("ok");
  } catch (e: any) {
    return new Response(e?.message ?? "error", { status: 400 });
  }
}
