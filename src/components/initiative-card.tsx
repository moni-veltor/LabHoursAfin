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

const categoryDarkBadge: Record<Category, string> = {
  product_engineering: "bg-blue-500/10 text-blue-300 border-blue-400/30",
  data_architecture: "bg-purple-500/10 text-purple-300 border-purple-400/30",
  ai: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-400/30",
  third_parties: "bg-amber-500/10 text-amber-300 border-amber-400/30",
  operational_resilience: "bg-rose-500/10 text-rose-300 border-rose-400/30",
  information_security: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30",
  other: "bg-stone-500/10 text-stone-300 border-stone-400/30",
};

const statusDot: Record<string, { dot: string; live?: boolean; label?: string }> = {
  open: { dot: "bg-brand-success", live: true },
  in_progress: { dot: "bg-brand-primary-glow", live: true },
  done: { dot: "bg-dim" },
  draft: { dot: "bg-brand-accent" },
  archived: { dot: "bg-dim" },
};

export function InitiativeCard(p: Props) {
  const cat = CATEGORIES[p.category];
  const catDark = categoryDarkBadge[p.category];
  const s = statusDot[p.status] ?? { dot: "bg-dim" };
  return (
    <Link
      href={`/initiatives/${p.id}`}
      className={`group relative block overflow-hidden rounded-xl border bg-surface transition ${
        p.featured
          ? "border-brand-accent/40 shadow-glow-accent"
          : "border-line hover:border-brand-primary/40 hover:shadow-glow-soft"
      }`}
    >
      {p.coverImage && (
        <div className="relative h-32 w-full overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${p.coverImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${catDark}`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${cat.dot}`} />
            {cat.label}
          </span>
          {p.featured && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-accent/40 bg-brand-accent-950 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-accent">
              ★ featured
            </span>
          )}
          {p.crossTeam && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-success/30 bg-brand-success-950 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brand-success">
              cross-team
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className={`relative h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {s.live && (
                <span className={`absolute inset-0 rounded-full ${s.dot} animate-pulse-soft opacity-60`} />
              )}
            </span>
            {p.status.replace("_", " ")}
          </span>
        </div>

        <h3 className="mt-3 line-clamp-2 text-lg font-semibold tracking-tight text-ink-text group-hover:text-brand-primary-glow">
          {p.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{p.summary}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-dim">
          <span>by {p.ownerName ?? "—"}</span>
          <span className="text-line-strong">·</span>
          <span>{FORMATS[p.format].label.toLowerCase()}</span>
          {p.difficulty !== "any" && (
            <>
              <span className="text-line-strong">·</span>
              <span>{DIFFICULTIES[p.difficulty].label.toLowerCase()}</span>
            </>
          )}
          {p.timeCommitment && (
            <>
              <span className="text-line-strong">·</span>
              <span>{p.timeCommitment}</span>
            </>
          )}
          {p.capacity != null && (
            <>
              <span className="text-line-strong">·</span>
              <span className="text-muted">
                {p.participantCount}/{p.capacity}
              </span>
            </>
          )}
          <span className="ml-auto">{timeAgo(p.createdAt)}</span>
        </div>

        {p.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded-md border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
