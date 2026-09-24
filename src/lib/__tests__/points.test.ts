import { describe, expect, it } from "vitest";
import { RULES, type Award, type PointKind, emptyByKind, tally } from "@/lib/points";
import { termKey } from "@/lib/participation";

const award = (kind: PointKind, iso: string, title = "A session"): Award => ({
  kind,
  points: RULES[kind].points,
  term: termKey(new Date(iso)),
  at: new Date(iso),
  title,
});

describe("the rules", () => {
  it("scores turning up below running the session", () => {
    // Somebody has to host. If attending paid as well as hosting, nobody would.
    expect(RULES.ran.points).toBeGreaterThan(RULES.attended.points);
  });

  it("gives every kind a positive score and an explanation", () => {
    for (const [kind, r] of Object.entries(RULES)) {
      expect(r.points, kind).toBeGreaterThan(0);
      expect(r.why.length, kind).toBeGreaterThan(10);
    }
  });

  it("covers exactly the kinds emptyByKind knows about", () => {
    expect(Object.keys(RULES).sort()).toEqual(Object.keys(emptyByKind()).sort());
  });
});

describe("tally", () => {
  it("adds up a mixed history", () => {
    const { total, byKind } = tally([
      award("attended", "2026-08-04"),
      award("attended", "2026-08-11"),
      award("ran", "2026-09-01"),
      award("outcome", "2026-09-01"),
    ]);
    expect(total).toBe(10 + 10 + 25 + 15);
    expect(byKind.attended).toBe(20);
    expect(byKind.ran).toBe(25);
    expect(byKind.demo).toBe(0);
  });

  it("counts nothing for a person with no awards", () => {
    const { total, awards } = tally([]);
    expect(total).toBe(0);
    expect(awards).toEqual([]);
  });

  it("narrows to one quarter when asked", () => {
    const history = [
      award("attended", "2026-02-10"), // Q1
      award("attended", "2026-08-04"), // Q3
      award("ran", "2026-09-30"), //     Q3
    ];
    expect(tally(history, "2026-Q3").total).toBe(35);
    expect(tally(history, "2026-Q1").total).toBe(10);
    expect(tally(history, "2026-Q2").total).toBe(0);
    expect(tally(history).total).toBe(45);
  });

  it("dates an award by the quarter the session fell in", () => {
    // A register taken late must not drop old points into this quarter.
    expect(award("attended", "2026-03-31").term).toBe("2026-Q1");
    expect(award("attended", "2026-04-01").term).toBe("2026-Q2");
  });
});
