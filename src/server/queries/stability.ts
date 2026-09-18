import "server-only";
import { qk } from "../../lib/query-keys";
import { prisma } from "../db";
import { getCurrentUser } from "../auth";

export async function getStabilityFundSnapshot() {
  const user = await getCurrentUser();
  const fund = await prisma.stabilityFund.findUnique({ where: { userId: user.id } });
  if (!fund) return { qk: qk.stability(user.id), fund: null };
  return {
    qk: qk.stability(user.id),
    fund: {
      id: fund.id,
      accountId: fund.accountId,
      goalMultiple: fund.goalMultiple,
      baselineMinor: fund.baselineMinor,
      targetMinor: fund.targetMinor,
      note: fund.note,
    },
  };
}
