"use server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { prisma } from "../db";
import { getCurrentUser } from "../auth";

const stabilitySchema = z.object({
  goalMultiple: z.number().int().positive().default(5),
  baselineMinor: z.number().int().nonnegative().default(0),
  note: z.string().max(200).optional(),
});

export async function upsertStabilityFundAction(input: unknown) {
  const user = await getCurrentUser();
  const data = stabilitySchema.parse(input);
  const fund = await prisma.stabilityFund.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: { ...data },
  });
  revalidateTag("stability", "default");
  return { ok: true, fund };
}
