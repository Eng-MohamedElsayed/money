"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { accountsQuery } from "@/lib/query/query";
import { createAccountAction, deleteAccountAction } from "@/server/actions/accounts";
import { Button } from "@/components/ui/button";

const ACCOUNT_TYPES = [
  "BANK",
  "CASH",
  "SAVINGS",
  "EMERGENCY",
  "INVESTMENT",
  "WALLET",
  "OTHER",
] as const;

type AccountType = (typeof ACCOUNT_TYPES)[number];

export function AccountsClient({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("BANK");
  const [balanceMinor, setBalanceMinor] = useState(0);

  const {
    data: accounts,
    isLoading,
    isError,
    error,
  } = useQuery(accountsQuery(userId));

  const createMutation = useMutation({
    mutationFn: createAccountAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.accounts(userId) });
      setName("");
      setBalanceMinor(0);
      setType("BANK");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccountAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.accounts(userId) });
    },
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate({
      name: name.trim(),
      type,
      currency: "EGP",
      balanceMinor: Math.trunc(balanceMinor),
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold mb-4">Add Account</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="account-name" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Account Name
            </label>
            <input
              id="account-name"
              type="text"
              required
              maxLength={60}
              placeholder="e.g. Main Checking"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-200"
            />
          </div>

          <div className="w-[160px]">
            <label htmlFor="account-type" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Type
            </label>
            <select
              id="account-type"
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-200"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="w-[160px]">
            <label htmlFor="account-balance" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Initial Balance (Minor)
            </label>
            <input
              id="account-balance"
              type="number"
              step="1"
              value={balanceMinor}
              onChange={(e) => setBalanceMinor(Math.trunc(Number(e.target.value)) || 0)}
              className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-200"
            />
          </div>

          <Button
            type="submit"
            disabled={createMutation.isPending || !name.trim()}
          >
            {createMutation.isPending ? "Adding..." : "Add Account"}
          </Button>
        </form>

        {createMutation.isError && (
          <p className="mt-3 text-sm text-red-600">
            Failed to add account: {createMutation.error.message}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your Accounts</h2>

        {isLoading && (
          <div data-testid="loading-state" className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            Loading accounts...
          </div>
        )}

        {isError && (
          <div data-testid="error-state" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            Failed to load accounts: {error.message}
          </div>
        )}

        {!isLoading && !isError && (!accounts || accounts.length === 0) && (
          <div data-testid="empty-state" className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            No accounts found. Add your first account above to get started.
          </div>
        )}

        {!isLoading && !isError && accounts && accounts.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                    {account.name}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {account.type} • {account.currency} {account.balanceMinor}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteMutation.isPending && deleteMutation.variables === account.id}
                  onClick={() => deleteMutation.mutate(account.id)}
                >
                  {deleteMutation.isPending && deleteMutation.variables === account.id
                    ? "Deleting..."
                    : "Delete"}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {deleteMutation.isError && (
          <p className="text-sm text-red-600">
            Failed to delete account: {deleteMutation.error.message}
          </p>
        )}
      </section>
    </div>
  );
}
