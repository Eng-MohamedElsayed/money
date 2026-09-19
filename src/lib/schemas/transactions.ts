import { z } from "zod";

export const transactionInputSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  amountMinor: z.number().int().nonnegative(),
  date: z.coerce.date(),
  accountId: z.string().min(1, "Account is required"),
  categoryId: z.string().optional().nullable(),
  transferAccountId: z.string().optional().nullable(),
  bucket: z
    .enum(["GROWTH", "STABILITY", "ESSENTIALS", "REWARDS", "UNCLASSIFIED"])
    .optional(),
  description: z.string().optional().nullable(),
  merchant: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;
