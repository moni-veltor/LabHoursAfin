import { signIn } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="relative mx-auto max-w-md overflow-hidden rounded-xl border border-line bg-surface">
      <div className="lh-mesh absolute inset-0 opacity-50" />
      <div className="relative p-8">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-raised px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-brand-success">
            <span className="absolute inset-0 rounded-full bg-brand-success animate-pulse-soft opacity-60" />
          </span>
          access &gt; lab hours
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-text">
          Welcome to Lab Hours
        </h1>
        <p className="mt-2 text-muted">
          Sign in with your work email — that's it. No password, no link to
          click. We just need to know who you are.
        </p>
        {sp.error && (
          <p className="mt-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            That email isn't allowed. Try a different one.
          </p>
        )}
        <form
          action={async (fd: FormData) => {
            "use server";
            await signIn("credentials", {
              email: String(fd.get("email") ?? ""),
              name: String(fd.get("name") ?? ""),
              redirectTo: sp.callbackUrl ?? "/",
            });
          }}
          className="mt-6 space-y-3"
        >
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-muted">
              email
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="you@yourcompany.com"
              className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-muted">
              display name (optional)
            </label>
            <input
              type="text"
              name="name"
              placeholder="How you'd like to appear"
              className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-brand-primary px-3 py-2 text-sm font-medium text-white shadow-glow transition hover:bg-brand-primary-dark"
          >
            Continue →
          </button>
        </form>
      </div>
    </div>
  );
}
