import { z } from "zod";

export const incomeInputSchema = z.object({
  amountMinor: z
    .number()
    .int("المبلغ يجب أن يكون رقمًا صحيحًا بالقروش")
    .positive("المبلغ يجب أن يكون أكبر من صفر"),
  source: z
    .string()
    .min(1, "مصدر الدخل مطلوب")
    .max(120, "مصدر الدخل طويل جدًا"),
  date: z.coerce.date(),
  currency: z.string().min(1).max(8).default("EGP"),
  note: z.string().max(500).optional().nullable(),
});

export type IncomeInput = z.infer<typeof incomeInputSchema>;
