import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { accountsQuery } from "@/lib/query/query";
import { AccountsClient } from "@/components/accounts/accounts-client";
import { getCurrentUser } from "@/server/auth";

export default async function Home() {
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
  }

  return (
    <div className="flex flex-col flex-1 p-8 max-w-4xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Manage your accounts and balances.
        </p>
      </header>
      <main className="flex-1">
        {userId ? (
          <HydrationBoundary state={dehydrate(queryClient)}>
            <AccountsClient userId={userId} />
          </HydrationBoundary>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            Please sign in to view and manage your accounts.
          </div>
        )}
      </main>
    </div>
  );
}
