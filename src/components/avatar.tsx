import Link from "next/link";

export function initials(name?: string | null, email?: string | null) {
  const src = (name ?? email ?? "?").trim();
  const parts = src.split(/\s+|[._@]/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const palette = [
  "bg-blue-100 text-blue-900",
  "bg-emerald-100 text-emerald-900",
  "bg-amber-100 text-amber-900",
  "bg-rose-100 text-rose-900",
  "bg-fuchsia-100 text-fuchsia-900",
  "bg-purple-100 text-purple-900",
  "bg-stone-200 text-stone-900",
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
      className={`inline-flex items-center justify-center rounded-full font-medium ${cls}`}
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
      <Link href={`/u/${id}`} className="hover:underline">
        {inner}
      </Link>
    );
  }
  return inner;
}
