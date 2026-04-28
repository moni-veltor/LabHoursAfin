"use client";

import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import { DIFFICULTIES, FORMATS, type Difficulty, type Format } from "@/lib/categories";

type CategoryMeta = { label: string; badge: string; dot: string };

type Props = {
  id: string;
  title: string;
  summary: string;
  status: string;
  category: CategoryMeta;
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
  locked?: boolean;
};

const statusDot: Record<string, { dot: string; live?: boolean }> = {
  open: { dot: "bg-brand-success", live: true },
  in_progress: { dot: "bg-brand-primary-glow", live: true },
  done: { dot: "bg-dim" },
  draft: { dot: "bg-brand-accent" },
  archived: { dot: "bg-dim" },
};

export function InitiativeCard(p: Props) {
  const cat = p.category;
  const s = statusDot[p.status] ?? { dot: "bg-dim" };
  return (
    <Link
      href={`/initiatives/${p.id}`}
      className={`group relative block overflow-hidden rounded-xl border bg-surface transition ${
        p.featured
          ? "border-brand-accent/40 shadow-glow-accent"
          : "border-line hover:border-brand-primary/40 hover:shadow-glow-soft"
      } ${p.locked ? "opacity-50" : ""}`}
      title={p.locked ? "Category locked for you this term" : undefined}
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
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cat.badge}`}
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
          {p.locked && (
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-raised px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-dim">
              locked
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className={`relative h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {s.live && (
                <span
                  className={`absolute inset-0 rounded-full ${s.dot} animate-pulse-soft opacity-60`}
                />
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
              <Link
                key={t}
                href={`/t/${t}`}
                onClick={(e) => e.stopPropagation()}
                className="rounded-md border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted hover:text-ink-text"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
