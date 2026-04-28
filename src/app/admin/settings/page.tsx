import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getBoolSetting } from "@/lib/settings-server";
import { setPrePublishReview } from "@/actions/settings";
import { grantParticipationOverride } from "@/actions/admin-rule";
import { db } from "@/lib/db";
import { participationOverrides, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { AdminSubNav } from "@/components/admin-subnav";

export default async function AdminSettingsPage() {
  const session = await auth();
  const me = session?.user as { email?: string } | undefined;
  if (!me) redirect("/signin?callbackUrl=/admin/settings");
  if (!isAdmin(me.email)) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8">
        <h1 className="text-xl font-semibold">Admins only</h1>
      </div>
    );
  }

  const prepublish = await getBoolSetting("prepublish_review", false);
  const overrides = await db
    .select({
      userId: participationOverrides.userId,
      termKey: participationOverrides.termKey,
      extraSlots: participationOverrides.extraSlots,
      grantedAt: participationOverrides.grantedAt,
      reason: participationOverrides.reason,
      userEmail: users.email,
      userName: users.name,
    })
    .from(participationOverrides)
    .leftJoin(users, eq(users.id, participationOverrides.userId))
    .orderBy(desc(participationOverrides.grantedAt))
    .limit(20);

  return (
    <div className="space-y-8">
      <AdminSubNav active="/admin/settings" />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted">
          Platform-wide knobs and quarter-rule overrides.
        </p>
      </div>

      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Pre-publish review
        </h2>
        <p className="mt-2 text-sm text-muted">
          When enabled, new initiatives published with status "open" go into a
          review queue at <code className="rounded border border-line bg-raised px-1 py-0.5 text-xs text-brand-primary-glow">/admin/queue</code> and aren't visible
          on the home page until an admin approves them.
        </p>
        <form action={setPrePublishReview} className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-md border border-line bg-raised px-3 py-2 text-sm">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={prepublish}
              className="h-4 w-4"
            />
            Require admin review before new initiatives go live
          </label>
          <button className="rounded-md bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary-dark">
            Save
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Grant a quarter-rule override
        </h2>
        <p className="mt-2 text-sm text-muted">
          Give a member extra slots for a specific quarter. Logged in the audit
          log.
        </p>
        <form
          action={grantParticipationOverride}
          className="mt-4 grid gap-3 sm:grid-cols-4"
        >
          <input
            name="email"
            required
            placeholder="user@afinbank.com"
            className="rounded-md border border-line bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none sm:col-span-2"
          />
          <input
            name="termKey"
            required
            placeholder="2026-Q2"
            pattern="^\d{4}-Q[1-4]$"
            className="rounded-md border border-line bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
          <input
            name="extraSlots"
            type="number"
            min={1}
            max={5}
            defaultValue={1}
            className="rounded-md border border-line bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
          <input
            name="reason"
            placeholder="Reason (optional, audit only)"
            className="rounded-md border border-line bg-raised px-3 py-2 text-sm focus:border-brand-primary focus:outline-none sm:col-span-3"
          />
          <button className="rounded-md bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary-dark">
            Grant
          </button>
        </form>

        <h3 className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Recent overrides
        </h3>
        {overrides.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No overrides granted yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {overrides.map((o) => (
              <li
                key={`${o.userId}:${o.termKey}`}
                className="rounded-md border border-line bg-raised p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink-text">
                    {o.userName ?? o.userEmail}
                  </span>
                  <span className="font-mono text-[11px] text-dim">
                    +{o.extraSlots} slot{o.extraSlots === 1 ? "" : "s"} ·{" "}
                    {o.termKey}
                  </span>
                </div>
                {o.reason && (
                  <p className="mt-1 text-xs text-muted">{o.reason}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
