import "server-only";
import { prisma } from "../db";
import type { Prisma } from "../../generated/prisma/client";

export type AccountInput = Prisma.AccountUncheckedCreateInput;

export const accountsRepo = {
  list: (userId: string) =>
    prisma.account.findMany({
      where: { userId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  byId: (userId: string, id: string) =>
    prisma.account.findFirst({ where: { id, userId } }),
  create: (data: AccountInput) => prisma.account.create({ data }),
  update: (userId: string, id: string, data: Prisma.AccountUncheckedUpdateInput) =>
    prisma.account.updateMany({ where: { id, userId }, data }).then((r) => r.count),
  del: (userId: string, id: string) =>
    prisma.account.deleteMany({ where: { id, userId } }).then((r) => r.count),
};
