"use server";

import { updateTag } from "next/cache";
import type { Prisma } from "../../generated/prisma/client";
import { allocatePeriod, assertAllocationBalanced } from "../../domain/budget";
import { makeMoney } from "../../domain/money";
import type { MoneyRule } from "../../domain/rules";
import { incomeInputSchema } from "../../lib/schemas/incomes";
import { getCurrentUser } from "../auth";
import { prisma } from "../db";
import { resolveRule } from "../queries/rule-profile";

/**
 * Recording income re-splits the WHOLE period, because BudgetAllocation is 1:1
 * with BudgetPeriod. The period's total income is summed and allocated on every
 * write, so add/delete stay consistent without incremental bookkeeping.
 */
async function reallocatePeriod(
  tx: Prisma.TransactionClient,
  periodId: string,
  currency: string,
  rule: MoneyRule,
) {
  const incomes = await tx.income.findMany({
    where: { periodId },
    select: { amountMinor: true },
  });

  const allocation = allocatePeriod(
    incomes.map((i) => makeMoney(i.amountMinor)),
    rule,
  );
  assertAllocationBalanced(allocation);

  return tx.budgetAllocation.upsert({
    where: { periodId },
    create: {
      periodId,
      growthMinor: allocation.growthMinor,
      stabilityMinor: allocation.stabilityMinor,
      essentialsMinor: allocation.essentialsMinor,
      rewardsMinor: allocation.rewardsMinor,
      totalMinor: allocation.totalMinor,
      currency,
    },
    update: {
      growthMinor: allocation.growthMinor,
      stabilityMinor: allocation.stabilityMinor,
      essentialsMinor: allocation.essentialsMinor,
      rewardsMinor: allocation.rewardsMinor,
      totalMinor: allocation.totalMinor,
    },
    select: { id: true, totalMinor: true },
  });
}

export async function createIncomeAction(input: unknown) {
  const data = incomeInputSchema.parse(input);
  const user = await getCurrentUser();

  const month = data.date.getUTCMonth() + 1;
  const year = data.date.getUTCFullYear();

  const resolved = await resolveRule(user.id);

  const { income, allocation } = await prisma.$transaction(async (tx) => {
    const period = await tx.budgetPeriod.upsert({
      where: { userId_month_year: { userId: user.id, month, year } },
      create: { userId: user.id, month, year },
      update: {},
      select: { id: true },
    });

    const created = await tx.income.create({
      data: {
        userId: user.id,
        periodId: period.id,
        amountMinor: data.amountMinor,
        currency: data.currency,
        source: data.source,
        date: data.date,
        note: data.note || null,
      },
      select: { id: true, amountMinor: true, source: true, date: true },
    });

    const saved = await reallocatePeriod(tx, period.id, data.currency, resolved.rule);
    return { income: created, allocation: saved };
  });

  updateTag("budget");
  return { ok: true as const, income, allocation, month, year };
}

export async function deleteIncomeAction(id: string) {
  const user = await getCurrentUser();

  const existing = await prisma.income.findFirst({
    where: { id, userId: user.id },
    select: { id: true, periodId: true },
  });
  if (!existing) throw new Error("Income not found");

  await prisma.income.delete({ where: { id } });

  if (existing.periodId) {
    const remaining = await prisma.income.count({
      where: { periodId: existing.periodId },
    });
    if (remaining === 0) {
      await prisma.budgetAllocation.deleteMany({
        where: { periodId: existing.periodId },
      });
    } else {
      const resolved = await resolveRule(user.id);
      await prisma.$transaction((tx) =>
        reallocatePeriod(tx, existing.periodId!, "EGP", resolved.rule),
      );
    }
  }

  updateTag("budget");
  return { ok: true as const };
}
