import Link from "next/link";

export function initials(name?: string | null, email?: string | null) {
  const src = (name ?? email ?? "?").trim();
  const parts = src.split(/\s+|[._@]/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const palette = [
  "bg-brand-primary/15 text-brand-primary-glow ring-1 ring-brand-primary/30",
  "bg-brand-success/15 text-brand-success ring-1 ring-brand-success/30",
  "bg-brand-accent/15 text-brand-accent ring-1 ring-brand-accent/30",
  "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
  "bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/30",
  "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30",
  "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
];

function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

export function Avatar({
  name,
  email,
  size = 24,
}: {
  name?: string | null;
  email?: string | null;
  size?: number;
}) {
  const cls = colorFor(email ?? name ?? "?");
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-mono font-medium ${cls}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.floor(size * 0.4)),
      }}
      aria-hidden
    >
      {initials(name, email)}
    </span>
  );
}

export function UserChip({
  id,
  name,
  email,
  size = 20,
}: {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
}) {
  const label = name ?? email ?? "Unknown";
  const inner = (
    <span className="inline-flex items-center gap-1.5">
      <Avatar name={name} email={email} size={size} />
      <span className="truncate">{label}</span>
    </span>
  );
  if (id) {
    return (
      <Link href={`/u/${id}`} className="hover:text-brand-primary-glow hover:underline">
        {inner}
      </Link>
    );
  }
  return inner;
}
