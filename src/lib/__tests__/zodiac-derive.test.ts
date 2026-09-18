import { describe, expect, it } from "vitest";
import { zodiacFromDate, chineseZodiacFromDate } from "@/lib/zodiac";

/**
 * The admin sets a birth date and the two signs are derived — never typed.
 * The one that bites is the timezone: a date-input string must be read as the
 * day the person chose, not shifted by the server's offset. So the actions
 * parse "YYYY-MM-DD" as UTC midnight, and these pin the boundary cases where
 * a shift would change the answer.
 */
const utc = (s: string) => new Date(`${s}T00:00:00Z`);

describe("zodiac derivation", () => {
  it("reads the western sign from the date", () => {
    expect(zodiacFromDate(utc("1990-05-20"))).toBe("Taurus");
    expect(zodiacFromDate(utc("1967-05-20"))).toBe("Taurus");
    expect(zodiacFromDate(utc("1980-07-19"))).toBe("Cancer");
  });

  it("holds at a cusp — 21 Dec is Sagittarius, 22 Dec is Capricorn", () => {
    expect(zodiacFromDate(utc("1985-12-21"))).toBe("Sagittarius");
    expect(zodiacFromDate(utc("1985-12-22"))).toBe("Capricorn");
  });

  it("reads the Chinese sign from the year", () => {
    expect(chineseZodiacFromDate(utc("1990-05-20"))).toBe("Horse");
    expect(chineseZodiacFromDate(utc("1967-05-20"))).toBe("Goat");
  });

  it("a 1 January birthday keeps its own year when read as UTC", () => {
    // The bug a local parse would cause: shifting to 31 Dec of the prior year.
    expect(chineseZodiacFromDate(utc("1990-01-01"))).toBe(chineseZodiacFromDate(utc("1990-06-01")));
  });
});
