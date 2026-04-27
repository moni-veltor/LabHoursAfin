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
    cls: "bg-brand-success-50 text-brand-success-dark border-brand-success-100",
  },
  {
    test: (s) => s.owned >= 1,
    label: "Owner",
    emoji: "🏗️",
    cls: "bg-brand-primary-50 text-brand-primary border-brand-primary-100",
  },
  {
    test: (s) => s.joined >= 5,
    label: "Lab Rat",
    emoji: "🧪",
    cls: "bg-brand-accent-50 text-brand-accent-dark border-brand-accent-100",
  },
  {
    test: (s) => s.joined >= 3,
    label: "Regular",
    emoji: "✨",
    cls: "bg-brand-primary-50 text-brand-primary border-brand-primary-100",
  },
  {
    test: (s) => s.joined >= 1,
    label: "Curious",
    emoji: "👀",
    cls: "bg-stone-100 text-stone-700 border-stone-200",
  },
  {
    test: (s) => s.comments >= 5,
    label: "Discussor",
    emoji: "💬",
    cls: "bg-stone-100 text-stone-700 border-stone-200",
  },
];

export function SkillBadges({ stats }: { stats: Stats }) {
  const badges = TIERS.filter((t) => t.test(stats));
  if (badges.length === 0)
    return (
      <p className="text-xs text-stone-500">
        No badges yet — join an initiative to earn your first.
      </p>
    );
  return (
    <ul className="flex flex-wrap gap-2">
      {badges.map((b) => (
        <li
          key={b.label}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${b.cls}`}
        >
          <span>{b.emoji}</span>
          <span>{b.label}</span>
        </li>
      ))}
    </ul>
  );
}
