import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "crypto";

// A fresh, uniform 4-digit PIN (1000–9999, always four digits).
export function generatePin(): string {
  return String(randomInt(1000, 10000));
}

// 4-digit sign-in PINs are stored hashed (never plaintext) as "saltHex:hashHex".
// scryptSync uses Node's defaults on both sides, so hashing and verifying stay
// in sync. Note: a 4-digit space is small — pair this with login rate-limiting.

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(pin, salt, 32);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string | null | undefined): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [saltHex, hashHex] = stored.split(":");
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const derived = scryptSync(pin, salt, expected.length);
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
