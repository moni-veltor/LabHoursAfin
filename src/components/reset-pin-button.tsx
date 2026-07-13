"use client";

import { useState } from "react";

const ERRORS: Record<string, string> = {
  MISSING_USER_ID: "Missing user.",
  NOT_FOUND: "User not found.",
  FORBIDDEN: "Admins only.",
};

export function ResetPinButton({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("userId", userId);
      const res = await fetch("/api/admin/reset-pin", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        setErr(ERRORS[text.split(":")[0]] ?? text ?? "Could not reset.");
        setBusy(false);
        return;
      }
      const data = await res.json();
      setPin(String(data.pin));
      setBusy(false);
    } catch (e: any) {
      setErr(e?.message ?? "Network error");
      setBusy(false);
    }
  }

  function stop(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  // New PIN issued — show it once.
  if (pin) {
    return (
      <div
        onClick={stop}
        className="flex flex-col items-end gap-1 rounded-md border border-brand-accent/40 bg-brand-accent-950 px-2 py-1"
      >
        <span className="font-mono text-[9px] uppercase tracking-wider text-brand-accent">
          {name.split(" ")[0]}'s new PIN
        </span>
        <div className="flex items-center gap-1">
          <code className="font-mono text-sm tracking-[0.3em] text-ink-text">
            {pin}
          </code>
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              navigator.clipboard?.writeText(pin);
              setCopied(true);
            }}
            className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted hover:text-ink-text"
          >
            {copied ? "copied" : "copy"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              setPin(null);
              setOpen(false);
              setCopied(false);
            }}
            className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted hover:text-ink-text"
          >
            done
          </button>
        </div>
        <span className="text-[9px] text-dim">Shown once — hand it over.</span>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          setOpen(true);
        }}
        className="rounded-md border border-line bg-raised px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-dim hover:border-brand-accent/40 hover:text-brand-accent"
      >
        reset pin
      </button>
    );
  }

  return (
    <div onClick={stop} className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            setOpen(false);
            setErr(null);
          }}
          className="rounded-md border border-line bg-raised px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink-text"
        >
          cancel
        </button>
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            go();
          }}
          disabled={busy}
          className="rounded-md bg-brand-accent px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink hover:bg-brand-accent-dark disabled:opacity-50"
        >
          {busy ? "resetting…" : "confirm reset"}
        </button>
      </div>
      {err && (
        <p className="max-w-xs text-right text-[10px] text-rose-300">{err}</p>
      )}
    </div>
  );
}
