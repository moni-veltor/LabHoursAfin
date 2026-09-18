import { redirect } from "next/navigation";
import { hub } from "@/lib/hub";

/**
 * Profiles moved to the hub. It knows every Labhours id — LabhoursProfile
 * keeps it — so an old /u/<id> link lands on the same person there.
 */
export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(hub(`/people/${encodeURIComponent(id)}`));
}
