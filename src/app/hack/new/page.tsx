import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { createHackathon } from "@/actions/hack";

export default async function NewHackathonPage() {
  const session = await auth();
  const me = session?.user as { email?: string } | undefined;
  if (!me) redirect("/signin?callbackUrl=/hack/new");
  if (!isAdmin(me.email)) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8">
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="mt-2 text-muted">
          Only admins can create hackathons.
        </p>
        <Link
          href="/hack"
          className="mt-3 inline-block text-sm text-brand-accent hover:underline"
        >
          ← Back to hack arena
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/hack"
          className="font-mono text-[10px] uppercase tracking-wider text-dim hover:text-ink-text"
        >
          ← back to hack arena
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Create hackathon
        </h1>
        <p className="mt-1 text-muted">
          Set the theme. People will pitch, form teams, build, demo, vote.
        </p>
      </div>

      <form
        action={createHackathon}
        className="space-y-4 rounded-xl border border-line bg-surface p-5"
      >
        <Field label="Name" name="name" required placeholder="AfinHack — Q3 2026" />
        <Field
          label="Theme (one line)"
          name="theme"
          placeholder="Anything that makes a customer's first 5 minutes better"
        />
        <Field
          label="Description (markdown)"
          name="description"
          textarea
          rows={4}
          placeholder="What this hackathon is about, who can join, schedule, prizes."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cover image URL" name="coverImage" />
          <Field
            label="Team capacity"
            name="teamCapacity"
            type="number"
            defaultValue="5"
          />
          <Field
            label="Tracks (comma-separated)"
            name="tracks"
            placeholder="AI, customer, internal-tools, risk, wildcard"
          />
          <Field
            label="Prizes"
            name="prizes"
            placeholder="Bragging rights, lunch with CTO, $200 vouchers"
          />
          <Field
            label="Starts at"
            name="startsAt"
            type="datetime-local"
          />
          <Field
            label="Ends at"
            name="endsAt"
            type="datetime-local"
          />
        </div>
        <button className="rounded-md bg-brand-accent px-4 py-2 text-sm font-medium text-ink shadow-glow-accent hover:bg-brand-accent-dark">
          Create hackathon →
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
  textarea,
  rows = 2,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  textarea?: boolean;
  rows?: number;
}) {
  const cls =
    "mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm placeholder:text-dim focus:border-brand-accent focus:outline-none";
  return (
    <div>
      <label className="block font-mono text-[11px] uppercase tracking-wider text-muted">
        {label}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      {textarea ? (
        <textarea
          name={name}
          rows={rows}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className={cls}
        />
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className={cls}
        />
      )}
    </div>
  );
}
