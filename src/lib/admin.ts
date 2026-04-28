export const ADMIN_EMAILS = [
  "monica.velasquez@afinbank.com",
  "mohammed.najem@afinbank.com",
  "emmanuel.sifah@afinbank.com",
] as const;

const adminSet = new Set<string>(ADMIN_EMAILS.map((e) => e.toLowerCase()));

export function isAdmin(email: string | null | undefined) {
  if (!email) return false;
  return adminSet.has(email.trim().toLowerCase());
}
