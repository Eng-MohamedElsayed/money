import { z } from "zod";
import { CATEGORY_BUCKETS } from "../../domain/categories";

export const categoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "اسم التصنيف مطلوب")
    .max(60, "اسم التصنيف طويل جدًا"),
  defaultBucket: z.enum(CATEGORY_BUCKETS).default("UNCLASSIFIED"),
});

export const categoryUpdateSchema = z
  .object({
    // Rebuilt rather than `categoryInputSchema.partial()`: partial() would keep
    // defaultBucket's `.default()`, so an empty patch would silently reset the
    // bucket to UNCLASSIFIED instead of being rejected.
    name: categoryInputSchema.shape.name.optional(),
    defaultBucket: z.enum(CATEGORY_BUCKETS).optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.defaultBucket !== undefined,
    { message: "لا يوجد ما يتم تحديثه" },
  );

export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
