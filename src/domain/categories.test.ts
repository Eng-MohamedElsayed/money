import { describe, expect, it } from "vitest";
import {
  CATEGORY_BUCKETS,
  SYSTEM_CATEGORIES,
  deriveBucket,
  type ClassifiableBucket,
} from "./categories";
import { categoryInputSchema, categoryUpdateSchema } from "../lib/schemas/categories";

describe("SYSTEM_CATEGORIES", () => {
  it("has unique names", () => {
    const names = SYSTEM_CATEGORIES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("only assigns funded buckets", () => {
    for (const c of SYSTEM_CATEGORIES) {
      expect(c.defaultBucket).not.toBe("UNCLASSIFIED");
    }
  });

  it("covers all four funded buckets", () => {
    const covered = new Set(SYSTEM_CATEGORIES.map((c) => c.defaultBucket));
    expect(covered).toEqual(new Set(["GROWTH", "STABILITY", "ESSENTIALS", "REWARDS"]));
  });
});

describe("deriveBucket", () => {
  it("keeps an explicit funded bucket", () => {
    expect(deriveBucket({ explicit: "REWARDS", categoryBucket: "GROWTH" })).toBe("REWARDS");
  });

  it("uses the category bucket when nothing explicit was chosen", () => {
    expect(deriveBucket({ explicit: null, categoryBucket: "ESSENTIALS" })).toBe("ESSENTIALS");
  });

  it("falls back to the category bucket when the explicit one is UNCLASSIFIED", () => {
    expect(deriveBucket({ explicit: "UNCLASSIFIED", categoryBucket: "STABILITY" })).toBe("STABILITY");
  });

  it("keeps UNCLASSIFIED when there is nothing to derive from", () => {
    expect(deriveBucket({})).toBe("UNCLASSIFIED");
    expect(deriveBucket({ explicit: "UNCLASSIFIED", categoryBucket: null })).toBe("UNCLASSIFIED");
    expect(deriveBucket({ explicit: null, categoryBucket: "UNCLASSIFIED" })).toBe("UNCLASSIFIED");
  });

  it("never returns UNCLASSIFIED for a funded category", () => {
    for (const bucket of CATEGORY_BUCKETS) {
      if (bucket === "UNCLASSIFIED") continue;
      const derived = deriveBucket({ explicit: null, categoryBucket: bucket });
      expect(derived).toBe(bucket as ClassifiableBucket);
    }
  });
});

describe("categoryInputSchema", () => {
  it("trims and accepts a normal category", () => {
    const parsed = categoryInputSchema.parse({ name: "  صيانة السيارة  ", defaultBucket: "GROWTH" });
    expect(parsed.name).toBe("صيانة السيارة");
    expect(parsed.defaultBucket).toBe("GROWTH");
  });

  it("defaults the bucket to UNCLASSIFIED", () => {
    expect(categoryInputSchema.parse({ name: "عام" }).defaultBucket).toBe("UNCLASSIFIED");
  });

  it("rejects an empty or overlong name", () => {
    expect(categoryInputSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ name: "x".repeat(61) }).success).toBe(false);
  });

  it("rejects an unknown bucket", () => {
    expect(
      categoryInputSchema.safeParse({ name: "عام", defaultBucket: "NOPE" }).success,
    ).toBe(false);
  });

  it("requires at least one field to update", () => {
    expect(categoryUpdateSchema.safeParse({}).success).toBe(false);
    expect(categoryUpdateSchema.safeParse({ name: "س" }).success).toBe(true);
    expect(categoryUpdateSchema.safeParse({ defaultBucket: "REWARDS" }).success).toBe(true);
  });
});
