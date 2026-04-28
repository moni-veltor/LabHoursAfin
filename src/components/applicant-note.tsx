"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApplicantNote({
  initiativeId,
  ctaLabel,
  requiresApproval,
}: {
  initiativeId: string;
  ctaLabel: string;
  requiresApproval: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function go() {
    setBusy(true);
    try {
      const r = await fetch("/api/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ initiativeId, note: note || undefined }),
      });
      if (!r.ok) {
        const t = await r.text();
        alert(t || "Could not join");
      }
      router.refresh();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  if (!requiresApproval) {
    return (
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="w-full rounded-md bg-brand-primary px-3 py-2 text-sm font-medium text-white shadow-glow transition hover:bg-brand-primary-dark disabled:opacity-50"
      >
        {ctaLabel}
      </button>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md bg-brand-primary px-3 py-2 text-sm font-medium text-white shadow-glow transition hover:bg-brand-primary-dark"
      >
        {ctaLabel}
      </button>
    );
  }

  return (
    <div className="rounded-md border border-line bg-raised p-3">
      <label className="block font-mono text-[10px] uppercase tracking-wider text-muted">
        Why do you want to join? (optional)
      </label>
      <textarea
        rows={3}
        maxLength={280}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="One or two sentences helps the owner pick."
        className="mt-1 w-full resize-y rounded-md border border-line bg-surface px-2 py-1.5 text-sm focus:border-brand-primary focus:outline-none"
      />
      <div className="mt-2 flex justify-end gap-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-ink-text"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={go}
          disabled={busy}
          className="rounded-md bg-brand-primary px-2 py-1 text-xs font-medium text-white hover:bg-brand-primary-dark disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send application"}
        </button>
      </div>
    </div>
  );
}
