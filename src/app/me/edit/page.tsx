import { redirect } from "next/navigation";
import { hub } from "@/lib/hub";

// Rendered per request, as it was when it read the session: prerendering it
// would run the layout's database queries at build time.
export const dynamic = "force-dynamic";

/** Your profile is edited on the hub now, and shows everywhere from there. */
export default function EditProfilePage() {
  redirect(hub("/people/me"));
}
