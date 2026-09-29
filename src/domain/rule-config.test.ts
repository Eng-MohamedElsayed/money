import { describe, expect, it } from "vitest";
import {
  assertValidRule,
  isValidRule,
  ruleFromProfile,
  sumRulePercents,
  DEFAULT_RULE_PERCENTS,
  type MoneyRule,
} from "./rules";
import { allocateIncome, resolveRuleFromProfile } from "./rules";
import { allocatePeriod, buildBudgetSnapshot } from "./budget";
import { makeMoney } from "./money";

describe("rule validation", () => {
  it("accepts the default rule", () => {
    expect(isValidRule({ ...DEFAULT_RULE_PERCENTS })).toBe(true);
    expect(sumRulePercents({ ...DEFAULT_RULE_PERCENTS })).toBe(100);
  });

  it("accepts a custom rule that sums to 100", () => {
    expect(isValidRule({ growthPercent: 10, stabilityPercent: 20, essentialsPercent: 60, rewardsPercent: 10 })).toBe(true);
  });

  it("rejects a rule that does not sum to exactly 100", () => {
    expect(isValidRule({ growthPercent: 10, stabilityPercent: 20, essentialsPercent: 60, rewardsPercent: 5 })).toBe(false);
    expect(() =>
      assertValidRule({ growthPercent: 10, stabilityPercent: 20, essentialsPercent: 60, rewardsPercent: 5 }),
    ).toThrow(/sum to exactly 100/);
  });

  it("rejects a rule that sums to more than 100", () => {
    expect(isValidRule({ growthPercent: 30, stabilityPercent: 30, essentialsPercent: 60, rewardsPercent: 10 })).toBe(false);
  });

  it("rejects non-integer and out-of-range percentages", () => {
    expect(isValidRule({ growthPercent: 12.5, stabilityPercent: 15, essentialsPercent: 50, rewardsPercent: 22.5 })).toBe(false);
    expect(isValidRule({ growthPercent: -5, stabilityPercent: 15, essentialsPercent: 50, rewardsPercent: 40 })).toBe(false);
    expect(isValidRule({ growthPercent: 150, stabilityPercent: 0, essentialsPercent: 0, rewardsPercent: -50 })).toBe(false);
  });

  it("accepts a zero-percent bucket when the rest sums to 100", () => {
    expect(isValidRule({ growthPercent: 0, stabilityPercent: 0, essentialsPercent: 100, rewardsPercent: 0 })).toBe(true);
  });

  it("maps a profile to a rule and validates it", () => {
    const rule = ruleFromProfile({
      growthPercent: 40,
      stabilityPercent: 10,
      essentialsPercent: 40,
      rewardsPercent: 10,
    });
    expect(rule.growthPercent).toBe(40);
    expect(() =>
      ruleFromProfile({ growthPercent: 40, stabilityPercent: 10, essentialsPercent: 40, rewardsPercent: 5 }),
    ).toThrow(/sum to exactly 100/);
  });
});

describe("allocation with a custom rule", () => {
  const custom: MoneyRule = {
    growthPercent: 40,
    stabilityPercent: 10,
    essentialsPercent: 40,
    rewardsPercent: 10,
  };

  it("splits income by the custom percentages", () => {
    const allocation = allocateIncome(makeMoney(100_000), custom);
    expect(allocation.growthMinor).toBe(40_000);
    expect(allocation.stabilityMinor).toBe(10_000);
    expect(allocation.essentialsMinor).toBe(40_000);
    expect(allocation.rewardsMinor).toBe(10_000);
  });

  it("still sums exactly with a custom rule and an awkward remainder", () => {
    const allocation = allocateIncome(makeMoney(9_999), custom);
    const parts =
      allocation.growthMinor +
      allocation.stabilityMinor +
      allocation.essentialsMinor +
      allocation.rewardsMinor;
    expect(parts).toBe(allocation.totalMinor);
    expect(allocation.totalMinor).toBe(9_999);
  });

  it("allocatePeriod honors a custom rule across multiple incomes", () => {
    const allocation = allocatePeriod([makeMoney(60_000), makeMoney(40_000)], custom);
    expect(allocation.growthMinor).toBe(40_000);
    expect(allocation.essentialsMinor).toBe(40_000);
  });

  it("throws when asked to allocate with an invalid rule", () => {
    expect(() =>
      allocateIncome(makeMoney(1_000), {
        growthPercent: 10,
        stabilityPercent: 10,
        essentialsPercent: 10,
        rewardsPercent: 10,
      }),
    ).toThrow(/sum to exactly 100/);
  });

  it("reflects the custom rule in the snapshot allocations", () => {
    const allocation = allocatePeriod([makeMoney(200_000)], custom);
    const snapshot = buildBudgetSnapshot(allocation);
    const growth = snapshot.buckets.find((b) => b.bucket === "GROWTH");
    expect(growth?.allocatedMinor).toBe(80_000);
    expect(snapshot.totalAllocatedMinor).toBe(200_000);
  });
});

describe("resolveRuleFromProfile", () => {
  const currency = "EGP";

  it("uses a valid active profile", () => {
    const resolved = resolveRuleFromProfile({
      growthPercent: 40,
      stabilityPercent: 10,
      essentialsPercent: 40,
      rewardsPercent: 10,
      currency,
    });
    expect(resolved.isCustom).toBe(true);
    expect(resolved.rule.growthPercent).toBe(40);
    expect(resolved.currency).toBe(currency);
  });

  it("falls back to defaults when there is no profile", () => {
    const resolved = resolveRuleFromProfile(null);
    expect(resolved.isCustom).toBe(false);
    expect(resolved.rule).toEqual({ ...DEFAULT_RULE_PERCENTS });
  });

  it("falls back to defaults for a corrupt profile that does not sum to 100", () => {
    const resolved = resolveRuleFromProfile({
      growthPercent: 33,
      stabilityPercent: 33,
      essentialsPercent: 33,
      rewardsPercent: 33,
      currency,
    });
    expect(resolved.isCustom).toBe(false);
    expect(resolved.rule).toEqual({ ...DEFAULT_RULE_PERCENTS });
  });

  it("falls back to defaults for a corrupt profile with out-of-range values", () => {
    const resolved = resolveRuleFromProfile({
      growthPercent: -10,
      stabilityPercent: 0,
      essentialsPercent: 0,
      rewardsPercent: 110,
      currency,
    });
    expect(resolved.isCustom).toBe(false);
    expect(resolved.rule.growthPercent).toBe(25);
  });
});
