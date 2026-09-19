"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { accountsQuery } from "@/lib/query/query";
import {
  useTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  type TransactionRow,
} from "@/lib/hooks/use-transactions";
import { Button } from "@/components/ui/button";

const TRANSACTION_TYPES = ["EXPENSE", "INCOME", "TRANSFER"] as const;
type TransactionType = (typeof TRANSACTION_TYPES)[number];

const BUCKETS = [
  "UNCLASSIFIED",
  "ESSENTIALS",
  "GROWTH",
  "STABILITY",
  "REWARDS",
] as const;
type BucketType = (typeof BUCKETS)[number];

export function TransactionsClient({ userId }: { userId: string }) {
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amountMajor, setAmountMajor] = useState("");
  const [accountId, setAccountId] = useState("");
  const [transferAccountId, setTransferAccountId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [bucket, setBucket] = useState<BucketType>("UNCLASSIFIED");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Fetch accounts for dropdowns
  const { data: accounts } = useQuery(accountsQuery(userId));

  // Fetch transactions using our TanStack hook
  const {
    data: transactions,
    isLoading,
    isError,
    error,
  } = useTransactions(userId);

  // Optimistic mutations
  const createMutation = useCreateTransaction(userId);
  const deleteMutation = useDeleteTransaction(userId);

  // Auto-select first account if available and not yet selected
  const activeAccountId =
    accountId || (accounts && accounts.length > 0 ? accounts[0].id : "");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsedAmount = Number(amountMajor);
    if (!parsedAmount || parsedAmount <= 0) return;
    if (!activeAccountId) return;
    if (type === "TRANSFER" && !transferAccountId) return;

    // Convert decimal input to integer minor units (NO floats in data path)
    const amountMinor = Math.round(parsedAmount * 100);

    createMutation.mutate(
      {
        type,
        amountMinor,
        accountId: activeAccountId,
        transferAccountId: type === "TRANSFER" ? transferAccountId : undefined,
        categoryId: undefined,
        bucket,
        description: description.trim() || undefined,
        date: new Date(date),
      },
      {
        onSuccess: () => {
          setAmountMajor("");
          setDescription("");
          setCategoryName("");
          if (type === "TRANSFER") {
            setTransferAccountId("");
          }
        },
      }
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold mb-4">Add Transaction</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
              Transaction Type
            </label>
            <div className="inline-flex rounded-lg border border-zinc-200 p-1 dark:border-zinc-800 dark:bg-zinc-900">
              {TRANSACTION_TYPES.map((t) => {
                const isActive = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      isActive
                        ? t === "EXPENSE"
                          ? "bg-red-500 text-white shadow-xs"
                          : t === "INCOME"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-blue-600 text-white shadow-xs"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Amount */}
            <div>
              <label
                htmlFor="tx-amount"
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
              >
                Amount (EGP)
              </label>
              <input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amountMajor}
                onChange={(e) => setAmountMajor(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-200"
              />
              {amountMajor && Number(amountMajor) > 0 && (
                <p className="mt-1 text-[11px] text-zinc-500">
                  {Math.round(Number(amountMajor) * 100).toLocaleString()} minor units
                </p>
              )}
            </div>

            {/* Account select */}
            <div>
              <label
                htmlFor="tx-account"
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
              >
                {type === "TRANSFER" ? "From Account" : "Account"}
              </label>
              <select
                id="tx-account"
                required
                value={activeAccountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-200"
              >
                {accounts && accounts.length > 0 ? (
                  accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency} {acc.balanceMinor})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No accounts available
                  </option>
                )}
              </select>
            </div>

            {/* Transfer Destination Account (only when TRANSFER) */}
            {type === "TRANSFER" && (
              <div>
                <label
                  htmlFor="tx-transfer-account"
                  className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
                >
                  To Account
                </label>
                <select
                  id="tx-transfer-account"
                  required
                  value={transferAccountId}
                  onChange={(e) => setTransferAccountId(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-200"
                >
                  <option value="">Select destination account...</option>
                  {accounts
                    ?.filter((acc) => acc.id !== activeAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency} {acc.balanceMinor})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Date */}
            <div>
              <label
                htmlFor="tx-date"
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
              >
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-200"
              />
            </div>

            {/* Bucket */}
            <div>
              <label
                htmlFor="tx-bucket"
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
              >
                Bucket
              </label>
              <select
                id="tx-bucket"
                value={bucket}
                onChange={(e) => setBucket(e.target.value as BucketType)}
                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-200"
              >
                {BUCKETS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description / Note */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label
                htmlFor="tx-description"
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
              >
                Description / Note (Optional)
              </label>
              <input
                id="tx-description"
                type="text"
                placeholder="e.g. Grocery shopping, Salary deposit"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-200"
              />
            </div>

            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                !amountMajor ||
                !activeAccountId ||
                (type === "TRANSFER" && !transferAccountId)
              }
            >
              {createMutation.isPending ? "Adding..." : "Add Transaction"}
            </Button>
          </div>
        </form>

        {createMutation.isError && (
          <p className="mt-3 text-sm text-red-600">
            Failed to add transaction: {createMutation.error.message}
          </p>
        )}
      </section>

      {/* Transactions List */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Transactions History</h2>

        {isLoading && (
          <div
            data-testid="loading-state"
            className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
          >
            Loading transactions...
          </div>
        )}

        {isError && (
          <div
            data-testid="error-state"
            className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
          >
            Failed to load transactions: {error.message}
          </div>
        )}

        {!isLoading && !isError && (!transactions || transactions.length === 0) && (
          <div
            data-testid="empty-state"
            className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
          >
            No transactions found. Add your first transaction above to get started.
          </div>
        )}

        {!isLoading && !isError && transactions && transactions.length > 0 && (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            {transactions.map((tx: TransactionRow) => {
              const formattedDate = new Date(tx.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              const isIncome = tx.type === "INCOME";
              const isTransfer = tx.type === "TRANSFER";
              const isTemp = tx.id.startsWith("temp-");

              return (
                <li
                  key={tx.id}
                  className={`flex items-center justify-between p-4 transition-opacity ${
                    isTemp ? "opacity-60" : "opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                        isIncome
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : isTransfer
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {tx.type}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                          {tx.description || tx.type}
                        </span>
                        {tx.bucket && tx.bucket !== "UNCLASSIFIED" && (
                          <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                            • {tx.bucket}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {formattedDate} • {tx.accountName}
                        {isTransfer && tx.transferAccountName && (
                          <span> → {tx.transferAccountName}</span>
                        )}
                        {tx.categoryName && <span> • {tx.categoryName}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span
                        className={`text-sm font-semibold ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isTransfer
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {isIncome ? "+" : isTransfer ? "⇄ " : "-"}
                        {(tx.amountMinor / 100).toFixed(2)} {tx.currency}
                      </span>
                      <p className="text-[10px] text-zinc-400">
                        {tx.amountMinor.toLocaleString()} minor units
                      </p>
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={
                        isTemp ||
                        (deleteMutation.isPending &&
                          deleteMutation.variables === tx.id)
                      }
                      onClick={() => deleteMutation.mutate(tx.id)}
                    >
                      {deleteMutation.isPending &&
                      deleteMutation.variables === tx.id
                        ? "Deleting..."
                        : "Delete"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {deleteMutation.isError && (
          <p className="text-sm text-red-600">
            Failed to delete transaction: {deleteMutation.error.message}
          </p>
        )}
      </section>
    </div>
  );
}
