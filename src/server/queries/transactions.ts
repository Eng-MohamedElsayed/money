import "server-only";
import { qk } from "../../lib/query-keys";
import { prisma } from "../db";
import { getCurrentUser } from "../auth";

export async function getTransactions() {
  const user = await getCurrentUser();
  const rows = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      account: {
        select: { id: true, name: true },
      },
      category: {
        select: { id: true, name: true },
      },
      transferAccount: {
        select: { id: true, name: true },
      },
    },
  });

  return {
    qk: qk.transactions(user.id),
    transactions: rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      accountId: row.accountId,
      accountName: row.account.name,
      account: row.account,
      type: row.type,
      flow: row.flow,
      amountMinor: Math.round(row.amountMinor),
      currency: row.currency,
      date: row.date,
      description: row.description,
      merchant: row.merchant,
      note: row.note,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      category: row.category,
      bucket: row.bucket,
      transferAccountId: row.transferAccountId,
      transferAccountName: row.transferAccount?.name ?? null,
      transferAccount: row.transferAccount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  };
}

export type GetTransactionsResult = Awaited<ReturnType<typeof getTransactions>>;
export type TransactionWithDetails = GetTransactionsResult["transactions"][number];
