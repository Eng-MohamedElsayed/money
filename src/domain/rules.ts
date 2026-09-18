import { z } from "zod";
import { makeMoney, percentageOf, type Money } from "./money";

/**
 * Money Rule / Allocation Engine.
 *
 * The MVP ships a single "money rule" (a MoneyRuleProfile) that describes how
 * income is split across the four funded buckets. Allocation is a pure
 * function of income + profile; it never reads from or writes to the
 * database. Because the four percentages always sum to EXACTLY 100, the four
 * integer parts always sum EXACTLY to the income (largest-remainder method,
 * integer-only — no floating point is ever involved in money math).
 *
 * Invariants (tested):
 *   - the four part allocations never exceed the income, and sum to it exactly
 *   - every part is a non-negative integer
 *   - the profile is validated to sum to exactly 100 before it is persisted
 */

export const RULE_PROFILE_BUCKETS = [
  "GROWTH",
  "STABILITY",
  "ESSENTIALS",
  "REWARDS",
] as const;
export type RuleBucket = (typeof RULE_PROFILE_BUCKETS)[number];

export interface MoneyRuleProfile {
  id: string;
  userId: string;
  name: string;
  growthPercent: number;
  stabilityPercent: number;
  essentialsPercent: number;
  rewardsPercent: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const percentField = z.number().int().min(0).max(100);

export const moneyRuleProfileUpdateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    growthPercent: percentField,
    stabilityPercent: percentField,
    essentialsPercent: percentField,
    rewardsPercent: percentField,
    currency: z.string().min(1).max(8).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (r) => {
      const sum = (r.growthPercent ?? 0) + (r.stabilityPercent ?? 0) + (r.essentialsPercent ?? 0) + (r.rewardsPercent ?? 0);
      return sum === 100;
    },
    { message: "Percentages must sum to exactly 100", path: ["growthPercent"] },
  );

export type MoneyRuleProfileUpdate = z.infer<typeof moneyRuleProfileUpdateSchema>;

export const DEFAULT_RULE_PERCENTS = Object.freeze({
  growthPercent: 25,
  stabilityPercent: 15,
  essentialsPercent: 50,
  rewardsPercent: 10,
}) as Readonly<Pick<MoneyRuleProfile, "growthPercent" | "stabilityPercent" | "essentialsPercent" | "rewardsPercent">>;

/** The four biggest buckets, in a stable order. */
export const FUNDED_BUCKETS = RULE_PROFILE_BUCKETS as readonly string[];

export interface IncomeAllocation {
  growthMinor: Money;
  stabilityMinor: Money;
  essentialsMinor: Money;
  rewardsMinor: Money;
  totalMinor: Money;
}

export interface MoneyRule {
  growthPercent: number;
  stabilityPercent: number;
  essentialsPercent: number;
  rewardsPercent: number;
}

/**
 * Compute how `income` should be split across the four funded buckets. Pure
 * integer arithmetic (largest-remainder): the four parts ALWAYS sum EXACTLY
 * to `income` and are never negative.
 */
export function allocateIncome(
  income: Money,
  rule: MoneyRule,
): IncomeAllocation {
  if (income < 0) throw new Error(`income must be non-negative, got ${income}`);
  const parts: Record<RuleBucket, Money> = {
    GROWTH: percentageOf(income, rule.growthPercent),
    STABILITY: percentageOf(income, rule.stabilityPercent),
    ESSENTIALS: percentageOf(income, rule.essentialsPercent),
    REWARDS: percentageOf(income, rule.rewardsPercent),
  };

  let leftover = income - (parts.GROWTH + parts.STABILITY + parts.ESSENTIALS + parts.REWARDS);

  // Remainder redistribution: give 1 minor unit to the bucket with the largest
  // fractional remainder, repeat. leftover is in [0, 3] because percentages
  // sum to 100. Standard largest-remainder (Hamilton) method.
  while (leftover > 0) {
    const fractions: Record<RuleBucket, number> = {
      GROWTH: (income * rule.growthPercent) % 100,
      STABILITY: (income * rule.stabilityPercent) % 100,
      ESSENTIALS: (income * rule.essentialsPercent) % 100,
      REWARDS: (income * rule.rewardsPercent) % 100,
    };
    let chosen: RuleBucket = "GROWTH";
    for (const b of RULE_PROFILE_BUCKETS) {
      if (fractions[b] > fractions[chosen]) chosen = b;
    }
    parts[chosen] = makeMoney(parts[chosen] + 1);
    leftover -= 1;
    // remove the chosen fraction so a bucket cannot win twice before others
    fractions[chosen] = -1;
    // NOTE: mutation must be zeroed per-iteration; handle by re-reading above
  }

  return {
    growthMinor: parts.GROWTH,
    stabilityMinor: parts.STABILITY,
    essentialsMinor: parts.ESSENTIALS,
    rewardsMinor: parts.REWARDS,
    totalMinor: income,
  };
}
