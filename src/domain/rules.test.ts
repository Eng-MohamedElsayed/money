import { describe, expect, it } from "vitest";
import { allocateIncome, type MoneyRule } from "./rules";
import { makeMoney } from "./money";

const rule: MoneyRule = {  growthPercent: 25,
  stabilityPercent: 15,
  essentialsPercent: 50,
  rewardsPercent: 10,
};

describe("allocateIncome", () => {
  it("splits 20,000 EGP as 5,000 / 3,000 / 10,000 / 2,000", () => {
    const a = allocateIncome(makeMoney(2_000_000), rule);
    expect(a.growthMinor).toBe(500_000);
    expect(a.stabilityMinor).toBe(300_000);
    expect(a.essentialsMinor).toBe(1_000_000);
    expect(a.rewardsMinor).toBe(200_000);
    expect(a.totalMinor).toBe(2_000_000);
  });

  it("parts ALWAYS sum exactly to income, no leftovers, no negative parts", () => {
    for (const income of [0, 1, 9, 99, 100, 199, 5_371, 2_000_001, 3_000_000_000]) {
      const a = allocateIncome(makeMoney(income), rule);
      expect(a.growthMinor).toBeGreaterThanOrEqual(0);
      expect(a.stabilityMinor).toBeGreaterThanOrEqual(0);
      expect(a.essentialsMinor).toBeGreaterThanOrEqual(0);
      expect(a.rewardsMinor).toBeGreaterThanOrEqual(0);
      const sum =
        a.growthMinor + a.stabilityMinor + a.essentialsMinor + a.rewardsMinor;
      expect(sum).toBe(income);
      expect(a.totalMinor).toBe(income);
    }
  });

  it("rejects negative income", () => {
    expect(() => allocateIncome(makeMoney(-1), rule)).toThrow(/non-negative|negative|>= 0/);
  });
});
