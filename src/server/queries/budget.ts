import "server-only";
import { buildBudgetSnapshot, type BudgetSnapshot } from "../../domain/budget";
import { makeMoney, type Money } from "../../domain/money";
import {
  DEFAULT_RULE_PERCENTS,
  allocateIncome,
  type RuleBucket,
} from "../../domain/rules";
import { qk } from "../../lib/query-keys";
import { prisma } from "../db";
import { getCurrentUser } from "../auth";

const FUNDED: RuleBucket[] = ["GROWTH", "STABILITY", "ESSENTIALS", "REWARDS"];

export function monthBounds(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

export interface BudgetQueryResult {
  qk: ReturnType<typeof qk.budget>;
  periodId: string | null;
  month: number;
  year: number;
  currency: string;
  rule: typeof DEFAULT_RULE_PERCENTS;
  incomes: {
    id: string;
    amountMinor: number;
    source: string;
    date: Date;
    note: string | null;
  }[];
  snapshot: BudgetSnapshot;
  hasAllocation: boolean;
  unclassifiedMinor?: number;
}

export async function getBudget(month: number, year: number): Promise<BudgetQueryResult> {
  const user = await getCurrentUser();
  const { start, end } = monthBounds(month, year);

  const period = await prisma.budgetPeriod.findUnique({
    where: { userId_month_year: { userId: user.id, month, year } },
    select: { id: true },
  });

  const incomes = await prisma.income.findMany({
    where: {
      userId: user.id,
      OR: [
        { periodId: period?.id ?? "__none__" },
        { periodId: null, date: { gte: start, lt: end } },
      ],
    },
    orderBy: { date: "desc" },
    select: {
      id: true,
      amountMinor: true,
      source: true,
      date: true,
      note: true,
      currency: true,
    },
  });

  // Actuals: only OUT flows count as spending, so recording income here can
  // never double-count against the allocation.
  const spentRows = await prisma.transaction.groupBy({
    by: ["bucket"],
    where: {
      userId: user.id,
      flow: "OUT",
      date: { gte: start, lt: end },
      bucket: { in: [...FUNDED, "UNCLASSIFIED"] },
    },
    _sum: { amountMinor: true },
  });

  const spentByBucket: Partial<Record<RuleBucket, Money>> = {};
  let unclassifiedMinor = 0;
  for (const row of spentRows) {
    const amount = Math.round(row._sum.amountMinor ?? 0);
    if (row.bucket === "UNCLASSIFIED") {
      unclassifiedMinor += amount;
      continue;
    }
    spentByBucket[row.bucket as RuleBucket] = makeMoney(amount);
  }

  const totalIncomeMinor = incomes.reduce(
    (acc, i) => makeMoney(acc + Math.round(i.amountMinor)),
    makeMoney(0),
  );
  const allocation = allocateIncome(totalIncomeMinor, DEFAULT_RULE_PERCENTS);
  const snapshot = buildBudgetSnapshot(allocation, spentByBucket);

  return {
    qk: qk.budget(user.id, month, year),
    periodId: period?.id ?? null,
    month,
    year,
    currency: incomes[0]?.currency ?? "EGP",
    rule: DEFAULT_RULE_PERCENTS,
    incomes: incomes.map((i) => ({
      id: i.id,
      amountMinor: Math.round(i.amountMinor),
      source: i.source,
      date: i.date,
      note: i.note,
    })),
    snapshot,
    hasAllocation: period !== null,
    unclassifiedMinor,
  };
}

export type GetBudgetResult = Awaited<ReturnType<typeof getBudget>>;
