import Link from "next/link";
import { timeAgo } from "@/lib/utils";

type Props = {
  id: string;
  title: string;
  summary: string;
  status: string;
  ownerName: string | null;
  timeCommitment: string | null;
  capacity: number | null;
  participantCount: number;
  createdAt: Date;
  tags: string[];
};

const statusStyles: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-800",
  in_progress: "bg-blue-100 text-blue-800",
  done: "bg-stone-200 text-stone-700",
  draft: "bg-amber-100 text-amber-800",
  archived: "bg-stone-100 text-stone-500",
};

export function InitiativeCard(p: Props) {
  return (
    <Link
      href={`/initiatives/${p.id}`}
      className="block rounded-xl border border-stone-200 bg-white p-5 transition hover:border-stone-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold tracking-tight">{p.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-stone-600">{p.summary}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            statusStyles[p.status] ?? "bg-stone-100 text-stone-700"
          }`}
        >
          {p.status.replace("_", " ")}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
        <span>by {p.ownerName ?? "—"}</span>
        {p.timeCommitment && <span>· {p.timeCommitment}</span>}
        {p.capacity != null && (
          <span>
            · {p.participantCount}/{p.capacity} joined
          </span>
        )}
        <span>· {timeAgo(p.createdAt)}</span>
      </div>
      {p.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.tags.map((t) => (
            <span
              key={t}
              className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-700"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
