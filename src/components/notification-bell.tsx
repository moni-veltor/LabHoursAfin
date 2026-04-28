import Link from "next/link";

export function NotificationBell({ unread }: { unread: number }) {
  return (
    <Link
      href="/inbox"
      className="relative rounded-md border border-line bg-raised px-2 py-1 text-muted hover:text-ink-text"
      title="Notifications"
    >
      <span className="font-mono text-[10px] uppercase tracking-wider">
        ◔ inbox
      </span>
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-accent px-1 font-mono text-[10px] font-medium text-ink shadow-glow-accent">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
