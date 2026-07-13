// Shark-tank judges: up to JUDGE_POOL people sign up, JUDGE_PANEL are drawn at random.
export const JUDGE_POOL = 5;
export const JUDGE_PANEL = 3;

// A hackathon holds two full teams of competitors (2 × teamCapacity).
export function hackCapacity(teamCapacity: number) {
  return teamCapacity * 2;
}
