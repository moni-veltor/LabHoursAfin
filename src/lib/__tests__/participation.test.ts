import { describe, it, expect } from "vitest";
import {
  termKey,
  termRange,
  previousTermKey,
  nextTermKey,
  termLabel,
  formatTermStart,
  TERM_CAP,
  checkParticipationRule,
} from "../participation";

describe("term math", () => {
  it("computes term key from a date", () => {
    expect(termKey(new Date(Date.UTC(2026, 0, 15)))).toBe("2026-Q1");
    expect(termKey(new Date(Date.UTC(2026, 3, 28)))).toBe("2026-Q2");
    expect(termKey(new Date(Date.UTC(2026, 6, 1)))).toBe("2026-Q3");
    expect(termKey(new Date(Date.UTC(2026, 11, 31)))).toBe("2026-Q4");
  });

  it("returns range bounds aligned to UTC", () => {
    const r = termRange("2026-Q2");
    expect(r.start.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("rolls over years correctly", () => {
    expect(previousTermKey("2026-Q1")).toBe("2025-Q4");
    expect(nextTermKey("2026-Q4")).toBe("2027-Q1");
  });

  it("formats labels", () => {
    expect(termLabel("2026-Q2")).toBe("Q2 2026");
    expect(formatTermStart("2026-Q3")).toMatch(/Jul/);
  });
});

describe("checkParticipationRule", () => {
  const baseStatus = {
    currentKey: "2026-Q2",
    currentLabel: "Q2 2026",
    previousKey: "2026-Q1",
    previousLabel: "Q1 2026",
    nextKey: "2026-Q3",
    nextStart: "1 Jul 2026",
    currentSlotsUsed: 0,
    currentCap: TERM_CAP,
    extraSlots: 0,
    currentCategories: [] as string[],
    previousCategories: [] as string[],
  };

  it("allows when fresh", () => {
    const v = checkParticipationRule(baseStatus, "ai", "AI");
    expect(v.ok).toBe(true);
  });

  it("blocks when term cap reached", () => {
    const v = checkParticipationRule(
      { ...baseStatus, currentSlotsUsed: 2 },
      "ai",
      "AI"
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("TERM_CAP");
  });

  it("blocks duplicate category in current term", () => {
    const v = checkParticipationRule(
      { ...baseStatus, currentSlotsUsed: 1, currentCategories: ["ai"] },
      "ai",
      "AI"
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("DUP_CATEGORY");
  });

  it("blocks repeating a previous-term category", () => {
    const v = checkParticipationRule(
      { ...baseStatus, previousCategories: ["data_architecture"] },
      "data_architecture",
      "Data Architecture"
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("PREV_TERM_CATEGORY");
  });

  it("respects extra slots from override", () => {
    const v = checkParticipationRule(
      {
        ...baseStatus,
        currentCap: TERM_CAP + 1,
        extraSlots: 1,
        currentSlotsUsed: 2,
        currentCategories: ["ai", "data_architecture"],
      },
      "third_parties",
      "3rd Parties"
    );
    expect(v.ok).toBe(true);
  });
});
