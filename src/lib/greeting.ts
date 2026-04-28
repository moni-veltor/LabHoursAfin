export function hourAwareGreeting(name?: string | null): string {
  const h = new Date().getHours();
  const who = name ? `, ${name.split(" ")[0]}` : "";
  if (h >= 5 && h < 12) return `Good morning${who}`;
  if (h >= 12 && h < 17) return `Good afternoon${who}`;
  if (h >= 17 && h < 22) return `Good evening${who}`;
  return `Still up${who}?`;
}
