import { getActiveAnnouncement } from "@/lib/announcements-server";

export async function AnnouncementBanner() {
  const ann = await getActiveAnnouncement();
  if (!ann) return null;
  return (
    <div className="border-b border-brand-accent/30 bg-brand-accent-950">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2 text-sm">
        <span className="rounded-md border border-brand-accent/40 bg-brand-accent-900 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-accent">
          ★ announcement
        </span>
        <p className="text-brand-accent">{ann.body}</p>
      </div>
    </div>
  );
}
