"use server";

import { revalidateTag, updateTag } from "next/cache";
import { prisma } from "../db";
import { getCurrentUser } from "../auth";
import { getTransactions } from "../queries/transactions";
import { transactionInputSchema } from "../../lib/schemas/transactions";
import { deriveBucket, type ClassifiableBucket } from "../../domain/categories";

export async function createTransactionAction(input: unknown) {
  const data = transactionInputSchema.parse(input);
  const user = await getCurrentUser();

  // Ownership check: a category must belong to the caller before it can
  // classify this transaction.
  let categoryBucket: ClassifiableBucket | null = null;
  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, userId: user.id },
      select: { defaultBucket: true },
    });
    if (!category) throw new Error("التصنيف غير موجود");
    categoryBucket = category.defaultBucket;
  }

  const bucket = deriveBucket({
    explicit: data.bucket ?? null,
    categoryBucket,
  });

  const flow = data.type === "INCOME" ? "IN" : "OUT";
  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      accountId: data.accountId,
      type: data.type,
      flow,
      amountMinor: Math.round(data.amountMinor),
      date: data.date,
      categoryId: data.categoryId || null,
      transferAccountId: data.type === "TRANSFER" ? (data.transferAccountId || null) : null,
      bucket,
      description: data.description || null,
      merchant: data.merchant || null,
      note: data.note || null,
    },
  });

  revalidateTag("transactions", "default");
  updateTag("budget");
  return { ok: true as const, transaction };
}

export async function deleteTransactionAction(id: string) {
  const user = await getCurrentUser();
  await prisma.transaction.deleteMany({ where: { id, userId: user.id } });
  revalidateTag("transactions", "default");
  updateTag("budget");
  return { ok: true as const };
}

export async function getTransactionsAction(userId?: string) {
  const user = await getCurrentUser();
  const targetUserId = userId ?? user.id;
  if (targetUserId !== user.id) {
    throw new Error("Unauthorized");
  }
  return getTransactions();
}
