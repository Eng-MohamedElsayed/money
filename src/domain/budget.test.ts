import { describe, expect, it } from "vitest";
import {
  allocatePeriod,
  assertAllocationBalanced,
  buildBudgetSnapshot,
  totalOverspend,
} from "./budget";
import { makeMoney } from "./money";
import { DEFAULT_RULE_PERCENTS, allocateIncome } from "./rules";

describe("allocatePeriod", () => {
  it("splits a period's total income, not each income row", () => {
    const allocation = allocatePeriod(
      [makeMoney(100_000), makeMoney(50_000)],
      DEFAULT_RULE_PERCENTS,
    );
    expect(allocation.totalMinor).toBe(150_000);
    expect(allocation.growthMinor).toBe(37_500);
    expect(allocation.stabilityMinor).toBe(22_500);
    expect(allocation.essentialsMinor).toBe(75_000);
    expect(allocation.rewardsMinor).toBe(15_000);
  });

  it("returns a zero allocation for an empty period", () => {
    const allocation = allocatePeriod([], DEFAULT_RULE_PERCENTS);
    expect(allocation.totalMinor).toBe(0);
    assertAllocationBalanced(allocation);
  });

  it("is idempotent: re-splitting the same total yields the same parts", () => {
    const incomes = [makeMoney(33_333), makeMoney(7_777)];
    const first = allocatePeriod(incomes, DEFAULT_RULE_PERCENTS);
    const second = allocatePeriod(incomes, DEFAULT_RULE_PERCENTS);
    expect(second).toEqual(first);
  });
});

describe("assertAllocationBalanced", () => {
  it("accepts a balanced allocation", () => {
    expect(() =>
      assertAllocationBalanced(allocateIncome(makeMoney(20_000), DEFAULT_RULE_PERCENTS)),
    ).not.toThrow();
  });

  it("rejects an allocation that does not sum to the total", () => {
    const bad = {
      growthMinor: makeMoney(100),
      stabilityMinor: makeMoney(100),
      essentialsMinor: makeMoney(100),
      rewardsMinor: makeMoney(100),
      totalMinor: makeMoney(500),
    };
    expect(() => assertAllocationBalanced(bad)).toThrow(/sum exactly/);
  });
});

describe("buildBudgetSnapshot", () => {
  const allocation = allocateIncome(makeMoney(100_000), DEFAULT_RULE_PERCENTS);

  it("reports allocated, spent and remaining per bucket", () => {
    const snapshot = buildBudgetSnapshot(allocation, {
      ESSENTIALS: makeMoney(10_000),
    });

    const essentials = snapshot.buckets.find((b) => b.bucket === "ESSENTIALS");
    expect(essentials?.allocatedMinor).toBe(50_000);
    expect(essentials?.spentMinor).toBe(10_000);
    expect(essentials?.remainingMinor).toBe(40_000);
    expect(essentials?.percentUsed).toBe(20);
    expect(essentials?.isOverspent).toBe(false);
  });

  it("always returns the four funded buckets in a stable order", () => {
    const snapshot = buildBudgetSnapshot(allocation);
    expect(snapshot.buckets.map((b) => b.bucket)).toEqual([
      "GROWTH",
      "STABILITY",
      "ESSENTIALS",
      "REWARDS",
    ]);
  });

  it("clamps remaining at zero and flags an overspent bucket", () => {
    const snapshot = buildBudgetSnapshot(allocation, {
      REWARDS: makeMoney(15_000),
    });

    const rewards = snapshot.buckets.find((b) => b.bucket === "REWARDS");
    expect(rewards?.isOverspent).toBe(true);
    expect(rewards?.remainingMinor).toBe(0);
    expect(rewards?.spentMinor).toBe(15_000);
    expect(totalOverspend(snapshot)).toBe(5_000);
  });

  it("keeps bucket allocated totals equal to the income", () => {
    const snapshot = buildBudgetSnapshot(allocation, {
      GROWTH: makeMoney(1),
      STABILITY: makeMoney(1),
      ESSENTIALS: makeMoney(1),
      REWARDS: makeMoney(1),
    });
    expect(snapshot.totalAllocatedMinor).toBe(allocation.totalMinor);
    expect(snapshot.totalIncomeMinor).toBe(allocation.totalMinor);
  });

  it("reports 0% used when a bucket has nothing allocated", () => {
    const zeroIncome = allocateIncome(makeMoney(0), DEFAULT_RULE_PERCENTS);
    const snapshot = buildBudgetSnapshot(zeroIncome, {
      GROWTH: makeMoney(500),
    });
    const growth = snapshot.buckets.find((b) => b.bucket === "GROWTH");
    expect(growth?.percentUsed).toBe(0);
    expect(growth?.isOverspent).toBe(true);
  });

  it("throws when handed an unbalanced allocation", () => {
    const unbalanced = {
      growthMinor: makeMoney(1),
      stabilityMinor: makeMoney(1),
      essentialsMinor: makeMoney(1),
      rewardsMinor: makeMoney(1),
      totalMinor: makeMoney(999),
    };
    expect(() => buildBudgetSnapshot(unbalanced)).toThrow(/sum exactly/);
  });
});
