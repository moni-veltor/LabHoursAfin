import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isTechTeam } from "@/lib/tech-team";
import { createInitiative } from "@/actions/initiatives";
import {
  CATEGORIES,
  CATEGORY_KEYS,
  DIFFICULTIES,
  DIFFICULTY_KEYS,
  EFFORTS,
  EFFORT_KEYS,
  FORMATS,
  FORMAT_KEYS,
} from "@/lib/categories";

export default async function NewInitiativePage() {
  const session = await auth();
  const user = session?.user as { role?: string; email?: string } | undefined;
  if (!user) redirect("/signin?callbackUrl=/initiatives/new");
  const allowed =
    user.role === "tech" || user.role === "admin" || isTechTeam(user.email);
  if (!allowed) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-semibold">Tech team only</h1>
        <p className="mt-2 text-stone-600">
          Only the tech team can post initiatives. Have an idea? Pitch it to{" "}
          Monica, Mohammed, or Emmanuel — we'll post it on your behalf.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">New initiative</h1>
      <p className="mt-1 text-stone-600">
        Share what the team is exploring, building, or could use help with.
      </p>

      <form action={createInitiative} className="mt-6 space-y-6">
        <Section title="The basics" hint="Required. This is what people see first.">
          <Select
            label="Category"
            name="category"
            required
            options={CATEGORY_KEYS.map((k) => ({
              value: k,
              label: CATEGORIES[k].label,
              hint: CATEGORIES[k].blurb,
            }))}
          />
          <Field
            label="Title"
            name="title"
            required
            placeholder="e.g. Modernise the core banking ledger"
          />
          <Field
            label="One-line summary"
            name="summary"
            required
            placeholder="What is this initiative, in a sentence?"
            textarea
            rows={2}
          />
          <Field
            label="What you'll do / outcomes"
            name="outcomes"
            placeholder="What participants will learn, build, or produce by the end."
            textarea
            rows={3}
          />
        </Section>

        <Section title="Logistics" hint="Help people decide if they can join.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Format"
              name="format"
              defaultValue="open"
              options={FORMAT_KEYS.map((k) => ({
                value: k,
                label: FORMATS[k].label,
              }))}
            />
            <Select
              label="Who's it for"
              name="difficulty"
              defaultValue="any"
              options={DIFFICULTY_KEYS.map((k) => ({
                value: k,
                label: DIFFICULTIES[k].label,
              }))}
            />
            <Select
              label="Total effort"
              name="effort"
              defaultValue=""
              options={[
                { value: "", label: "Not sure yet" },
                ...EFFORT_KEYS.map((k) => ({
                  value: k,
                  label: EFFORTS[k].label,
                })),
              ]}
            />
            <Field
              label="Time commitment"
              name="timeCommitment"
              placeholder="e.g. ~2 hrs/week for 4 weeks"
            />
            <Field
              label="Capacity (people)"
              name="capacity"
              type="number"
              placeholder="optional"
            />
            <Field
              label="Subcategory"
              name="subcategory"
              placeholder="e.g. Core Banking Platform"
            />
          </div>
          <Field
            label="Skills helpful (free text)"
            name="prerequisites"
            placeholder="e.g. comfortable with Python; or 'no coding experience needed'"
          />
          <label className="flex items-start gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm">
            <input
              type="checkbox"
              name="requiresApproval"
              className="mt-0.5 h-4 w-4 rounded border-stone-300"
            />
            <span>
              <span className="font-medium">Application required to join</span>
              <span className="block text-xs text-stone-600">
                People can follow updates instantly, but joining as a participant needs your approval. Use this for capacity-limited cohorts.
              </span>
            </span>
          </label>
        </Section>

        <Section title="More" hint="Optional. Add depth, tags, or save as draft.">
          <Field
            label="Details (markdown)"
            name="body"
            placeholder="Goals, scope, links, schedule, etc."
            textarea
            rows={8}
          />
          <Field
            label="Tags (comma-separated)"
            name="tags"
            placeholder="e.g. python, snowflake, rag"
          />
          <Select
            label="Status"
            name="status"
            defaultValue="open"
            options={[
              { value: "open", label: "Open — accepting subscribers" },
              { value: "draft", label: "Draft — not visible to others" },
              { value: "in_progress", label: "In progress" },
            ]}
          />
        </Section>

        <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">
            You'll be added as the owner. Subscribers can join, follow, and
            comment.
          </p>
          <button
            type="submit"
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary-dark"
          >
            Publish initiative
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white">
      <header className="border-b border-stone-200 px-5 py-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {hint && <p className="text-xs text-stone-500">{hint}</p>}
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  textarea,
  rows = 3,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
}) {
  const cls =
    "mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none";
  return (
    <div>
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </label>
      {textarea ? (
        <textarea
          name={name}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className={cls}
        />
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          required={required}
          className={cls}
        />
      )}
    </div>
  );
}

function Select({
  label,
  name,
  required,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  options: { value: string; label: string; hint?: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </label>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
      >
        {!defaultValue && !required && <option value="">—</option>}
        {required && (
          <option value="" disabled>
            Pick one
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
            {o.hint ? ` — ${o.hint}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
