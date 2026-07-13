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
    activeCount: 0,
    cap: TERM_CAP,
    extraSlots: 0,
    completedCount: 0,
    active: [] as { id: string; title: string; category: string }[],
  };

  it("allows when below the cap", () => {
    expect(checkParticipationRule({ ...baseStatus, activeCount: 1 }).ok).toBe(
      true
    );
  });

  it("blocks when already at the concurrent cap", () => {
    const v = checkParticipationRule({ ...baseStatus, activeCount: 2 });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("ACTIVE_CAP");
  });

  it("frees a slot as active count drops (after completing one)", () => {
    // Two joined, one completed → activeCount back to 1 → can join again.
    expect(
      checkParticipationRule({
        ...baseStatus,
        activeCount: 1,
        completedCount: 1,
      }).ok
    ).toBe(true);
  });

  it("respects extra slots from an admin override", () => {
    const v = checkParticipationRule({
      ...baseStatus,
      cap: TERM_CAP + 1,
      extraSlots: 1,
      activeCount: 2,
    });
    expect(v.ok).toBe(true);
  });
});
