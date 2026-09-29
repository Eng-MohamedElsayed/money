import "server-only";
import { SYSTEM_CATEGORIES } from "../../domain/categories";
import { qk } from "../../lib/query-keys";
import { prisma } from "../db";
import { getCurrentUser } from "../auth";

/**
 * Seed the built-in categories for a user. Idempotent: `@@unique([userId, name])`
 * makes a re-run a no-op via skipDuplicates, so this is safe to call on every
 * read and will never duplicate rows.
 */
export async function ensureSystemCategories(userId: string) {
  await prisma.category.createMany({
    data: SYSTEM_CATEGORIES.map((c) => ({
      userId,
      name: c.name,
      defaultBucket: c.defaultBucket,
      isSystem: true,
    })),
    skipDuplicates: true,
  });
}

export async function getCategories() {
  const user = await getCurrentUser();
  await ensureSystemCategories(user.id);

  const rows = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { transactions: true } },
    },
  });

  return {
    qk: qk.categories(user.id),
    categories: rows.map((row) => ({
      id: row.id,
      name: row.name,
      defaultBucket: row.defaultBucket,
      isSystem: row.isSystem,
      transactionCount: row._count.transactions,
      createdAt: row.createdAt,
    })),
  };
}

export type GetCategoriesResult = Awaited<ReturnType<typeof getCategories>>;
export type CategoryRow = GetCategoriesResult["categories"][number];
