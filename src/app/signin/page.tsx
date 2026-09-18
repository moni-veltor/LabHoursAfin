import { redirect } from "next/navigation";
import { hub } from "@/lib/hub";

// Per request: where it sends you depends on where you were going.
export const dynamic = "force-dynamic";

/**
 * Signing in to Labhours is signing in to the hub.
 *
 * People, on the hub, controls access to the estate, so this app has no PIN
 * screen of its own: it sends you to the hub's door for Labhours, which signs
 * you in there if it needs to and hands you back already signed in here —
 * to the page you were going to.
 *
 * Except when the hand-back itself failed (?error). Sending you round again
 * would loop for ever on anything that is not transient, so that stops here
 * and says what happened.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;

  if (!sp.error) {
    // callbackUrl can arrive absolute; only a path on this app is carried.
    let to = "/";
    try {
      const u = new URL(sp.callbackUrl ?? "/", "http://labhours.local");
      to = u.pathname + u.search;
    } catch {}
    if (!to.startsWith("/") || to.startsWith("//")) to = "/";
    redirect(hub(`/sso/labhours?to=${encodeURIComponent(to)}`));
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink-text">Couldn&rsquo;t sign you in</h1>
      <p className="mt-2 text-muted">
        The hub sent you here, but the hand-over did not go through
        {sp.error === "revoked" ? " — your access to Labhours has been switched off in People" : ""}. Access to
        Labhours is managed in People on the hub; if this keeps happening, ask an administrator there.
      </p>
      <a
        href={hub("/sso/labhours")}
        className="mt-5 inline-block rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-dark"
      >
        Try again from the hub
      </a>
    </div>
  );
}
