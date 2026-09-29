"use client";

import { useState } from "react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { AccountsClient } from "@/components/accounts/accounts-client";
import { TransactionsClient } from "@/components/transactions/transactions-client";

export function DashboardView({ userId }: { userId: string }) {
  const [activeTab, setActiveTab] = useState<"all" | "accounts" | "transactions">("all");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end gap-3">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
            >
              تسجيل الدخول
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              type="button"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors dark:bg-zinc-100 dark:text-zinc-900"
            >
              إنشاء حساب
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
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
          الكل
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
          الحسابات
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
          المعاملات
        </button>
      </div>

      {/* Content based on tab */}
      {(activeTab === "all" || activeTab === "accounts") && (
        <section className="space-y-4">
          {activeTab === "all" && (
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              الحسابات
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
              المعاملات
            </h2>
          )}
          <TransactionsClient userId={userId} />
        </section>
      )}
    </div>
  );
}
