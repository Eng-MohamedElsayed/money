import { RULE_PROFILE_BUCKETS, type RuleBucket } from "./rules";

export type ClassifiableBucket = RuleBucket | "UNCLASSIFIED";

export const CATEGORY_BUCKETS = [...RULE_PROFILE_BUCKETS, "UNCLASSIFIED"] as const;

export const SYSTEM_CATEGORIES: ReadonlyArray<{
  name: string;
  defaultBucket: RuleBucket;
}> = [
  { name: "مصروفات أساسية", defaultBucket: "ESSENTIALS" },
  { name: "سوق وطعام", defaultBucket: "ESSENTIALS" },
  { name: "فاتورة ومصاريف", defaultBucket: "ESSENTIALS" },
  { name: "استثمار", defaultBucket: "GROWTH" },
  { name: "تعلّم وتطوير", defaultBucket: "GROWTH" },
  { name: "صندوق الطوارئ", defaultBucket: "STABILITY" },
  { name: "ادخاط", defaultBucket: "STABILITY" },
  { name: "مكافأة", defaultBucket: "REWARDS" },
];

/**
 * Decide a transaction's bucket. An explicit funded bucket always wins; a
 * category's default bucket is used when the user did not choose one, so
 * classifying a transaction automatically makes it count against the right
 * budget bucket. UNCLASSIFIED is only kept when there is nothing to derive from.
 */
export function deriveBucket(input: {
  explicit?: ClassifiableBucket | null;
  categoryBucket?: ClassifiableBucket | null;
}): ClassifiableBucket {
  if (input.explicit && input.explicit !== "UNCLASSIFIED") {
    return input.explicit;
  }
  if (input.categoryBucket && input.categoryBucket !== "UNCLASSIFIED") {
    return input.categoryBucket;
  }
  return "UNCLASSIFIED";
}
