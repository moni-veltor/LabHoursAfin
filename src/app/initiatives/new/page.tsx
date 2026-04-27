import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createInitiative } from "@/actions/initiatives";

export default async function NewInitiativePage() {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (!user) redirect("/signin?callbackUrl=/initiatives/new");
  if (user.role !== "tech" && user.role !== "admin") {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-semibold">Tech team only</h1>
        <p className="mt-2 text-stone-600">
          Only members of the tech team can post initiatives. Got an idea? Pitch it to a tech team
          member to post on your behalf.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">New initiative</h1>
      <p className="mt-1 text-stone-600">
        Share something the team is exploring or wants help with.
      </p>
      <form action={createInitiative} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-6">
        <Field label="Title" name="title" placeholder="What are you exploring?" required />
        <Field
          label="Short summary"
          name="summary"
          placeholder="One or two sentences (shown in lists)"
          required
          textarea
          rows={2}
        />
        <Field
          label="Details (markdown)"
          name="body"
          placeholder="Goals, scope, what kind of help you want..."
          textarea
          rows={8}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Time commitment" name="timeCommitment" placeholder="e.g. ~2 hrs/week" />
          <Field label="Capacity (people)" name="capacity" type="number" placeholder="optional" />
        </div>
        <Field
          label="Tags (comma-separated)"
          name="tags"
          placeholder="ml, infra, frontend"
        />
        <div>
          <label className="block text-sm font-medium">Status</label>
          <select
            name="status"
            defaultValue="open"
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="open">Open — accepting subscribers</option>
            <option value="draft">Draft — not visible to others yet</option>
            <option value="in_progress">In progress</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          Publish initiative
        </button>
      </form>
    </div>
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
      <label className="block text-sm font-medium">{label}</label>
      {textarea ? (
        <textarea name={name} placeholder={placeholder} required={required} rows={rows} className={cls} />
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
