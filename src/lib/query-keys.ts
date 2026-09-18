export const qk = {
  dashboard: (userId: string) => ["dashboard", userId] as const,
  accounts: (userId: string) => ["accounts", userId] as const,
  account: (id: string) => ["accounts", id] as const,
  accountsByType: (userId: string, type: string) => ["accounts", userId, type] as const,
  transactions: (userId: string, filter?: Record<string, unknown>) =>
    ["transactions", userId, filter ?? null] as const,
  transaction: (id: string) => ["transactions", id] as const,
  categories: (userId: string) => ["categories", userId] as const,
  buckets: (userId: string) => ["buckets", userId] as const,
  profile: (userId: string) => ["rule-profile", userId] as const,
  stability: (userId: string) => ["stability-fund", userId] as const,
  periods: (userId: string, year?: number) => ["budget-periods", userId, year ?? null] as const,
  period: (userId: string, id: string) => ["budget-periods", userId, id] as const,
};
