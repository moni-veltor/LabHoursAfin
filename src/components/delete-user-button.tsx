"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteUser } from "@/actions/users";

const ERRORS: Record<string, string> = {
  CANT_DELETE_SELF: "You can't delete yourself.",
  CANT_DELETE_ADMIN: "Admins can't be deleted.",
  CANT_DELETE_TECH: "Tech-team members can't be deleted.",
  HAS_INITIATIVES:
    "This person owns at least one initiative. Reassign them first, then try again.",
};

export function DeleteUserButton({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("userId", userId);
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        const tag = text.split(":")[0];
        setErr(ERRORS[tag] ?? text ?? "Could not delete.");
        setBusy(false);
        return;
      }
      router.refresh();
      setOpen(false);
    } catch (e: any) {
      setErr(e?.message ?? "Network error");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        className="rounded-md border border-line bg-raised px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-dim hover:border-rose-500/40 hover:text-rose-300"
      >
        delete
      </button>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      className="flex flex-col items-end gap-1"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
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
            e.stopPropagation();
            e.preventDefault();
            go();
          }}
          disabled={busy}
          className="rounded-md bg-rose-600 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white hover:bg-rose-700 disabled:opacity-50"
        >
          {busy ? "deleting…" : `confirm delete ${name.split(" ")[0] ?? ""}`}
        </button>
      </div>
      {err && (
        <p className="max-w-xs text-right text-[10px] text-rose-300">{err}</p>
      )}
    </div>
  );
}
