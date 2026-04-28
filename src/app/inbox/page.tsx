import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { timeAgo } from "@/lib/utils";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/actions/notifications";

const KIND_ICON: Record<string, string> = {
  application: "📨",
  approved: "✅",
  declined: "↩",
  promoted: "★",
  reply: "💬",
  mention: "@",
  update: "›",
  outcome: "🎉",
};

export default async function InboxPage() {
  const session = await auth();
  const me = session?.user as { id?: string } | undefined;
  if (!me?.id) redirect("/signin?callbackUrl=/inbox");

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, me.id))
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
        <form action={markAllNotificationsRead}>
          <button className="rounded-md border border-line bg-raised px-3 py-1.5 text-sm text-muted hover:text-ink-text">
            Mark all read
          </button>
        </form>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface py-16 text-center text-muted">
          Nothing here. You'll see mentions, replies, applications, and updates.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => {
            const unread = !n.readAt;
            return (
              <li
                key={n.id}
                className={`rounded-xl border p-4 transition ${
                  unread
                    ? "border-brand-primary/30 bg-brand-primary-950"
                    : "border-line bg-surface"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-block h-6 w-6 shrink-0 rounded-md border border-line bg-raised text-center font-mono text-sm leading-6">
                    {KIND_ICON[n.kind] ?? "·"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-text">{n.message}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-dim">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {n.url && (
                    <Link
                      href={n.url}
                      className="rounded-md border border-line bg-raised px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink-text"
                    >
                      open →
                    </Link>
                  )}
                  {unread && (
                    <form
                      action={async () => {
                        "use server";
                        await markNotificationRead(n.id);
                      }}
                    >
                      <button
                        title="Mark read"
                        className="rounded-md border border-line bg-raised px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink-text"
                      >
                        ✓
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
