export type Bucket =
  | "GROWTH"
  | "STABILITY"
  | "ESSENTIALS"
  | "REWARDS"
  | "UNCLASSIFIED";

export type Bucketish = `${Uppercase<Bucket>}`;
export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

/** Money-rule profile (the 25/15/50/10 plan). */
export interface MoneyRuleProfile {
  id?: string;
  name: string;
  growthPercent: number;
  stabilityPercent: number;
  essentialsPercent: number;
  rewardsPercent: number;
  currency: string;
}
