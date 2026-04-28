export function readTimeMinutes(...texts: (string | null | undefined)[]) {
  const total = texts.filter(Boolean).join(" ");
  const words = total.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / 220));
}
