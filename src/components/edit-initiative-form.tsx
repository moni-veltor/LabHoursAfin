"use client";

import { updateInitiative } from "@/actions/initiatives";
import {
  DIFFICULTIES,
  DIFFICULTY_KEYS,
  EFFORTS,
  EFFORT_KEYS,
  FORMATS,
  FORMAT_KEYS,
} from "@/lib/categories";

type CategoryOption = {
  key: string;
  label: string;
  blurb: string;
  isCustom: boolean;
};

type Initial = {
  id: string;
  title: string;
  summary: string;
  body: string;
  outcomes: string;
  prerequisites: string;
  category: string;
  subcategory: string;
  format: string;
  difficulty: string;
  effort: string;
  capacity: string;
  timeCommitment: string;
  subscriptionsOpenAt: string;
  tags: string;
  status: string;
  requiresApproval: boolean;
  crossTeam: boolean;
  coverImage: string;
  recordings: string;
  lessonsLearned: string;
  ownerId: string;
};

export function EditInitiativeForm({
  initial,
  categories,
  candidateOwners,
  canReassign,
}: {
  initial: Initial;
  categories: CategoryOption[];
  candidateOwners: { id: string; name: string | null; email: string }[];
  canReassign: boolean;
}) {
  return (
    <form action={updateInitiative} className="mt-6 space-y-6">
      <input type="hidden" name="id" value={initial.id} />

      <Section title="The basics">
        <Select
          label="Category"
          name="category"
          required
          defaultValue={initial.category}
          options={categories.map((c) => ({
            value: c.key,
            label: c.label,
            hint: c.blurb,
          }))}
        />
        <Field
          label="Title"
          name="title"
          required
          defaultValue={initial.title}
        />
        <Field
          label="One-line summary"
          name="summary"
          required
          defaultValue={initial.summary}
          textarea
          rows={2}
        />
        <Field
          label="What you'll do / outcomes"
          name="outcomes"
          defaultValue={initial.outcomes}
          textarea
          rows={3}
        />
        <Field
          label="Cover image URL"
          name="coverImage"
          defaultValue={initial.coverImage}
        />
      </Section>

      <Section title="Logistics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Format"
            name="format"
            defaultValue={initial.format}
            options={FORMAT_KEYS.map((k) => ({ value: k, label: FORMATS[k].label }))}
          />
          <Select
            label="Who's it for"
            name="difficulty"
            defaultValue={initial.difficulty}
            options={DIFFICULTY_KEYS.map((k) => ({
              value: k,
              label: DIFFICULTIES[k].label,
            }))}
          />
          <Select
            label="Total effort"
            name="effort"
            defaultValue={initial.effort}
            options={[
              { value: "", label: "Not sure yet" },
              ...EFFORT_KEYS.map((k) => ({ value: k, label: EFFORTS[k].label })),
            ]}
          />
          <Field
            label="Time commitment"
            name="timeCommitment"
            defaultValue={initial.timeCommitment}
          />
          <Field
            label="Capacity"
            name="capacity"
            type="number"
            defaultValue={initial.capacity}
          />
          <Field
            label="Subcategory"
            name="subcategory"
            defaultValue={initial.subcategory}
          />
          <Field
            label="Subscriptions open at"
            name="subscriptionsOpenAt"
            type="datetime-local"
            defaultValue={initial.subscriptionsOpenAt}
          />
        </div>
        <Field
          label="Skills helpful"
          name="prerequisites"
          defaultValue={initial.prerequisites}
        />
        <label className="flex items-start gap-3 rounded-md border border-line bg-raised p-3 text-sm">
          <input
            type="checkbox"
            name="requiresApproval"
            defaultChecked={initial.requiresApproval}
            className="mt-0.5 h-4 w-4 rounded border-line"
          />
          <span className="font-medium text-ink-text">Application required to join</span>
        </label>
        <label className="flex items-start gap-3 rounded-md border border-line bg-raised p-3 text-sm">
          <input
            type="checkbox"
            name="crossTeam"
            defaultChecked={initial.crossTeam}
            className="mt-0.5 h-4 w-4 rounded border-line"
          />
          <span className="font-medium text-ink-text">Cross-team initiative</span>
        </label>
      </Section>

      <Section title="More">
        <Field
          label="Details (markdown)"
          name="body"
          defaultValue={initial.body}
          textarea
          rows={8}
        />
        <Field
          label="Recordings & resources (one URL per line)"
          name="recordings"
          defaultValue={initial.recordings}
          textarea
          rows={3}
        />
        <Field
          label="Lessons learned"
          name="lessonsLearned"
          defaultValue={initial.lessonsLearned}
          textarea
          rows={3}
        />
        <Field
          label="Tags (comma-separated)"
          name="tags"
          defaultValue={initial.tags}
        />
        <Select
          label="Status"
          name="status"
          defaultValue={initial.status}
          options={[
            { value: "draft", label: "Draft" },
            { value: "open", label: "Open" },
            { value: "in_progress", label: "In progress" },
            { value: "done", label: "Done" },
            { value: "archived", label: "Archived" },
          ]}
        />
      </Section>

      <Section
        title={canReassign ? "Owner" : "Owner (admin only)"}
        hint={
          canReassign
            ? "Reassigning transfers ownership; the new owner gets owner role on the subscription."
            : "Only admins can change the owner."
        }
      >
        <Select
          label="Owner"
          name="ownerId"
          defaultValue={initial.ownerId}
          options={candidateOwners.map((o) => ({
            value: o.id,
            label: `${o.name ?? o.email} · ${o.email}`,
          }))}
        />
        {!canReassign && (
          <p className="font-mono text-[10px] text-dim">
            You can edit everything else, but only an admin can reassign owner.
          </p>
        )}
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
        <p className="text-xs text-muted">
          Saving will update the initiative immediately and notify subscribers
          on the next update post.
        </p>
        <button className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:bg-brand-primary-dark">
          Save changes
        </button>
      </div>
    </form>
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
    <section className="rounded-xl border border-line bg-surface">
      <header className="border-b border-line px-5 py-3">
        <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-xs text-dim">{hint}</p>}
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  textarea,
  rows = 3,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
  defaultValue?: string;
  placeholder?: string;
}) {
  const cls =
    "mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm placeholder:text-dim focus:border-brand-primary focus:outline-none";
  return (
    <div>
      <label className="block font-mono text-[11px] uppercase tracking-wider text-muted">
        {label}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      {textarea ? (
        <textarea
          name={name}
          required={required}
          rows={rows}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={cls}
        />
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
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
      <label className="block font-mono text-[11px] uppercase tracking-wider text-muted">
        {label}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
      >
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
