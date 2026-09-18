"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSubscriptionsClosed } from "@/actions/comments-mod";

/**
 * Close / reopen an initiative to new members, with feedback.
 *
 * The first version was a plain server-action form: you clicked, nothing
 * acknowledged it, the live database took a second, and then the label
 * quietly changed. On a fast connection that reads as "nothing happened" —
 * which is exactly what it was reported as. So this is a client control that
 * shows the pending state, flips optimistically, and confirms.
 */
export function CloseToggle({
  initiativeId,
  closed,
}: {
  initiativeId: string;
  closed: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState(closed);
  const [justChanged, setJustChanged] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggle() {
    setErr(null);
    const next = !optimistic;
    setOptimistic(next);
    start(async () => {
      try {
        await toggleSubscriptionsClosed(initiativeId);
        router.refresh();
        setJustChanged(true);
        setTimeout(() => setJustChanged(false), 2500);
      } catch (e) {
        setOptimistic(!next); // roll back
        setErr(e instanceof Error ? e.message.split(":")[0] : "Could not update");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={optimistic}
        className={`btn-press w-full rounded-md border px-3 py-1.5 text-sm transition disabled:opacity-60 ${
          optimistic
            ? "border-brand-success/40 bg-brand-success-50 text-brand-success-ink hover:bg-brand-success-100"
            : "border-line hover:bg-line"
        }`}
      >
        {pending
          ? optimistic
            ? "Closing…"
            : "Reopening…"
          : optimistic
            ? "Reopen to new members"
            : "Close to new members"}
      </button>

      <p className="mt-1 text-[11px] text-dim">
        {optimistic ? (
          <>
            <span className="font-semibold text-brand-success-ink">Closed</span> — nobody new can
            join. Following stays open, and pending applicants can still be approved.
          </>
        ) : (
          "Stops new participants joining. Following updates stays open."
        )}
      </p>

      {justChanged && !pending && (
        <p className="mt-1 text-[11px] font-medium text-brand-success-ink">
          ✓ {optimistic ? "Closed to new members." : "Reopened to new members."}
        </p>
      )}
      {err && <p className="mt-1 text-[11px] text-brand-coral-ink">Could not update — try again.</p>}
    </div>
  );
}
