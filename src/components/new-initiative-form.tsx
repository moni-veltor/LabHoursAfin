"use client";

import { useRef, useState } from "react";
import { createInitiative } from "@/actions/initiatives";
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

type Initial = Partial<{
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
  tags: string;
  status: string;
  requiresApproval: boolean;
  crossTeam: boolean;
  coverImage: string;
  recordings: string;
}>;

export function NewInitiativeForm({
  initial,
  aiEnabled,
  categories,
}: {
  initial: Initial;
  aiEnabled: boolean;
  categories: CategoryOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pitch, setPitch] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  async function runDraft() {
    if (!pitch.trim()) return;
    setDrafting(true);
    setDraftError(null);
    try {
      const r = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pitch }),
      });
      if (!r.ok) throw new Error("AI request failed");
      const draft = await r.json();
      const f = formRef.current;
      if (!f) return;
      const set = (name: string, v: string | undefined) => {
        if (v == null) return;
        const el = f.elements.namedItem(name) as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement
          | null;
        if (el) el.value = v;
      };
      set("title", draft.title);
      set("summary", draft.summary);
      set("outcomes", draft.outcomes);
      set("body", draft.body);
      set("timeCommitment", draft.timeCommitment);
      set("tags", draft.tags);
      set("format", draft.format);
      set("difficulty", draft.difficulty);
    } catch (e: any) {
      setDraftError(e?.message ?? "Something went wrong");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-xl border border-brand-primary/30 bg-surface p-5">
        <div className="lh-mesh absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-brand-primary/40 bg-brand-primary-950 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-brand-primary-glow">
              ✦ ai assist
            </span>
            <h2 className="text-sm font-semibold text-ink-text">
              Pitch it in a sentence and I'll draft the rest
            </h2>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder='e.g. "A 4-week reading club on distributed systems for non-engineers"'
              className="w-full rounded-md border border-line bg-raised px-3 py-2 text-sm placeholder:text-dim focus:border-brand-primary focus:outline-none"
            />
            <button
              type="button"
              disabled={drafting || !pitch.trim()}
              onClick={runDraft}
              className="shrink-0 rounded-md bg-brand-primary px-3 py-2 text-sm font-medium text-white shadow-glow transition hover:bg-brand-primary-dark disabled:opacity-50"
            >
              {drafting ? "Drafting…" : "Draft with AI →"}
            </button>
          </div>
          {!aiEnabled && (
            <p className="mt-2 font-mono text-[11px] text-dim">
              AI not configured. Set <code className="rounded border border-line bg-raised px-1 py-0.5 text-brand-primary-glow">ANTHROPIC_API_KEY</code> to enable.
            </p>
          )}
          {draftError && (
            <p className="mt-2 text-xs text-rose-300">{draftError}</p>
          )}
        </div>
      </section>

      <form
        id="new-initiative-form"
        ref={formRef}
        action={createInitiative}
        className="mt-6 space-y-6"
      >
        <Section title="The basics" hint="Required. This is what people see first.">
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
            placeholder="e.g. Modernise the core banking ledger"
          />
          <Field
            label="One-line summary"
            name="summary"
            required
            defaultValue={initial.summary}
            placeholder="What is this initiative, in a sentence?"
            textarea
            rows={2}
          />
          <Field
            label="What you'll do / outcomes"
            name="outcomes"
            defaultValue={initial.outcomes}
            placeholder="What participants will learn, build, or produce by the end."
            textarea
            rows={3}
          />
          <Field
            label="Cover image URL (optional)"
            name="coverImage"
            defaultValue={initial.coverImage}
            placeholder="https://..."
          />
        </Section>

        <Section title="Logistics" hint="Help people decide if they can join.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Format"
              name="format"
              defaultValue={initial.format ?? "open"}
              options={FORMAT_KEYS.map((k) => ({
                value: k,
                label: FORMATS[k].label,
              }))}
            />
            <Select
              label="Who's it for"
              name="difficulty"
              defaultValue={initial.difficulty ?? "any"}
              options={DIFFICULTY_KEYS.map((k) => ({
                value: k,
                label: DIFFICULTIES[k].label,
              }))}
            />
            <Select
              label="Total effort"
              name="effort"
              defaultValue={initial.effort ?? ""}
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
              defaultValue={initial.timeCommitment}
              placeholder="e.g. ~2 hrs/week for 4 weeks"
            />
            <Field
              label="Capacity (people)"
              name="capacity"
              type="number"
              defaultValue={initial.capacity}
              placeholder="optional"
            />
            <Field
              label="Subcategory"
              name="subcategory"
              defaultValue={initial.subcategory}
              placeholder="e.g. Core Banking Platform"
            />
          </div>
          <Field
            label="Skills helpful (free text)"
            name="prerequisites"
            defaultValue={initial.prerequisites}
            placeholder="e.g. comfortable with Python; or 'no coding experience needed'"
          />
          <label className="flex items-start gap-3 rounded-md border border-line bg-raised p-3 text-sm">
            <input
              type="checkbox"
              name="requiresApproval"
              defaultChecked={initial.requiresApproval}
              className="mt-0.5 h-4 w-4 rounded border-line"
            />
            <span>
              <span className="font-medium text-ink-text">Application required to join</span>
              <span className="block text-xs text-muted">
                Follow updates is instant; joining as a participant needs your approval.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-md border border-line bg-raised p-3 text-sm">
            <input
              type="checkbox"
              name="crossTeam"
              defaultChecked={initial.crossTeam}
              className="mt-0.5 h-4 w-4 rounded border-line"
            />
            <span>
              <span className="font-medium text-ink-text">Cross-team initiative</span>
              <span className="block text-xs text-muted">
                Mark when this explicitly bridges multiple departments or functions.
              </span>
            </span>
          </label>
        </Section>

        <Section title="More" hint="Optional. Add depth, links, or save as draft.">
          <Field
            label="Details (markdown)"
            name="body"
            defaultValue={initial.body}
            placeholder="Goals, scope, links, schedule, etc."
            textarea
            rows={8}
          />
          <Field
            label="Recordings & resources (one URL per line)"
            name="recordings"
            defaultValue={initial.recordings}
            placeholder="https://drive.example.com/...&#10;https://loom.com/..."
            textarea
            rows={3}
          />
          <Field
            label="Tags (comma-separated)"
            name="tags"
            defaultValue={initial.tags}
            placeholder="e.g. python, snowflake, rag"
          />
          <Select
            label="Status"
            name="status"
            defaultValue={initial.status ?? "open"}
            options={[
              { value: "open", label: "Open — accepting subscribers" },
              { value: "draft", label: "Draft — not visible to others" },
              { value: "in_progress", label: "In progress" },
            ]}
          />
        </Section>

        <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-4">
          <p className="text-xs text-muted">
            You'll be added as the owner. Subscribers can join, follow, and comment.
          </p>
          <button
            type="submit"
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:bg-brand-primary-dark"
          >
            Publish initiative →
          </button>
        </div>
      </form>
    </>
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
  placeholder,
  required,
  textarea,
  rows = 3,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
  defaultValue?: string;
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
          placeholder={placeholder}
          required={required}
          rows={rows}
          defaultValue={defaultValue}
          className={cls}
        />
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          required={required}
          defaultValue={defaultValue}
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
