import { signIn } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md rounded-xl border border-stone-200 bg-white p-8">
      <h1 className="text-2xl font-bold tracking-tight">Sign in to Lab Hours</h1>
      <p className="mt-2 text-stone-600">
        Use your work email. No password — we just need to know who you are.
      </p>
      {sp.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
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
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            name="email"
            required
            placeholder="you@yourcompany.com"
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Name (optional)</label>
          <input
            type="text"
            name="name"
            placeholder="How you'd like to appear"
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
