type Stats = {
  joined: number;
  owned: number;
  outcomesPosted: number;
  comments: number;
};

const TIERS: { test: (s: Stats) => boolean; label: string; emoji: string; cls: string }[] = [
  {
    test: (s) => s.outcomesPosted >= 1,
    label: "Shipper",
    emoji: "🚀",
    cls: "border-brand-success/40 bg-brand-success-950 text-brand-success",
  },
  {
    test: (s) => s.owned >= 1,
    label: "Owner",
    emoji: "🏗️",
    cls: "border-brand-primary/40 bg-brand-primary-950 text-brand-primary-glow",
  },
  {
    test: (s) => s.joined >= 5,
    label: "Lab Rat",
    emoji: "🧪",
    cls: "border-brand-accent/40 bg-brand-accent-950 text-brand-accent",
  },
  {
    test: (s) => s.joined >= 3,
    label: "Regular",
    emoji: "✨",
    cls: "border-brand-primary/40 bg-brand-primary-950 text-brand-primary-glow",
  },
  {
    test: (s) => s.joined >= 1,
    label: "Curious",
    emoji: "👀",
    cls: "border-line bg-raised text-muted",
  },
  {
    test: (s) => s.comments >= 5,
    label: "Discussor",
    emoji: "💬",
    cls: "border-line bg-raised text-muted",
  },
];

export function SkillBadges({ stats }: { stats: Stats }) {
  const badges = TIERS.filter((t) => t.test(stats));
  if (badges.length === 0)
    return (
      <p className="text-xs text-muted">
        No badges yet — join an initiative to earn your first.
      </p>
    );
  return (
    <ul className="flex flex-wrap gap-2">
      {badges.map((b) => (
        <li
          key={b.label}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider ${b.cls}`}
        >
          <span>{b.emoji}</span>
          <span>{b.label}</span>
        </li>
      ))}
    </ul>
  );
}
