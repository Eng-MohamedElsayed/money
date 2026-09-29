import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { qk } from "../query-keys";
import {
  createIncomeAction,
  deleteIncomeAction,
} from "../../server/actions/incomes";
import { getBudgetAction } from "../../server/actions/budget-actions";
import {
  incomeInputSchema,
  type IncomeInput,
} from "../schemas/incomes";

export { incomeInputSchema, type IncomeInput };

export interface BudgetBucketView {
  bucket: "GROWTH" | "STABILITY" | "ESSENTIALS" | "REWARDS";
  allocatedMinor: number;
  spentMinor: number;
  remainingMinor: number;
  percentUsed: number;
  isOverspent: boolean;
}

export interface BudgetView {
  periodId: string | null;
  month: number;
  year: number;
  currency: string;
  rule: {
    growthPercent: number;
    stabilityPercent: number;
    essentialsPercent: number;
    rewardsPercent: number;
  };
  incomes: {
    id: string;
    amountMinor: number;
    source: string;
    date: Date | string;
    note: string | null;
  }[];
  snapshot: {
    totalIncomeMinor: number;
    totalAllocatedMinor: number;
    totalSpentMinor: number;
    buckets: BudgetBucketView[];
  };
  hasAllocation: boolean;
  unclassifiedMinor?: number;
}

const BUCKETS = ["GROWTH", "STABILITY", "ESSENTIALS", "REWARDS"] as const;

export function transformBudget(raw: any): BudgetView {
  const snapshot = raw?.snapshot ?? {};
  const rawBuckets = Array.isArray(snapshot.buckets) ? snapshot.buckets : [];

  const buckets: BudgetBucketView[] = BUCKETS.map((bucket) => {
    const found = rawBuckets.find((b: any) => b?.bucket === bucket);
    return {
      bucket,
      allocatedMinor: Math.round(Number(found?.allocatedMinor ?? 0)),
      spentMinor: Math.round(Number(found?.spentMinor ?? 0)),
      remainingMinor: Math.round(Number(found?.remainingMinor ?? 0)),
      percentUsed: Number(found?.percentUsed ?? 0),
      isOverspent: Boolean(found?.isOverspent),
    };
  });

  return {
    periodId: raw?.periodId ?? null,
    month: Number(raw?.month ?? 0),
    year: Number(raw?.year ?? 0),
    currency: String(raw?.currency ?? "EGP"),
    rule: {
      growthPercent: Number(raw?.rule?.growthPercent ?? 25),
      stabilityPercent: Number(raw?.rule?.stabilityPercent ?? 15),
      essentialsPercent: Number(raw?.rule?.essentialsPercent ?? 50),
      rewardsPercent: Number(raw?.rule?.rewardsPercent ?? 10),
    },
    incomes: Array.isArray(raw?.incomes)
      ? raw.incomes.map((i: any) => ({
          id: String(i.id),
          amountMinor: Math.round(Number(i.amountMinor) || 0),
          source: String(i.source),
          date: i.date instanceof Date ? i.date : new Date(i.date),
          note: i.note ?? null,
        }))
      : [],
    snapshot: {
      totalIncomeMinor: Math.round(Number(snapshot.totalIncomeMinor ?? 0)),
      totalAllocatedMinor: Math.round(Number(snapshot.totalAllocatedMinor ?? 0)),
      totalSpentMinor: Math.round(Number(snapshot.totalSpentMinor ?? 0)),
      buckets,
    },
    hasAllocation: Boolean(raw?.hasAllocation),
    unclassifiedMinor: Math.round(Number(raw?.unclassifiedMinor ?? 0)),
  };
}

export function budgetQueryOptions(
  userId: string,
  month: number,
  year: number,
) {
  return queryOptions({
    queryKey: qk.budget(userId, month, year),
    queryFn: async () => transformBudget(await getBudgetAction(month, year)),
  });
}

export function useBudget(userId: string, month: number, year: number) {
  return useQuery(budgetQueryOptions(userId, month, year));
}

export function useCreateIncome(userId: string, month: number, year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IncomeInput) => createIncomeAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.budget(userId, month, year) });
    },
  });
}

export function useDeleteIncome(userId: string, month: number, year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIncomeAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.budget(userId, month, year) });
    },
  });
}
