"use client";

import { useState } from "react";
import { declineParticipant } from "@/actions/approvals";

export function DeclineForm({
  initiativeId,
  userId,
}: {
  initiativeId: string;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-line px-2 py-1 text-xs hover:bg-line"
      >
        Decline
      </button>
    );
  }
  return (
    <form action={declineParticipant} className="flex items-center gap-1">
      <input type="hidden" name="initiativeId" value={initiativeId} />
      <input type="hidden" name="userId" value={userId} />
      <input
        name="reason"
        placeholder="Reason (optional)"
        className="w-32 rounded-md border border-line bg-surface px-2 py-1 text-xs focus:border-brand-primary focus:outline-none"
      />
      <button className="rounded-md bg-stone-700 px-2 py-1 text-xs font-medium text-white hover:bg-stone-600">
        Send
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-muted hover:text-ink-text"
      >
        ×
      </button>
    </form>
  );
}
