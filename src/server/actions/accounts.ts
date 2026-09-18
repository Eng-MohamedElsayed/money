"use server";

import { z } from "zod";
import { revalidateTag } from "next/cache";
import { prisma } from "../db";
import { getCurrentUser } from "../auth";

const accountSchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(["CASH", "BANK", "SAVINGS", "EMERGENCY", "INVESTMENT", "WALLET", "OTHER"]).default("BANK"),
  currency: z.string().default("EGP"),
  balanceMinor: z.number().int().default(0),
});

export async function createAccountAction(input: unknown) {
  const user = await getCurrentUser();
  const data = accountSchema.parse(input);
  const account = await prisma.account.create({
    data: { ...data, userId: user.id, balanceMinor: Math.round(data.balanceMinor) },
  });
  revalidateTag("accounts");
  return { ok: true as const, account };
}

export async function deleteAccountAction(id: string) {
  const user = await getCurrentUser();
  await prisma.account.deleteMany({ where: { id, userId: user.id } });
  revalidateTag("accounts");
  return { ok: true as const };
}
