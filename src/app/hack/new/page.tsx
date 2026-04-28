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

        <fieldset className="rounded-md border border-brand-accent/30 bg-brand-accent-950 p-3">
          <legend className="px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-brand-accent">
            ✨ auto-form teams by zodiac
          </legend>
          <p className="mt-1 text-xs text-muted">
            Skip pitch + team-forming and auto-group every Afin employee with a
            known birthday into teams. Needs at least <code>2 × team size</code>
            people (so 8 for size 4, the default). If there aren't enough, the
            hackathon falls back to the normal idea-pitch flow.
          </p>
          <label className="mt-3 flex items-start gap-2 rounded-md border border-line bg-raised p-2 text-sm">
            <input type="checkbox" name="autoForm" className="mt-0.5 h-4 w-4" />
            <span>
              <span className="font-medium text-ink-text">
                Auto-form teams now
              </span>
              <span className="block text-xs text-muted">
                Pre-creates teams the moment this hackathon is published.
                Hackathon starts in <em>team_forming</em> stage.
              </span>
            </span>
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-muted">
                System
              </label>
              <select
                name="autoSystem"
                defaultValue="western"
                className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
              >
                <option value="western">Western (sun sign)</option>
                <option value="chinese">Chinese (animal)</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-muted">
                Mode
              </label>
              <select
                name="autoMode"
                defaultValue="compat"
                className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
              >
                <option value="compat">
                  Harmony · highest compatibility
                </option>
                <option value="chaos">Chaos · maximally clashing</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-muted">
                Team size
              </label>
              <input
                name="autoSize"
                type="number"
                min={2}
                max={10}
                defaultValue={4}
                className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
              />
            </div>
          </div>
        </fieldset>

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
