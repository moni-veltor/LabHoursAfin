"use client";

import { useState } from "react";
import { addComment } from "@/actions/comments";

export function ReplyBox({
  initiativeId,
  parentId,
}: {
  initiativeId: string;
  parentId: string;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="font-mono text-[10px] uppercase tracking-wider text-dim hover:text-brand-primary-glow"
      >
        ↩ reply
      </button>
    );
  }
  return (
    <form action={addComment} className="mt-2 space-y-2">
      <input type="hidden" name="initiativeId" value={initiativeId} />
      <input type="hidden" name="parentId" value={parentId} />
      <textarea
        name="body"
        required
        rows={2}
        placeholder="Write a reply…"
        className="w-full resize-y rounded-md border border-line bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
      />
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-line bg-raised px-2 py-1 text-xs text-muted hover:text-ink-text"
        >
          Cancel
        </button>
        <button className="rounded-md bg-brand-primary px-2 py-1 text-xs font-medium text-white hover:bg-brand-primary-dark">
          Reply
        </button>
      </div>
    </form>
  );
}
