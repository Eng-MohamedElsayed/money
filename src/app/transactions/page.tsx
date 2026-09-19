import Link from "next/link";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { accountsQuery } from "@/lib/query/query";
import { transactionsQueryOptions } from "@/lib/hooks/use-transactions";
import { TransactionsClient } from "@/components/transactions/transactions-client";
import { getCurrentUser } from "@/server/auth";

export default async function TransactionsPage() {
  let userId: string | null = null;
  try {
    const user = await getCurrentUser();
    userId = user.id;
  } catch {
    userId = process.env.DEV_USER_ID ?? null;
  }

  const queryClient = new QueryClient();

  if (userId) {
    await queryClient.prefetchQuery(accountsQuery(userId));
    await queryClient.prefetchQuery(transactionsQueryOptions(userId));
  }

  return (
    <div className="flex flex-col flex-1 p-8 max-w-4xl mx-auto w-full">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Record and review your income, expenses, and transfers.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 underline underline-offset-4"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>
      <main className="flex-1">
        {userId ? (
          <HydrationBoundary state={dehydrate(queryClient)}>
            <TransactionsClient userId={userId} />
          </HydrationBoundary>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            Please sign in to view and manage your transactions.
          </div>
        )}
      </main>
    </div>
  );
}
