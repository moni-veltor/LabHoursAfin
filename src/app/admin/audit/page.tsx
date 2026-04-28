import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { auditEvents, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { UserChip } from "@/components/avatar";
import { timeAgo } from "@/lib/utils";

export default async function AdminAuditPage() {
  const session = await auth();
  const me = session?.user as { email?: string } | undefined;
  if (!me) redirect("/signin?callbackUrl=/admin/audit");
  if (!isAdmin(me.email)) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8">
        <h1 className="text-xl font-semibold">Admins only</h1>
      </div>
    );
  }

  const rows = await db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      targetType: auditEvents.targetType,
      targetId: auditEvents.targetId,
      payload: auditEvents.payload,
      createdAt: auditEvents.createdAt,
      actorId: auditEvents.actorId,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditEvents)
    .leftJoin(users, eq(users.id, auditEvents.actorId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit log</h1>
        <p className="mt-1 text-muted">
          Append-only record of admin actions: feature toggles, application
          approvals/declines, category changes, rule overrides.
        </p>
      </div>
      <ul className="space-y-2">
        {rows.length === 0 && (
          <li className="rounded-xl border border-dashed border-line bg-surface py-10 text-center text-sm text-muted">
            No audit events yet.
          </li>
        )}
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-line bg-surface p-4"
          >
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="rounded-md border border-line bg-raised px-2 py-0.5 uppercase tracking-wider text-brand-primary-glow">
                {r.action}
              </span>
              {r.targetType && (
                <span className="text-muted">
                  → {r.targetType}:{r.targetId}
                </span>
              )}
              <span className="ml-auto text-dim">{timeAgo(r.createdAt)}</span>
            </div>
            <div className="mt-2 text-sm">
              <UserChip
                id={r.actorId}
                name={r.actorName}
                email={r.actorEmail}
              />
            </div>
            {r.payload && (
              <pre className="mt-2 overflow-auto rounded-md border border-line bg-raised px-3 py-2 font-mono text-[11px] text-muted">
                {r.payload}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
