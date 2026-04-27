export const TECH_TEAM_EMAILS = [
  "monica.velasquez@afinbank.com",
  "mohammed.najem@afinbank.com",
  "emmanuel.sifah@afinbank.com",
] as const;

const techSet = new Set<string>(TECH_TEAM_EMAILS.map((e) => e.toLowerCase()));

export function isTechTeam(email: string | null | undefined) {
  if (!email) return false;
  return techSet.has(email.trim().toLowerCase());
}
