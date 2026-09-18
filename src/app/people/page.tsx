import { redirect } from "next/navigation";
import { hub } from "@/lib/hub";

/**
 * People moved to the hub. The address stays so the rail, the command
 * palette and anybody's bookmark still arrive — with their search intact,
 * translated to the hub's names for the same filters.
 *
 * Managing Labhours accounts did not move: that is /admin/people.
 */
export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dept?: string; hobby?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const next = new URLSearchParams();
  if (sp.q) next.set("q", sp.q);
  if (sp.dept) next.set("team", sp.dept);
  if (sp.hobby) next.set("hobby", sp.hobby);
  if (sp.sort === "department") next.set("sort", "team");
  if (sp.sort === "newest") next.set("sort", "newest");
  const qs = next.toString();
  redirect(hub(qs ? `/people?${qs}` : "/people"));
}
