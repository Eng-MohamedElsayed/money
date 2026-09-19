import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { qk } from "../query-keys";
import {
  createTransactionAction,
  deleteTransactionAction,
  getTransactionsAction,
} from "../../server/actions/transactions";
import {
  transactionInputSchema,
  type TransactionInput,
} from "../schemas/transactions";

export { transactionInputSchema, type TransactionInput };

export interface TransactionRow {
  id: string;
  userId: string;
  accountId: string;
  accountName: string;
  account?: { id: string; name: string };
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  flow: "IN" | "OUT";
  amountMinor: number;
  currency: string;
  date: Date | string;
  description: string | null;
  merchant: string | null;
  note: string | null;
  categoryId: string | null;
  categoryName: string | null;
  category?: { id: string; name: string } | null;
  bucket: "GROWTH" | "STABILITY" | "ESSENTIALS" | "REWARDS" | "UNCLASSIFIED";
  transferAccountId: string | null;
  transferAccountName: string | null;
  transferAccount?: { id: string; name: string } | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export function transformTransactionRow(row: any): TransactionRow {
  const amountMinor = Math.round(Number(row.amountMinor) || 0);
  if (!Number.isInteger(amountMinor)) {
    throw new Error(`Amount must be an integer (minor units), got ${row.amountMinor}`);
  }

  return {
    id: String(row.id),
    userId: String(row.userId),
    accountId: String(row.accountId),
    accountName: row.accountName ?? row.account?.name ?? "Unknown Account",
    account: row.account ? { id: row.account.id, name: row.account.name } : undefined,
    type: row.type as "INCOME" | "EXPENSE" | "TRANSFER",
    flow: row.flow as "IN" | "OUT",
    amountMinor,
    currency: String(row.currency ?? "EGP"),
    date: row.date instanceof Date ? row.date : new Date(row.date),
    description: row.description ?? null,
    merchant: row.merchant ?? null,
    note: row.note ?? null,
    categoryId: row.categoryId ?? null,
    categoryName: row.categoryName ?? row.category?.name ?? null,
    category: row.category ? { id: row.category.id, name: row.category.name } : null,
    bucket: (row.bucket ?? "UNCLASSIFIED") as
      | "GROWTH"
      | "STABILITY"
      | "ESSENTIALS"
      | "REWARDS"
      | "UNCLASSIFIED",
    transferAccountId: row.transferAccountId ?? null,
    transferAccountName: row.transferAccountName ?? row.transferAccount?.name ?? null,
    transferAccount: row.transferAccount
      ? { id: row.transferAccount.id, name: row.transferAccount.name }
      : null,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
  };
}

export function transformTransactionRows(rows: unknown): TransactionRow[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.map(transformTransactionRow);
}

export function transactionsQueryOptions(userId: string) {
  return queryOptions({
    queryKey: qk.transactions(userId),
    queryFn: async () => {
      const res = await getTransactionsAction(userId);
      const rows = res && "transactions" in res ? res.transactions : res;
      return transformTransactionRows(rows);
    },
  });
}

export const transactionsQuery = transactionsQueryOptions;

export function useTransactions(userId: string) {
  return useQuery(transactionsQueryOptions(userId));
}

export function useCreateTransaction(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransactionAction,
    onMutate: async (newTxInput) => {
      await queryClient.cancelQueries({ queryKey: qk.transactions(userId) });

      const previousTransactions =
        queryClient.getQueryData<TransactionRow[]>(qk.transactions(userId));

      const input = transactionInputSchema.parse(newTxInput);
      const optimisticTx: TransactionRow = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        accountId: input.accountId,
        accountName: "Account",
        type: input.type,
        flow: input.type === "INCOME" ? "IN" : "OUT",
        amountMinor: Math.round(input.amountMinor),
        currency: "EGP",
        date: input.date instanceof Date ? input.date : new Date(input.date),
        description: input.description ?? null,
        merchant: input.merchant ?? null,
        note: input.note ?? null,
        categoryId: input.categoryId ?? null,
        categoryName: null,
        bucket: input.bucket ?? "UNCLASSIFIED",
        transferAccountId: input.transferAccountId ?? null,
        transferAccountName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      queryClient.setQueryData<TransactionRow[]>(qk.transactions(userId), (old) => {
        return [optimisticTx, ...(old ?? [])];
      });

      return { previousTransactions };
    },
    onError: (_err, _newTx, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(qk.transactions(userId), context.previousTransactions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.transactions(userId) });
    },
  });
}

export function useDeleteTransaction(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTransactionAction,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: qk.transactions(userId) });

      const previousTransactions =
        queryClient.getQueryData<TransactionRow[]>(qk.transactions(userId));

      queryClient.setQueryData<TransactionRow[]>(qk.transactions(userId), (old) => {
        return (old ?? []).filter((tx) => tx.id !== id);
      });

      return { previousTransactions };
    },
    onError: (_err, _id, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(qk.transactions(userId), context.previousTransactions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.transactions(userId) });
    },
  });
}
