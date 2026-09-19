"use server";

import { revalidateTag } from "next/cache";
import { prisma } from "../db";
import { getCurrentUser } from "../auth";
import { getTransactions } from "../queries/transactions";
import { transactionInputSchema } from "../../lib/schemas/transactions";

export async function createTransactionAction(input: unknown) {
  const data = transactionInputSchema.parse(input);
  const user = await getCurrentUser();

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
      bucket: data.bucket ?? "UNCLASSIFIED",
      description: data.description || null,
      merchant: data.merchant || null,
      note: data.note || null,
    },
  });

  revalidateTag("transactions", "default");
  return { ok: true as const, transaction };
}

export async function deleteTransactionAction(id: string) {
  const user = await getCurrentUser();
  await prisma.transaction.deleteMany({ where: { id, userId: user.id } });
  revalidateTag("transactions", "default");
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
