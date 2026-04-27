import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import {
  CATEGORIES,
  DIFFICULTIES,
  FORMATS,
  type Category,
  type Difficulty,
  type Format,
} from "@/lib/categories";

type Props = {
  id: string;
  title: string;
  summary: string;
  status: string;
  category: Category;
  format: Format;
  difficulty: Difficulty;
  ownerName: string | null;
  timeCommitment: string | null;
  capacity: number | null;
  participantCount: number;
  createdAt: Date;
  tags: string[];
  featured?: boolean;
  coverImage?: string | null;
  crossTeam?: boolean;
};

const statusStyles: Record<string, string> = {
  open: "bg-brand-success-50 text-brand-success-dark",
  in_progress: "bg-brand-primary-50 text-brand-primary",
  done: "bg-stone-200 text-stone-700",
  draft: "bg-brand-accent-50 text-brand-accent-dark",
  archived: "bg-stone-100 text-stone-500",
};

export function InitiativeCard(p: Props) {
  const cat = CATEGORIES[p.category];
  return (
    <Link
      href={`/initiatives/${p.id}`}
      className={`group block overflow-hidden rounded-xl border bg-white transition hover:shadow-sm ${
        p.featured
          ? "border-brand-accent/60 ring-1 ring-brand-accent/30"
          : "border-stone-200 hover:border-brand-primary/40"
      }`}
    >
      {p.coverImage && (
        <div
          className="h-32 w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]"
          style={{ backgroundImage: `url(${p.coverImage})` }}
        />
      )}
      <div className="p-5">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${cat.dot}`} />
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cat.badge}`}>
          {cat.label}
        </span>
        {p.featured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-accent-50 px-2 py-0.5 text-xs font-medium text-brand-accent-dark">
            ★ Featured
          </span>
        )}
        {p.crossTeam && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-success-50 px-2 py-0.5 text-xs font-medium text-brand-success-dark">
            cross-team
          </span>
        )}
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
            statusStyles[p.status] ?? "bg-stone-100 text-stone-700"
          }`}
        >
          {p.status.replace("_", " ")}
        </span>
      </div>

      <h3 className="mt-3 line-clamp-2 text-lg font-semibold tracking-tight group-hover:text-brand-primary group-hover:underline">
        {p.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-stone-600">{p.summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
        <span>by {p.ownerName ?? "—"}</span>
        <span>· {FORMATS[p.format].label}</span>
        {p.difficulty !== "any" && (
          <span>· {DIFFICULTIES[p.difficulty].label}</span>
        )}
        {p.timeCommitment && <span>· {p.timeCommitment}</span>}
        {p.capacity != null && (
          <span>
            · {p.participantCount}/{p.capacity} joined
          </span>
        )}
        <span className="ml-auto">{timeAgo(p.createdAt)}</span>
      </div>

      {p.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-700"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      </div>
    </Link>
  );
}
