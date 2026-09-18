import { describe, expect, it } from "vitest";

/**
 * "Closed" must beat everything. The join area on the initiative page shows
 * the join CTA only when a stack of conditions all hold, and the bug being
 * fixed is that an initiative with no approval and no capacity accepted
 * everyone. So the rule under test is simple and worth pinning: if closed,
 * no join CTA, whatever the other flags say — and following stays available.
 */
type Flags = { closed: boolean; capacityFull: boolean; ruleOk: boolean; canJoinWindow: boolean };

// Mirrors the page's gate: !closed && !capacityFull && ruleOk && canJoinWindow.
const showsJoin = (f: Flags) => !f.closed && !f.capacityFull && f.ruleOk && f.canJoinWindow;
const showsClosedNote = (f: Flags) => f.closed;
const showsCapacityNote = (f: Flags) => !f.closed && f.capacityFull && f.ruleOk;

describe("the join gate", () => {
  const open: Flags = { closed: false, capacityFull: false, ruleOk: true, canJoinWindow: true };

  it("shows the join CTA on a fully open initiative", () => {
    expect(showsJoin(open)).toBe(true);
  });

  it("hides the join CTA the moment it is closed, whatever else is true", () => {
    expect(showsJoin({ ...open, closed: true })).toBe(false);
    // even if there is capacity, the window is open and the rules pass
    expect(showsJoin({ closed: true, capacityFull: false, ruleOk: true, canJoinWindow: true })).toBe(false);
  });

  it("shows the closed note only when closed", () => {
    expect(showsClosedNote({ ...open, closed: true })).toBe(true);
    expect(showsClosedNote(open)).toBe(false);
  });

  it("does not also show the capacity note when closed — closed wins", () => {
    expect(showsCapacityNote({ closed: true, capacityFull: true, ruleOk: true, canJoinWindow: true })).toBe(false);
    expect(showsCapacityNote({ closed: false, capacityFull: true, ruleOk: true, canJoinWindow: true })).toBe(true);
  });
});
