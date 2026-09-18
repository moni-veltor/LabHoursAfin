"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, updateUser } from "@/actions/admin-users";
import {
  zodiacFromDate, chineseZodiacFromDate, ZODIAC_EMOJI, CHINESE_EMOJI,
} from "@/lib/zodiac";

type Role = "member" | "tech" | "admin";

const ERRORS: Record<string, string> = {
  BAD_EMAIL: "That is not a valid email address.",
  WRONG_DOMAIN: "Email must be on the allowed company domain.",
  MISSING_NAME: "A name is required.",
  EXISTS: "Someone already has that email.",
  EXISTS_DELETED: "A removed account has that email — reactivate it instead.",
  CANT_DEMOTE_SELF: "You cannot remove your own admin.",
  CANT_DEMOTE_FOUNDER: "This person is a permanent admin and cannot be demoted.",
  FORBIDDEN: "Admins only.",
  NOT_FOUND: "That user no longer exists.",
};

export type EditableUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  department: string | null;
  jobTitle: string | null;
  dateOfBirth: string | null;
};

/**
 * Add a person, or edit one, in a small modal.
 *
 * Sign-in is pre-provisioned, so an admin has to be able to create accounts
 * without a database console. The same form edits, because the fields are the
 * same fields — only creating hands back a one-time PIN at the end.
 */
export function UserEditor({
  mode,
  user,
}: {
  mode: "create" | "edit";
  user?: EditableUser;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [email, setEmail] = useState(user?.email ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "member");
  const [dept, setDept] = useState(user?.department ?? "");
  const [job, setJob] = useState(user?.jobTitle ?? "");
  const [dob, setDob] = useState(user?.dateOfBirth ?? "");

  // The two signs are a function of the date, shown live as it is picked so
  // the admin sees what will be saved rather than saving blind. Same
  // functions the server uses, parsed as UTC to match.
  const signs =
    /^\d{4}-\d{2}-\d{2}$/.test(dob) && !Number.isNaN(new Date(`${dob}T00:00:00Z`).getTime())
      ? (() => {
          const d = new Date(`${dob}T00:00:00Z`);
          const z = zodiacFromDate(d);
          const c = chineseZodiacFromDate(d);
          return { z, c };
        })()
      : null;

  function close() {
    setOpen(false);
    setErr(null);
    setPin(null);
    setCopied(false);
    if (mode === "create") {
      setEmail(""); setName(""); setRole("member"); setDept(""); setJob(""); setDob("");
    }
  }

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      if (mode === "create") {
        const res = await createUser({
          email, name, role, department: dept || null, jobTitle: job || null,
          dateOfBirth: dob || null,
        });
        setPin(res.pin);
      } else if (user) {
        await updateUser({
          userId: user.id, name, role, department: dept || null, jobTitle: job || null,
          dateOfBirth: dob || null,
        });
        router.refresh();
        close();
      }
    } catch (e: unknown) {
      const key = e instanceof Error ? e.message.split(":")[0] : "";
      setErr(ERRORS[key] ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {mode === "create" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-press rounded-md bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-primary-dark"
        >
          + Add person
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className="rounded-md border border-line bg-raised px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-dim hover:border-brand-primary/40 hover:text-brand-primary-glow"
        >
          edit
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-line bg-surface p-5 shadow-glow-soft"
          >
            {pin ? (
              <div className="space-y-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-brand-success">
                    Account created
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-ink-text">{name}</h2>
                  <p className="text-xs text-muted">{email}</p>
                </div>
                <div className="rounded-lg border border-brand-accent-ink/30 bg-brand-accent-50 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-brand-accent-ink">
                    First PIN — shown once
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="font-mono text-2xl tracking-[0.3em] text-ink-text">{pin}</code>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard?.writeText(pin); setCopied(true); }}
                      className="btn-press rounded-md border border-line bg-raised px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink-text"
                    >
                      {copied ? "copied" : "copy"}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-dim">
                    Hand it over — it is not stored and cannot be shown again.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="btn-press w-full rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white hover:bg-brand-primary-dark"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                <h2 className="text-lg font-semibold text-ink-text">
                  {mode === "create" ? "Add a person" : `Edit ${user?.name ?? "person"}`}
                </h2>

                {mode === "create" ? (
                  <Field label="Work email">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane.smith@afinbank.com"
                      className="w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink-text placeholder:text-dim focus-visible:outline-2 focus-visible:outline-brand-primary"
                    />
                  </Field>
                ) : (
                  <Field label="Work email">
                    <p className="rounded-md border border-line bg-raised px-3 py-2 font-mono text-xs text-muted">
                      {user?.email} · not editable
                    </p>
                  </Field>
                )}

                <Field label="Full name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink-text placeholder:text-dim focus-visible:outline-2 focus-visible:outline-brand-primary"
                  />
                </Field>

                <Field label="Role">
                  <div className="flex gap-1.5">
                    {(["member", "tech", "admin"] as Role[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`btn-press flex-1 rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition ${
                          role === r
                            ? "border-brand-primary bg-brand-primary-50 text-ink-text"
                            : "border-line bg-raised text-muted hover:text-ink-text"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-dim">
                    {role === "member" && "Can browse, subscribe and comment."}
                    {role === "tech" && "Can also post initiatives and run hackathons."}
                    {role === "admin" && "Full access, including this screen."}
                  </p>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Department">
                    <input
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
                      placeholder="Credit Risk"
                      className="w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink-text placeholder:text-dim focus-visible:outline-2 focus-visible:outline-brand-primary"
                    />
                  </Field>
                  <Field label="Job title">
                    <input
                      value={job}
                      onChange={(e) => setJob(e.target.value)}
                      placeholder="Underwriter"
                      className="w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink-text placeholder:text-dim focus-visible:outline-2 focus-visible:outline-brand-primary"
                    />
                  </Field>
                </div>

                <Field label="Date of birth">
                  <input
                    type="date"
                    value={dob}
                    max="2015-12-31"
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink-text focus-visible:outline-2 focus-visible:outline-brand-primary [color-scheme:dark]"
                  />
                  <div className="mt-1.5 flex items-center gap-2 text-xs">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
                      Signs
                    </span>
                    {signs ? (
                      <>
                        <span className="rounded-full border border-line bg-raised px-2 py-0.5 text-ink-text">
                          {ZODIAC_EMOJI[signs.z]} {signs.z}
                        </span>
                        <span className="rounded-full border border-line bg-raised px-2 py-0.5 text-ink-text">
                          {CHINESE_EMOJI[signs.c]} {signs.c}
                        </span>
                        <span className="text-dim">— set automatically</span>
                      </>
                    ) : (
                      <span className="text-dim">appear once a date is chosen</span>
                    )}
                  </div>
                </Field>

                {err && <p className="text-xs text-brand-coral-ink">{err}</p>}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={close}
                    className="btn-press rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted hover:text-ink-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={busy || !name.trim() || (mode === "create" && !email.trim())}
                    className="btn-press rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary-dark disabled:opacity-50"
                  >
                    {busy ? "Saving…" : mode === "create" ? "Create & issue PIN" : "Save changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-dim">{label}</span>
      {children}
    </label>
  );
}
