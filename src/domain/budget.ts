import { makeMoney, sumMoneys, type Money } from "./money";
import {
  DEFAULT_RULE_PERCENTS,
  allocateIncome,
  RULE_PROFILE_BUCKETS,
  type IncomeAllocation,
  type MoneyRule,
  type RuleBucket,
} from "./rules";

/**
 * Budget Period Projection.
 *
 * A BudgetPeriod holds one BudgetAllocation (1:1, `BudgetAllocation.periodId` is
 * unique), so allocation is computed ONCE from the period's total income rather
 * than per income row. Adding a second income mid-month therefore re-splits the
 * whole month — that is the intended policy, and it is why the total is summed
 * first and only then allocated.
 *
 * Invariants (tested):
 *   - the four bucket allocations always sum exactly to the period income
 *   - `remaining` is clamped at 0 so an overspent bucket reports a deficit
 *     instead of a negative-looking "remaining" balance
 *   - every value crossing this boundary is an integer in minor units
 */

export interface BucketSnapshot {
  bucket: RuleBucket;
  allocatedMinor: Money;
  spentMinor: Money;
  remainingMinor: Money;
  percentUsed: number;
  isOverspent: boolean;
}

export interface BudgetSnapshot {
  totalIncomeMinor: Money;
  totalAllocatedMinor: Money;
  totalSpentMinor: Money;
  buckets: BucketSnapshot[];
}

/** Sum a period's income rows, then split the total across the four buckets. */
export function allocatePeriod(
  incomes: readonly Money[],
  rule: MoneyRule = DEFAULT_RULE_PERCENTS,
): IncomeAllocation {
  return allocateIncome(sumMoneys(incomes), rule);
}

/** Throw unless the four parts sum exactly to the income (guard before persisting). */
export function assertAllocationBalanced(allocation: IncomeAllocation): void {
  const parts =
    allocation.growthMinor +
    allocation.stabilityMinor +
    allocation.essentialsMinor +
    allocation.rewardsMinor;

  if (parts !== allocation.totalMinor) {
    throw new Error(
      `Allocation must sum exactly to total: got ${parts}, expected ${allocation.totalMinor}`,
    );
  }
}

export function buildBudgetSnapshot(
  allocation: IncomeAllocation,
  spentByBucket: Partial<Record<RuleBucket, Money>> = {},
): BudgetSnapshot {
  assertAllocationBalanced(allocation);

  const allocatedFor = (bucket: RuleBucket): Money => {
    switch (bucket) {
      case "GROWTH":
        return allocation.growthMinor;
      case "STABILITY":
        return allocation.stabilityMinor;
      case "ESSENTIALS":
        return allocation.essentialsMinor;
      case "REWARDS":
        return allocation.rewardsMinor;
    }
  };

  const buckets: BucketSnapshot[] = RULE_PROFILE_BUCKETS.map((bucket) => {
    const allocatedMinor = allocatedFor(bucket);
    const spentMinor = spentByBucket[bucket] ?? makeMoney(0);
    const rawRemaining = allocatedMinor - spentMinor;
    const isOverspent = rawRemaining < 0;

    return {
      bucket,
      allocatedMinor,
      spentMinor,
      remainingMinor: isOverspent ? makeMoney(0) : makeMoney(rawRemaining),
      percentUsed:
        allocatedMinor === 0
          ? 0
          : Math.round((spentMinor / allocatedMinor) * 1000) / 10,
      isOverspent,
    };
  });

  return {
    totalIncomeMinor: allocation.totalMinor,
    totalAllocatedMinor: sumMoneys(buckets.map((b) => b.allocatedMinor)),
    totalSpentMinor: sumMoneys(buckets.map((b) => b.spentMinor)),
    buckets,
  };
}

/** Total overspend across buckets, i.e. how far past the funded amounts spending went. */
export function totalOverspend(snapshot: BudgetSnapshot): Money {
  return sumMoneys(
    snapshot.buckets
      .filter((b) => b.isOverspent)
      .map((b) => makeMoney(Math.max(0, b.spentMinor - b.allocatedMinor))),
  );
}
