import { signIn } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ check?: string; callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  if (sp.check) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-stone-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="mt-2 text-stone-600">
          We sent you a sign-in link. It expires in 24 hours.
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-md rounded-xl border border-stone-200 bg-white p-8">
      <h1 className="text-2xl font-bold tracking-tight">Sign in to Lab Board</h1>
      <p className="mt-2 text-stone-600">
        Use your work email. We'll send you a one-time sign-in link.
      </p>
      <form
        action={async (fd: FormData) => {
          "use server";
          await signIn("email", {
            email: String(fd.get("email")),
            redirectTo: sp.callbackUrl ?? "/",
          });
        }}
        className="mt-6 space-y-3"
      >
        <input
          type="email"
          name="email"
          required
          placeholder="you@yourcompany.com"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          Send magic link
        </button>
      </form>
    </div>
  );
}
