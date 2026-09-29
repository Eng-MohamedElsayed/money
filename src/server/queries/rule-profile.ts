import "server-only";
import { resolveRuleFromProfile, type MoneyRule } from "../../domain/rules";
import { prisma } from "../db";

export interface ResolvedRule {
  rule: MoneyRule;
  profileId: string | null;
  profileName: string | null;
  isCustom: boolean;
  currency: string;
}

export async function resolveRule(userId: string): Promise<ResolvedRule> {
  const profile = await prisma.moneyRuleProfile.findFirst({
    where: { userId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  const resolution = resolveRuleFromProfile(profile);

  return {
    rule: resolution.rule,
    profileId: profile?.id ?? null,
    profileName: profile?.name ?? null,
    isCustom: resolution.isCustom,
    currency: resolution.currency,
  };
}
