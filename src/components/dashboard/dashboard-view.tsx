"use client";

import { useState } from "react";
import { AccountsClient } from "@/components/accounts/accounts-client";
import { TransactionsClient } from "@/components/transactions/transactions-client";

export function DashboardView({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<"all" | "accounts" | "transactions">("all");

  return (
    <div className="space-y-8">
      {/* Navigation tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "all"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("accounts")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "accounts"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          Accounts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "transactions"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          Transactions
        </button>
      </div>

      {/* Content based on tab */}
      {(activeTab === "all" || activeTab === "accounts") && (
        <section className="space-y-4">
          {activeTab === "all" && (
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Accounts
            </h2>
          )}
          <AccountsClient userId={userId} />
        </section>
      )}

      {activeTab === "all" && (
        <hr className="border-zinc-200 dark:border-zinc-800 my-8" />
      )}

      {(activeTab === "all" || activeTab === "transactions") && (
        <section className="space-y-4">
          {activeTab === "all" && (
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Transactions
            </h2>
          )}
          <TransactionsClient userId={userId} />
        </section>
      )}
    </div>
  );
}
