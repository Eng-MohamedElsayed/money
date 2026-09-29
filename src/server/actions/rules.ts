"use server";

import { updateTag } from "next/cache";
import {
  assertValidRule,
  moneyRuleProfileUpdateSchema,
  ruleFromProfile,
  type MoneyRule,
} from "../../domain/rules";
import { getCurrentUser } from "../auth";
import { prisma } from "../db";
import { resolveRule } from "../queries/rule-profile";
import { allocatePeriod, assertAllocationBalanced } from "../../domain/budget";
import { makeMoney } from "../../domain/money";

/**
 * Re-split every period that already has income, so a rule change takes effect
 * on historical periods too. Periods are re-allocated from their own income
 * total, never from the previous allocation, so this is idempotent.
 */
async function realignPeriods(userId: string, rule: MoneyRule) {
  const periods = await prisma.budgetPeriod.findMany({
    where: { userId, incomes: { some: {} } },
    select: { id: true },
  });

  for (const period of periods) {
    const incomes = await prisma.income.findMany({
      where: { periodId: period.id },
      select: { amountMinor: true },
    });
    const allocation = allocatePeriod(
      incomes.map((i) => makeMoney(i.amountMinor)),
      rule,
    );
    assertAllocationBalanced(allocation);

    await prisma.budgetAllocation.upsert({
      where: { periodId: period.id },
      create: {
        periodId: period.id,
        growthMinor: allocation.growthMinor,
        stabilityMinor: allocation.stabilityMinor,
        essentialsMinor: allocation.essentialsMinor,
        rewardsMinor: allocation.rewardsMinor,
        totalMinor: allocation.totalMinor,
        currency: "EGP",
      },
      update: {
        growthMinor: allocation.growthMinor,
        stabilityMinor: allocation.stabilityMinor,
        essentialsMinor: allocation.essentialsMinor,
        rewardsMinor: allocation.rewardsMinor,
        totalMinor: allocation.totalMinor,
      },
    });
  }

  return periods.length;
}

export async function getRuleProfileAction() {
  const user = await getCurrentUser();
  const resolved = await resolveRule(user.id);
  return {
    qk: ["rule-profile", user.id] as const,
    profileId: resolved.profileId,
    profileName: resolved.profileName,
    isCustom: resolved.isCustom,
    currency: resolved.currency,
    rule: resolved.rule,
  };
}

export async function saveRuleProfileAction(input: unknown) {
  const data = moneyRuleProfileUpdateSchema.parse(input);
  const user = await getCurrentUser();

  const rule = ruleFromProfile({
    growthPercent: data.growthPercent,
    stabilityPercent: data.stabilityPercent,
    essentialsPercent: data.essentialsPercent,
    rewardsPercent: data.rewardsPercent,
  });
  assertValidRule(rule);

  const existing = await prisma.moneyRuleProfile.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  // Only one profile may be active, otherwise allocation would be ambiguous.
  await prisma.moneyRuleProfile.updateMany({
    where: { userId: user.id, isActive: true },
    data: { isActive: false },
  });

  const name = data.name?.trim() || "قاعدة مخصصة";
  const profileSelect = { id: true, name: true } as const;

  const profile = existing
    ? await prisma.moneyRuleProfile.update({
        where: { id: existing.id },
        data: {
          name,
          growthPercent: rule.growthPercent,
          stabilityPercent: rule.stabilityPercent,
          essentialsPercent: rule.essentialsPercent,
          rewardsPercent: rule.rewardsPercent,
          currency: data.currency,
          isActive: true,
        },
        select: profileSelect,
      })
    : await prisma.moneyRuleProfile.create({
        data: {
          userId: user.id,
          name,
          growthPercent: rule.growthPercent,
          stabilityPercent: rule.stabilityPercent,
          essentialsPercent: rule.essentialsPercent,
          rewardsPercent: rule.rewardsPercent,
          currency: data.currency ?? "EGP",
          isActive: true,
        },
        select: profileSelect,
      });

  const realigned = await realignPeriods(user.id, rule);

  updateTag("budget");
  return { ok: true as const, profile, realignedPeriods: realigned, rule };
}

export async function resetRuleProfileAction() {
  const user = await getCurrentUser();

  await prisma.moneyRuleProfile.updateMany({
    where: { userId: user.id, isActive: true },
    data: { isActive: false },
  });

  const resolved = await resolveRule(user.id);
  const realigned = await realignPeriods(user.id, resolved.rule);

  updateTag("budget");
  return { ok: true as const, realignedPeriods: realigned, rule: resolved.rule };
}
