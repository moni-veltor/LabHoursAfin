// All human-facing scheduling for Lab Hours is UK time (Europe/London), which
// is GMT in winter and BST in summer. These helpers convert between a
// datetime-local wall-clock string and the UTC instant we store, using the
// correct offset for that specific date — no hard-coded ±1h.

export const LONDON = "Europe/London";

// Minutes that `timeZone` is ahead of UTC at the given instant.
function offsetMinutes(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value;
  const asUTC = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    +p.hour,
    +p.minute,
    +p.second
  );
  return (asUTC - instant.getTime()) / 60000;
}

// Interpret a "YYYY-MM-DDTHH:mm" wall-clock string as UK local time → UTC Date.
export function parseLondonLocal(local: string): Date | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const y = +m[1],
    mo = +m[2],
    d = +m[3],
    h = +m[4],
    mi = +m[5];
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // Two passes so times near a DST boundary resolve to the right offset.
  let off = offsetMinutes(new Date(guess), LONDON);
  let utc = guess - off * 60000;
  off = offsetMinutes(new Date(utc), LONDON);
  utc = guess - off * 60000;
  return new Date(utc);
}

// UTC instant → "YYYY-MM-DDTHH:mm" UK wall-clock (for a datetime-local field).
export function formatLondonInput(d: Date): string {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(d)) p[part.type] = part.value;
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// UTC instant → friendly UK label, e.g. "20 Jul 2026, 09:00 BST".
export function formatLondon(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}
